# Shell Environment Access for Bash Commands

**Date:** 2026-01-09

## Context

Bash commands executed through Neovate's bash tool lack access to user's shell environment configuration. This means shell aliases, environment variables from config files, custom functions, and PATH modifications from shell configs are unavailable.

The root cause is in `src/utils/shell-execution.ts` where commands are spawned using `spawn('bash', ['-c', command])`. This runs bash in non-interactive, non-login mode, which doesn't source user configuration files like `.bashrc` or `.zshrc`.

Reference: https://github.com/neovateai/neovate-code/issues/618

## Discussion

**Shell flags options considered:**
- `-i` (interactive) - sources `.bashrc`/`.zshrc`
- `-l` (login) - sources `.bash_profile`/`.zprofile`
- `-il` (both) - most complete but potentially slowest

**Decision:** Use `-il` for complete environment access.

**Configurability:** Not needed at this time. May revisit if users request the ability to toggle between isolated and full shell environments.

**Fish shell compatibility:** Fish doesn't support `-i` when combined with `-c`, so special handling is required to only use `-l` for fish.

**Security considerations:** Interactive shells may have aliases that conflict with expected command behavior. This is acceptable as users expect their environment to work consistently.

## Approach

1. Use user's default shell from `$SHELL` environment variable instead of hardcoded `bash`
2. Add `-il` flags for login interactive mode to source all user config files
3. Handle fish shell specially by only using `-l` flag (fish incompatible with `-i -c`)
4. Fall back to `/bin/bash` if `$SHELL` is not set

## Architecture

### Implementation in `src/utils/shell-execution.ts`

```typescript
const isWindows = os.platform() === 'win32';
const shell = isWindows ? 'cmd.exe' : (process.env.SHELL || '/bin/bash');
const isFish = !isWindows && shell.endsWith('/fish');
const shellArgs = isWindows
  ? ['/c', commandToExecute]
  : isFish
    ? ['-l', '-c', commandToExecute]
    : ['-il', '-c', commandToExecute];
```

### Shell behavior with flags

| Shell | Flags | Config files sourced |
|-------|-------|---------------------|
| bash | `-il` | `.bash_profile`, `.bashrc` |
| zsh | `-il` | `.zprofile`, `.zshrc` |
| fish | `-l` | `config.fish` (fish doesn't support `-i` with `-c`) |

### Fallback behavior

- Windows: Uses `cmd.exe /c` (unchanged)
- Missing `$SHELL`: Falls back to `/bin/bash`
