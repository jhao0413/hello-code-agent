#!/usr/bin/env bun

interface ParsedArgs {
  help: boolean;
  dryRun: boolean;
  bump: 'patch' | 'minor' | 'major' | 'custom' | false;
  tag: string;
  skipBuild: boolean;
  skipGitCheck: boolean;
  skipGithubRelease: boolean;
}

function parseArgs(): ParsedArgs {
  const args = Bun.argv.slice(2);
  return {
    help: args.includes('-h') || args.includes('--help'),
    dryRun: args.includes('--dry-run'),
    bump: args.includes('--no-bump')
      ? false
      : args.includes('--major')
        ? 'major'
        : args.includes('--minor')
          ? 'minor'
          : args.includes('--custom')
            ? 'custom'
            : 'patch',
    tag: args.find((a) => a.startsWith('--tag='))?.split('=')[1] || '',
    skipBuild: args.includes('--skip-build'),
    skipGitCheck: args.includes('--skip-git-check'),
    skipGithubRelease: args.includes('--skip-github-release'),
  };
}

function showHelp(): void {
  console.log(`
Usage: bun scripts/release.ts [options]

Release automation script for npm packages.

Options:
  -h, --help              Show this help message
  --dry-run               Preview actions without executing
  --patch                 Bump patch version (default)
  --minor                 Bump minor version
  --major                 Bump major version
  --custom                Prompt for custom version
  --no-bump               Skip version bump
  --tag=<tag>             NPM publish tag (auto-detected if not set)
  --skip-build            Skip build step
  --skip-git-check        Skip git status check
  --skip-github-release   Skip GitHub release creation

Examples:
  bun scripts/release.ts                    # Patch release
  bun scripts/release.ts --minor            # Minor release
  bun scripts/release.ts --dry-run          # Preview release
  bun scripts/release.ts --tag=next         # Publish with 'next' tag
`);
}

async function exec(
  cmd: string[],
  opts?: { cwd?: string; interactive?: boolean },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(cmd, {
    cwd: opts?.cwd || process.cwd(),
    stdin: opts?.interactive ? 'inherit' : 'pipe',
    stdout: opts?.interactive ? 'inherit' : 'pipe',
    stderr: opts?.interactive ? 'inherit' : 'pipe',
  });
  if (opts?.interactive) {
    const exitCode = await proc.exited;
    return { stdout: '', stderr: '', exitCode };
  }
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

async function execOrFail(
  cmd: string[],
  opts?: { cwd?: string },
): Promise<string> {
  const result = await exec(cmd, opts);
  if (result.exitCode !== 0) {
    throw new Error(`Command failed: ${cmd.join(' ')}\n${result.stderr}`);
  }
  return result.stdout;
}

function log(msg: string) {
  console.log(`→ ${msg}`);
}

function success(msg: string) {
  console.log(`✓ ${msg}`);
}

function info(msg: string) {
  console.log(`  ${msg}`);
}

async function prompt(message: string): Promise<string> {
  process.stdout.write(message);
  for await (const line of console) {
    return line;
  }
  return '';
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const cwd = process.cwd();
  const pkgPath = `${cwd}/package.json`;
  const pkg = await Bun.file(pkgPath).json();

  if (!pkg.name) {
    throw new Error('package.json must have a name');
  }

  console.log('\n📦 Release\n');

  const branch = await execOrFail(['git', 'rev-parse', '--abbrev-ref', 'HEAD']);
  let latestTag: string;
  try {
    latestTag = await execOrFail(['git', 'describe', '--tags', '--abbrev=0']);
  } catch {
    latestTag = (
      await execOrFail(['git', 'rev-list', '--max-parents=0', 'HEAD'])
    ).slice(0, 7);
  }

  const remoteUrl = await execOrFail([
    'git',
    'config',
    '--get',
    'remote.origin.url',
  ]);
  const repo = remoteUrl.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];

  info(`Package: ${pkg.name}`);
  info(`Branch: ${branch}`);
  info(`Latest tag: ${latestTag}`);
  info(`Repo: ${repo}`);
  console.log('');

  log('Checking npm login...');
  const whoami = await exec(['npm', 'whoami']);
  if (whoami.exitCode !== 0) {
    info('Not logged in, running npm login...');
    const loginResult = await exec(['npm', 'login'], { interactive: true });
    if (loginResult.exitCode !== 0) {
      throw new Error('npm login failed');
    }
    success('Logged in to npm');
  } else {
    success(`Logged in as ${whoami.stdout}`);
  }

  if (!args.skipGitCheck) {
    log('Checking git status...');
    const status = await execOrFail(['git', 'status', '--porcelain']);
    if (status.length > 0) {
      throw new Error('Git working directory is not clean');
    }
    success('Git status is clean');
  }

  if (!args.skipBuild && pkg.scripts?.build) {
    log('Building...');
    if (!args.dryRun) {
      await execOrFail(['npm', 'run', 'build'], { cwd });
    }
    success('Build complete');
  }

  if (args.bump !== false) {
    log(`Bumping version (${args.bump})...`);
    if (args.bump === 'custom') {
      const newVersion = await prompt('Enter new version: ');
      if (!newVersion) throw new Error('Version is required');
      pkg.version = newVersion;
      if (!args.dryRun) {
        await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      }
    } else {
      if (!args.dryRun) {
        await execOrFail(
          [
            'npm',
            'version',
            args.bump,
            '--no-commit-hooks',
            '--no-git-tag-version',
          ],
          { cwd },
        );
      }
    }
    const updatedPkg = await Bun.file(pkgPath).json();
    pkg.version = updatedPkg.version;
    success(`Version: ${pkg.version}`);
  }

  const publishTag =
    args.tag ||
    (() => {
      const v = pkg.version;
      if (v.includes('-alpha.') || v.includes('-beta.') || v.includes('-rc.'))
        return 'next';
      if (v.includes('-canary')) return 'canary';
      return 'latest';
    })();

  log(`Publishing to npm (tag: ${publishTag})...`);
  if (!args.dryRun) {
    const publishResult = await exec(['npm', 'publish', '--tag', publishTag], {
      cwd,
      interactive: true,
    });
    if (publishResult.exitCode !== 0) {
      throw new Error('npm publish failed');
    }
  }
  success(`Published ${pkg.name}@${pkg.version}`);

  log('Committing and pushing...');
  if (!args.dryRun) {
    await exec(['git', 'add', './']);
    await exec(['git', 'commit', '-m', `release: ${pkg.version}`, '-n']);
  }

  const gitTag = pkg.version;
  if (publishTag === 'latest') {
    log(`Creating git tag ${gitTag}...`);
    if (!args.dryRun) {
      await execOrFail(['git', 'tag', gitTag]);
    }
    success(`Tagged ${gitTag}`);
  }

  if (!args.dryRun) {
    await execOrFail(['git', 'push', 'origin', branch, '--tags']);
  }
  success('Pushed to remote');

  if (!args.skipGithubRelease && publishTag === 'latest' && repo) {
    log(`Creating GitHub release ${gitTag}...`);
    const ghCheck = await exec(['gh', '--version']);
    if (ghCheck.exitCode !== 0) {
      info('Skipping: gh CLI not installed');
    } else if (!args.dryRun) {
      const notes = `**Full Changelog**: https://github.com/${repo}/compare/${latestTag}...${gitTag}`;
      await execOrFail([
        'gh',
        'release',
        'create',
        gitTag,
        '--title',
        gitTag,
        '--notes',
        notes,
      ]);
      success(`Created GitHub release ${gitTag}`);
    }
  }

  console.log(`\n✅ Released ${pkg.name}@${pkg.version}\n`);
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
