import {
  readFile,
  writeFile,
  mkdir,
  access,
  constants,
} from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { ArtifactCompletionScanner } from './utils/artifacts.js';

/**
 * Cache configuration for completion performance optimization
 */
const COMPLETION_CACHE = {
  FILE: join(homedir(), '.kodebase', 'completion-cache.json'),
  TTL: 300_000, // 5 minutes in milliseconds
};

/**
 * Available commands and their subcommands for completion
 */
const COMMANDS = {
  create: {
    description: 'Create new artifact',
    options: ['--help', '-h'],
  },
  ready: {
    description: 'Mark artifact as ready',
    options: ['--help', '-h'],
  },
  start: {
    description: 'Start work on artifact',
    options: ['--help', '-h'],
  },
  status: {
    description: 'Show artifact status',
    options: ['--help', '-h', '--json'],
  },
  list: {
    description: 'List artifacts',
    options: [
      '--help',
      '-h',
      '--type',
      '--status',
      '--assignee',
      '--parent',
      '--sort',
      '--page',
      '--page-size',
    ],
  },
  pr: {
    description: 'Create/update pull request',
    options: ['--help', '-h', '--ready', '--verbose'],
  },
} as const;

/**
 * Global options available for all commands
 */
const GLOBAL_OPTIONS = ['--help', '-h', '--version', '-v', '--verbose'];

/**
 * Command shortcuts mapping
 */
const COMMAND_SHORTCUTS = {
  c: 'create',
  s: 'status',
  l: 'list',
} as const;

interface CachedData {
  timestamp: number;
  artifactIds: string[];
}

/**
 * Shell completion system for the Kodebase CLI
 * Provides tab completion for commands, options, and artifact IDs
 */
export class CompletionManager {
  private scanner: ArtifactCompletionScanner;

  constructor(artifactsRoot?: string) {
    this.scanner = new ArtifactCompletionScanner(artifactsRoot);
  }

  /**
   * Generate completion suggestions for the given command line
   * @param line - Current command line being completed
   * @param cursor - Cursor position in the line
   * @returns Array of completion suggestions
   */
  async generateCompletions(line: string, _cursor: number): Promise<string[]> {
    // Split without trimming to preserve spaces
    const words = line.split(/\s+/);
    const trimmedWords = line.trim().split(/\s+/);
    const currentWord = line.endsWith(' ') ? '' : words[words.length - 1] || '';
    const previousWord = words[words.length - 2] || '';

    // Remove binary name (kodebase/kb) from consideration
    const [_binary, command] = trimmedWords;

    // If no command yet or typing a command, suggest commands
    if (trimmedWords.length <= 2 && !line.endsWith(' ')) {
      // Typing a command - filter by current word
      const partialCommand = command || '';
      return this.getCommandCompletions(partialCommand);
    }

    if (trimmedWords.length === 1 && line.endsWith(' ')) {
      // Binary + space - show all commands
      return this.getCommandCompletions('');
    }

    // Resolve command shortcuts
    const resolvedCommand =
      COMMAND_SHORTCUTS[command as keyof typeof COMMAND_SHORTCUTS] || command;

    // If current word starts with '-', suggest options
    if (currentWord.startsWith('-')) {
      return this.getOptionCompletions(resolvedCommand, currentWord);
    }

    // For specific commands that need artifact IDs
    if (this.commandNeedsArtifactId(resolvedCommand, previousWord)) {
      return this.getArtifactIdCompletions(currentWord);
    }

    return [];
  }

  /**
   * Get command completions
   */
  private getCommandCompletions(partial: string): string[] {
    const allCommands = [
      ...Object.keys(COMMANDS),
      ...Object.keys(COMMAND_SHORTCUTS),
      ...GLOBAL_OPTIONS,
    ];

    return allCommands.filter((cmd) => cmd.startsWith(partial));
  }

  /**
   * Get option completions for a command
   */
  private getOptionCompletions(command: string, partial: string): string[] {
    const commandDef = COMMANDS[command as keyof typeof COMMANDS];
    if (!commandDef) {
      return GLOBAL_OPTIONS.filter((opt) => opt.startsWith(partial));
    }

    const allOptions = [...commandDef.options, ...GLOBAL_OPTIONS];
    return allOptions.filter((opt) => opt.startsWith(partial));
  }

