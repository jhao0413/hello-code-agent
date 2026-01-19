import { Box, render, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import path from 'pathe';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { Context } from '../context';
import { Paths } from '../paths';
import {
  type AddSkillResult,
  type PreviewSkillsResult,
  SkillManager,
  type SkillMetadata,
  type SkillPreview,
  SkillSource,
} from '../skill';

type AddState =
  | { phase: 'cloning' }
  | { phase: 'done'; result: AddSkillResult }
  | { phase: 'error'; error: string };

type InteractiveAddState =
  | { phase: 'cloning' }
  | { phase: 'selecting'; preview: PreviewSkillsResult }
  | { phase: 'installing' }
  | { phase: 'done'; result: AddSkillResult }
  | { phase: 'cancelled' }
  | { phase: 'error'; error: string };

type ListState =
  | { phase: 'loading' }
  | { phase: 'done'; skills: SkillMetadata[] }
  | { phase: 'error'; error: string };

type RemoveState =
  | { phase: 'removing' }
  | { phase: 'done' }
  | { phase: 'error'; error: string };

interface AddSkillUIProps {
  source: string;
  skillManager: SkillManager;
  options: {
    global?: boolean;
    claude?: boolean;
    overwrite?: boolean;
    name?: string;
    target?: string;
  };
}

const AddSkillUI: React.FC<AddSkillUIProps> = ({
  source,
  skillManager,
  options,
}) => {
  const [state, setState] = useState<AddState>({ phase: 'cloning' });

  useEffect(() => {
    const run = async () => {
      try {
        const result = await skillManager.addSkill(source, {
          global: options.global,
          claude: options.claude,
          overwrite: options.overwrite,
          name: options.name,
          targetDir: options.target,
        });
        setState({ phase: 'done', result });
        setTimeout(() => process.exit(0), 1500);
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
        setTimeout(() => process.exit(1), 2000);
      }
    };
    run();
  }, [source, skillManager, options]);

  if (state.phase === 'cloning') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Cloning skill from {source}...</Text>
      </Box>
    );
  }

  if (state.phase === 'error') {
    return <Text color="red">✗ Error: {state.error}</Text>;
  }

  const { result } = state;
  const installDir =
    result.installed.length > 0
      ? path.dirname(path.dirname(result.installed[0].path))
      : null;
  return (
    <Box flexDirection="column">
      {result.installed.length > 0 && (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✓ Installed {result.installed.length} skill(s) to {installDir}:
          </Text>
          {result.installed.map((skill) => (
            <Box key={skill.name} marginLeft={2}>
              <Text color="green">• {skill.name}</Text>
            </Box>
          ))}
        </Box>
      )}
      {result.skipped.length > 0 && (
        <Box
          flexDirection="column"
          marginTop={result.installed.length > 0 ? 1 : 0}
        >
          <Text color="yellow" bold>
            ⚠ Skipped {result.skipped.length} skill(s):
          </Text>
          {result.skipped.map((item) => (
            <Box key={item.name} marginLeft={2}>
              <Text color="yellow">• {item.name}</Text>
              <Text dimColor> - {item.reason}</Text>
            </Box>
          ))}
          <Box marginLeft={2} marginTop={1}>
            <Text dimColor>Use --overwrite to replace existing skills</Text>
          </Box>
        </Box>
      )}
      {result.errors.length > 0 && (
        <Box
          flexDirection="column"
          marginTop={
            result.installed.length > 0 || result.skipped.length > 0 ? 1 : 0
          }
        >
          <Text color="red" bold>
            ✗ Errors:
          </Text>
          {result.errors.map((error, i) => (
            <Box key={i} marginLeft={2}>
              <Text color="red">
                • {error.path}: {error.message}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

interface SkillListUIProps {
  skillManager: SkillManager;
}

const sourceLabels: Record<SkillSource, string> = {
  [SkillSource.GlobalClaude]: 'global-claude',
  [SkillSource.Global]: 'global',
  [SkillSource.ProjectClaude]: 'project-claude',
  [SkillSource.Project]: 'project',
  [SkillSource.Plugin]: 'plugin',
  [SkillSource.Config]: 'config',
};

const sourceColors: Record<SkillSource, string> = {
  [SkillSource.GlobalClaude]: 'blue',
  [SkillSource.Global]: 'cyan',
  [SkillSource.ProjectClaude]: 'magenta',
  [SkillSource.Project]: 'green',
  [SkillSource.Plugin]: 'blueBright',
  [SkillSource.Config]: 'yellow',
};

const SkillListUI: React.FC<SkillListUIProps> = ({ skillManager }) => {
  const [state, setState] = useState<ListState>({ phase: 'loading' });

  useEffect(() => {
    if (state.phase === 'done' || state.phase === 'error') {
      process.exit(state.phase === 'error' ? 1 : 0);
    }
  }, [state.phase]);

  useEffect(() => {
    const run = async () => {
      try {
        await skillManager.loadSkills();
        const skills = skillManager.getSkills();
        setState({ phase: 'done', skills });
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
      }
    };
    run();
  }, [skillManager]);

  if (state.phase === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Loading skills...</Text>
      </Box>
    );
  }

  if (state.phase === 'error') {
    return <Text color="red">✗ Error: {state.error}</Text>;
  }

  const { skills } = state;
  if (skills.length === 0) {
    return <Text dimColor>No skills installed.</Text>;
  }

  const maxNameLen = Math.max(...skills.map((s) => s.name.length), 4);
  const maxSourceLen = Math.max(
    ...skills.map((s) => sourceLabels[s.source].length),
    6,
  );

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>{'Name'.padEnd(maxNameLen + 2)}</Text>
        <Text bold>Source</Text>
      </Box>
      <Box marginBottom={0}>
        <Text dimColor>{'─'.repeat(maxNameLen + 2)}</Text>
        <Text dimColor>{'─'.repeat(maxSourceLen)}</Text>
      </Box>
      {skills.map((skill) => (
        <Box key={`${skill.source}-${skill.name}`}>
          <Text>{skill.name.padEnd(maxNameLen + 2)}</Text>
          <Text color={sourceColors[skill.source] as any}>
            {sourceLabels[skill.source]}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

interface RemoveSkillUIProps {
  name: string;
  targetDir: string;
  skillManager: SkillManager;
}

interface InteractiveAddSkillUIProps {
  source: string;
  skillManager: SkillManager;
  options: {
    global?: boolean;
    claude?: boolean;
    overwrite?: boolean;
    name?: string;
    target?: string;
  };
}

const InteractiveAddSkillUI: React.FC<InteractiveAddSkillUIProps> = ({
  source,
  skillManager,
  options,
}) => {
  const [state, setState] = useState<InteractiveAddState>({ phase: 'cloning' });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [cursorIndex, setCursorIndex] = useState(0);

  useEffect(() => {
    const run = async () => {
      try {
        const preview = await skillManager.previewSkills(source);
        if (preview.skills.length === 0) {
          setState({
            phase: 'error',
            error:
              preview.errors.length > 0
                ? preview.errors[0].message
                : 'No skills found',
          });
          skillManager.cleanupPreview(preview);
          setTimeout(() => process.exit(1), 2000);
          return;
        }
        // Pre-select all skills
        setSelectedIndices(new Set(preview.skills.map((_, i) => i)));
        setState({ phase: 'selecting', preview });
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
        setTimeout(() => process.exit(1), 2000);
      }
    };
    run();
  }, [source, skillManager]);

  useInput(
    (input, key) => {
      if (state.phase !== 'selecting') return;

      const { preview } = state;
      const skills = preview.skills;

      if (key.upArrow) {
        setCursorIndex((prev) => (prev > 0 ? prev - 1 : skills.length - 1));
      } else if (key.downArrow) {
        setCursorIndex((prev) => (prev < skills.length - 1 ? prev + 1 : 0));
      } else if (input === ' ') {
        setSelectedIndices((prev) => {
          const next = new Set(prev);
          if (next.has(cursorIndex)) {
            next.delete(cursorIndex);
          } else {
            next.add(cursorIndex);
          }
          return next;
        });
      } else if (key.return) {
        if (selectedIndices.size === 0) {
          skillManager.cleanupPreview(preview);
          setState({ phase: 'cancelled' });
          setTimeout(() => process.exit(0), 1000);
          return;
        }

        const selectedSkills = skills.filter((_, i) => selectedIndices.has(i));
        setState({ phase: 'installing' });

        skillManager
          .installFromPreview(preview, selectedSkills, source, {
            global: options.global,
            claude: options.claude,
            overwrite: options.overwrite,
            name: options.name,
            targetDir: options.target,
          })
          .then((result) => {
            skillManager.cleanupPreview(preview);
            setState({ phase: 'done', result });
            setTimeout(() => process.exit(0), 1500);
          })
          .catch((error: any) => {
            skillManager.cleanupPreview(preview);
            setState({ phase: 'error', error: error.message });
            setTimeout(() => process.exit(1), 2000);
          });
      } else if (key.escape || input === 'q') {
        skillManager.cleanupPreview(preview);
        setState({ phase: 'cancelled' });
        setTimeout(() => process.exit(0), 1000);
      }
    },
    { isActive: state.phase === 'selecting' },
  );

  if (state.phase === 'cloning') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Fetching skills from {source}...</Text>
      </Box>
    );
  }

  if (state.phase === 'error') {
    return <Text color="red">✗ Error: {state.error}</Text>;
  }

  if (state.phase === 'cancelled') {
    return <Text dimColor>No skills selected.</Text>;
  }

  if (state.phase === 'installing') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Installing {selectedIndices.size} skill(s)...</Text>
      </Box>
    );
  }

  if (state.phase === 'selecting') {
    const { preview } = state;
    return (
      <Box flexDirection="column">
        <Text bold>Select skills to install:</Text>
        <Text dimColor>
          (↑/↓ navigate, space toggle, enter confirm, q/esc cancel)
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {preview.skills.map((skill, i) => {
            const isSelected = selectedIndices.has(i);
            const isCursor = cursorIndex === i;
            return (
              <Box key={skill.skillPath}>
                <Text color={isCursor ? 'cyan' : undefined}>
                  {isCursor ? '❯ ' : '  '}
                </Text>
                <Text color={isSelected ? 'green' : 'gray'}>
                  {isSelected ? '◉' : '○'}
                </Text>
                <Text> {skill.name}</Text>
                <Text dimColor> - {skill.description}</Text>
              </Box>
            );
          })}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            {selectedIndices.size} of {preview.skills.length} selected
          </Text>
        </Box>
      </Box>
    );
  }

  // phase === 'done'
  const { result } = state;
  const installDir =
    result.installed.length > 0
      ? path.dirname(path.dirname(result.installed[0].path))
      : null;
  return (
    <Box flexDirection="column">
      {result.installed.length > 0 && (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✓ Installed {result.installed.length} skill(s) to {installDir}:
          </Text>
          {result.installed.map((skill) => (
            <Box key={skill.name} marginLeft={2}>
              <Text color="green">• {skill.name}</Text>
            </Box>
          ))}
        </Box>
      )}
      {result.skipped.length > 0 && (
        <Box
          flexDirection="column"
          marginTop={result.installed.length > 0 ? 1 : 0}
        >
          <Text color="yellow" bold>
            ⚠ Skipped {result.skipped.length} skill(s):
          </Text>
          {result.skipped.map((item) => (
            <Box key={item.name} marginLeft={2}>
              <Text color="yellow">• {item.name}</Text>
              <Text dimColor> - {item.reason}</Text>
            </Box>
          ))}
          <Box marginLeft={2} marginTop={1}>
            <Text dimColor>Use --overwrite to replace existing skills</Text>
          </Box>
        </Box>
      )}
      {result.errors.length > 0 && (
        <Box
          flexDirection="column"
          marginTop={
            result.installed.length > 0 || result.skipped.length > 0 ? 1 : 0
          }
        >
          <Text color="red" bold>
            ✗ Errors:
          </Text>
          {result.errors.map((error, i) => (
            <Box key={i} marginLeft={2}>
              <Text color="red">
                • {error.path}: {error.message}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

const RemoveSkillUI: React.FC<RemoveSkillUIProps> = ({
  name,
  targetDir,
  skillManager,
}) => {
  const [state, setState] = useState<RemoveState>({ phase: 'removing' });

  useEffect(() => {
    const run = async () => {
      try {
        const result = await skillManager.removeSkill(name, targetDir);
        if (result.success) {
          setState({ phase: 'done' });
          setTimeout(() => process.exit(0), 1000);
        } else {
          setState({ phase: 'error', error: result.error || 'Unknown error' });
          setTimeout(() => process.exit(1), 2000);
        }
      } catch (error: any) {
        setState({ phase: 'error', error: error.message });
        setTimeout(() => process.exit(1), 2000);
      }
    };
    run();
  }, [name, targetDir, skillManager]);

  if (state.phase === 'removing') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Removing skill "{name}"...</Text>
      </Box>
    );
  }

  if (state.phase === 'error') {
    return <Text color="red">✗ Error: {state.error}</Text>;
  }

  return (
    <Box>
      <Text color="green">✓ Skill "{name}" removed successfully.</Text>
    </Box>
  );
};

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} skill <command> [options]

Manage skills for the code agent.

Commands:
  add <source>     Install skills from a source
  list             List all available skills
  remove <name>    Remove an installed skill

Options:
  -h, --help       Show help

Add Options:
  --target <dir>   Target directory for skills
  --global, -g     Install to global skills directory (~/.neovate/skills/)
  --claude         Install to Claude skills directory (.claude/skills/)
  --overwrite      Overwrite existing skill with the same name
  --name <name>    Install with a custom local name
  -i, --interactive  Interactively select which skills to install

List Options:
  --target <dir>   Target directory for skills
  --json           Output as JSON

Remove Options:
  --target <dir>   Target directory for skills

Examples:
  ${p} skill add user/repo                    Add skill from GitHub
  ${p} skill add user/repo/path               Add skill from subpath
  ${p} skill add -g user/repo                 Add skill globally
  ${p} skill add --claude user/repo           Add skill to .claude/skills/
  ${p} skill add --claude -g user/repo        Add skill to ~/.claude/skills/
  ${p} skill add --name my-skill user/repo    Add with custom name
  ${p} skill add -i user/repo                 Add skill interactively
  ${p} skill list                             List all skills
  ${p} skill list --json                      List as JSON
  ${p} skill remove my-skill                  Remove skill from project
  ${p} skill remove -g my-skill               Remove skill from global
    `.trim(),
  );
}

function resolveTargetDir(
  argv: { target?: string; global?: boolean; claude?: boolean },
  paths: Paths,
): string {
  if (argv.target) return path.resolve(argv.target);
  if (argv.claude && argv.global)
    return path.join(path.dirname(paths.globalConfigDir), '.claude', 'skills');
  if (argv.claude)
    return path.join(path.dirname(paths.projectConfigDir), '.claude', 'skills');
  if (argv.global) return path.join(paths.globalConfigDir, 'skills');
  return path.join(paths.projectConfigDir, 'skills');
}

interface SkillArgv {
  _: string[];
  help?: boolean;
  global?: boolean;
  claude?: boolean;
  overwrite?: boolean;
  json?: boolean;
  interactive?: boolean;
  target?: string;
  name?: string;
}

export async function runSkill(context: Context) {
  const { default: yargsParser } = await import('yargs-parser');
  const productName = context.productName.toLowerCase();
  const argv = yargsParser(process.argv.slice(3), {
    alias: {
      help: 'h',
      global: 'g',
      target: 't',
      name: 'n',
      interactive: 'i',
    },
    boolean: ['help', 'global', 'overwrite', 'json', 'claude', 'interactive'],
    string: ['target', 'name'],
  }) as SkillArgv;

  const command = argv._[0];

  if (!command || argv.help) {
    printHelp(productName);
    return;
  }

  const paths = new Paths({
    productName: context.productName,
    cwd: context.cwd,
  });

  const skillManager = new SkillManager({ context });

  if (command === 'add') {
    const source = argv._[1] as string | undefined;
    if (!source) {
      console.error('Error: Missing source argument');
      console.error(`Usage: ${productName} skill add <source>`);
      process.exit(1);
    }

    if (argv.interactive) {
      render(
        <InteractiveAddSkillUI
          source={source}
          skillManager={skillManager}
          options={{
            global: argv.global,
            claude: argv.claude,
            overwrite: argv.overwrite,
            name: argv.name,
            target: argv.target,
          }}
        />,
        { patchConsole: true, exitOnCtrlC: true },
      );
      return;
    }

    render(
      <AddSkillUI
        source={source}
        skillManager={skillManager}
        options={{
          global: argv.global,
          claude: argv.claude,
          overwrite: argv.overwrite,
          name: argv.name,
          target: argv.target,
        }}
      />,
      { patchConsole: true, exitOnCtrlC: true },
    );
    return;
  }

  if (command === 'list' || command === 'ls') {
    if (argv.json) {
      await skillManager.loadSkills();
      const skills = skillManager.getSkills();
      console.log(JSON.stringify(skills, null, 2));
      return;
    }

    render(<SkillListUI skillManager={skillManager} />, {
      patchConsole: true,
      exitOnCtrlC: true,
    });
    return;
  }

  if (command === 'remove' || command === 'rm') {
    const name = argv._[1] as string | undefined;
    if (!name) {
      console.error('Error: Missing skill name');
      console.error(`Usage: ${productName} skill remove <name>`);
      process.exit(1);
    }

    const targetDir = resolveTargetDir(argv, paths);

    render(
      <RemoveSkillUI
        name={name}
        targetDir={targetDir}
        skillManager={skillManager}
      />,
      { patchConsole: true, exitOnCtrlC: true },
    );
    return;
  }

  console.error(`Error: Unknown command "${command}"`);
  printHelp(productName);
  process.exit(1);
}