  /**
   * Check if a command needs artifact ID completion
   */
  private commandNeedsArtifactId(
    command: string,
    previousWord: string,
  ): boolean {
    // Commands that always need artifact ID as first argument
    const artifactCommands = ['ready', 'start', 'status'];
    if (artifactCommands.includes(command)) {
      return true;
    }

    // Create command can optionally take parent ID
    if (command === 'create') {
      return true;
    }

    // Options that take artifact IDs as values
    const artifactOptions = ['--parent'];
    if (artifactOptions.includes(previousWord)) {
      return true;
    }

    return false;
  }

  /**
   * Get artifact ID completions with caching
   */
  private async getArtifactIdCompletions(partial: string): Promise<string[]> {
    try {
      const cachedIds = await this.getCachedArtifactIds();
      return cachedIds.filter((id) => id.startsWith(partial));
    } catch {
      // Fallback to direct scan if cache fails
      return this.scanner.getMatchingArtifactIds(partial);
    }
  }

  /**
   * Get cached artifact IDs or refresh cache if stale
   */
  private async getCachedArtifactIds(): Promise<string[]> {
    try {
      // Check if cache file exists
      await access(COMPLETION_CACHE.FILE, constants.F_OK);

      const content = await readFile(COMPLETION_CACHE.FILE, 'utf-8');
      const cachedData: CachedData = JSON.parse(content);

      // Check if cache is still valid
      const now = Date.now();
      if (now - cachedData.timestamp < COMPLETION_CACHE.TTL) {
        return cachedData.artifactIds;
      }
    } catch {
      // Cache doesn't exist or is invalid, fall through to refresh
    }

    // Refresh cache
    return this.refreshArtifactCache();
  }

  /**
   * Refresh the artifact ID cache
   */
  private async refreshArtifactCache(): Promise<string[]> {
    try {
      const artifactIds = await this.scanner.getAllArtifactIds();
      const cachedData: CachedData = {
        timestamp: Date.now(),
        artifactIds,
      };

      // Ensure cache directory exists
      await mkdir(dirname(COMPLETION_CACHE.FILE), { recursive: true });

      // Write cache
      await writeFile(
        COMPLETION_CACHE.FILE,
        JSON.stringify(cachedData, null, 2),
        'utf-8',
      );

      return artifactIds;
    } catch {
      // If caching fails, return direct scan result
      return this.scanner.getAllArtifactIds();
    }
  }

  /**
   * Generate bash completion script
   */
  generateBashScript(): string {
    return `# Kodebase CLI completion for bash
_kodebase_completion() {
    local cur prev words cword
    _init_completion || return

    # Handle both 'kodebase' and 'kb' commands
    local cmd="\${words[0]}"
    local line="\${COMP_LINE}"
    local cursor="\${COMP_POINT}"

    # Get completions from CLI
    local completions
    completions=$($cmd __complete "$line" "$cursor" 2>/dev/null)
    
    if [[ $? -eq 0 && -n "$completions" ]]; then
        COMPREPLY=($(compgen -W "$completions" -- "$cur"))
    fi
}

# Register completion for both commands
complete -F _kodebase_completion kodebase
complete -F _kodebase_completion kb`;
  }

  /**
   * Generate zsh completion script
   */
  generateZshScript(): string {
    return `# Kodebase CLI completion for zsh
_kodebase_completion() {
    local line cursor
    line="$BUFFER"
    cursor="$CURSOR"

    # Get completions from CLI
    local completions
    completions=($(kodebase __complete "$line" "$cursor" 2>/dev/null))
    
    if [[ $? -eq 0 && \${#completions[@]} -gt 0 ]]; then
        compadd -a completions
    fi
}

# Register completion for both commands
compdef _kodebase_completion kodebase
compdef _kodebase_completion kb`;
  }
}

/**
 * Handle completion request from shell
 * Called internally by completion scripts
 */
export async function handleCompletionRequest(
  line: string,
  cursor: string,
): Promise<void> {
  const manager = new CompletionManager();
  const cursorPos = parseInt(cursor, 10) || 0;

  try {
    const completions = await manager.generateCompletions(line, cursorPos);
    console.log(completions.join(' '));
  } catch {
    // Silent failure for completion - don't show errors to user
    console.log('');
  }
}
