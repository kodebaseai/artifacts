import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Create } from '../commands/Create.js';
import { Deps } from '../commands/Deps.js';
import { List } from '../commands/List.js';
import { PR } from '../commands/PR.js';
import { Ready } from '../commands/Ready.js';
import { Setup } from '../commands/Setup.js';
import { Start } from '../commands/Start.js';
import { InteractiveStart } from '../commands/InteractiveStart.js';
import { Status } from '../commands/Status.js';
import { Tutorial } from '../commands/Tutorial.js';
import { Validate } from '../commands/Validate.js';
import { CompletionManager, handleCompletionRequest } from '../completion.js';
import { InvalidArtifactIdError, ValidationError } from '../types/errors.js';
import { withErrorHandler } from './ErrorHandler.js';
import { Version } from './Version.js';
import { isFirstRun } from '../utils/config.js';
import { SetupWizard } from './setup/SetupWizard.js';

interface AppProps {
  args: string[];
  verbose?: boolean;
}

const AppComponent: FC<AppProps> = ({ args, verbose = false }) => {
  const [command, ...restArgs] = args;
  const [checkingFirstRun, setCheckingFirstRun] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Check for first run on mount
  useEffect(() => {
    // Skip first-run check for internal commands and completion
    if (command?.startsWith('__') || command === 'setup') {
      setCheckingFirstRun(false);
      return;
    }

    isFirstRun()
      .then((firstRun) => {
        setNeedsSetup(firstRun);
        setCheckingFirstRun(false);
      })
      .catch(() => {
        // If we can't check, assume not first run
        setCheckingFirstRun(false);
      });
  }, [command]);

  const handleSetupComplete = (launchTutorial?: boolean) => {
    if (launchTutorial) {
      // Re-render with tutorial command
      setNeedsSetup(false);
      args[0] = 'tutorial';
    } else {
      // After setup, exit gracefully
      process.exit(0);
    }
  };

  // Show loading while checking first run
  if (checkingFirstRun) {
    return <Box />;
  }

  // Show setup wizard if needed
  if (needsSetup) {
    return (
      <Box paddingY={1}>
        <SetupWizard onComplete={handleSetupComplete} />
      </Box>
    );
  }

  // Command shortcuts mapping
  const commandShortcuts: Record<string, string> = {
    s: 'status',
    c: 'create',
    l: 'list',
    t: 'tutorial',
    v: 'validate',
  };

  // Resolve command shortcut if it exists
  const resolvedCommand = command
    ? commandShortcuts[command] || command
    : command;

  // Handle completion request (internal use by shell scripts)
  if (command === '__complete') {
    const line = restArgs[0] || '';
    const cursor = restArgs[1] || '0';

    // Handle completion synchronously and exit
    // We can't avoid the side effect here as completion needs to be immediate
    handleCompletionRequest(line, cursor)
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });

    // Return empty component - process will exit before this renders
    return <Box></Box>;
  }

  // Handle completion script generation
  if (command === '__complete-bash') {
    const manager = new CompletionManager();
    console.log(manager.generateBashScript());
    process.exit(0);
  }

  if (command === '__complete-zsh') {
    const manager = new CompletionManager();
    console.log(manager.generateZshScript());
    process.exit(0);
  }

  // Handle version flags
  if (command === '--version' || command === '-v') {
    return <Version />;
  }

  // Handle help flags
  if (command === '--help' || command === '-h' || !command) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Kodebase CLI
        </Text>
        <Text>Structured knowledge management for software projects</Text>
        <Text></Text>
        <Text bold>Usage:</Text>
        <Text> kodebase [command] [options]</Text>
        <Text> kb [command] [options] (alias for kodebase)</Text>
        <Text></Text>
        <Text bold>Commands:</Text>
        <Text>
          {' '}
          create (c) [parent_id] &lt;idea&gt; Create new artifact (initiative,
          milestone, or issue)
        </Text>
        <Text>
          {' '}
          ready &lt;artifact-id&gt; Mark draft artifact as ready for work
        </Text>
        <Text>
          {' '}
          start &lt;artifact-id&gt; Create feature branch and start work on
          artifact
        </Text>
        <Text>
          {' '}
          status (s) &lt;artifact-id&gt; [--json] Show detailed artifact status
          and timeline
        </Text>
        <Text>
          {' '}
          list (l) [options] List artifacts with filtering and sorting
        </Text>
        <Text>
          {' '}
          pr [--ready] Create or update pull request for current branch
        </Text>
        <Text>
          {' '}
          validate (v) [artifact-path] [--fix] [--json] Validate artifacts for
          readiness
        </Text>
        <Text>
          {' '}
          deps &lt;artifact-id&gt; [--json] --experimental Analyze dependency
          tree (experimental)
        </Text>
        <Text> setup Configure CLI settings and preferences</Text>
        <Text> tutorial (t) Start interactive tutorial for new users</Text>
        <Text></Text>
        <Text bold>Shell Completion:</Text>
        <Text> To enable tab completion, run the installation script:</Text>
        <Text>
          {' '}
          curl -sL
          https://github.com/kodebaseai/kodebase/raw/main/packages/cli/scripts/install-completion.sh
          | bash
        </Text>
        <Text color="gray">
          {' '}
          Or copy the script locally and run it manually for security
        </Text>
        <Text></Text>
        <Text bold>Global Options:</Text>
        <Text> -v, --version Show version number</Text>
        <Text> -h, --help Show help information</Text>
        <Text> --verbose Show detailed error information and stack traces</Text>
        <Text></Text>
        <Text bold>Examples:</Text>
        <Text color="green"> kodebase create "Build user authentication"</Text>
        <Text color="gray"> Creates a new initiative</Text>
        <Text></Text>
        <Text color="green"> kb c A.1 "Fix login validation bug"</Text>
        <Text color="gray">
          {' '}
          Creates an issue under milestone A.1 (using shortcut)
        </Text>
        <Text></Text>
        <Text color="green"> kb s D.1.5</Text>
        <Text color="gray">
          {' '}
          Shows status, timeline, and relationships for D.1.5
        </Text>
        <Text></Text>
        <Text color="green"> kb l --status ready --type issue</Text>
        <Text color="gray"> Lists all ready issues (using shortcut)</Text>
        <Text></Text>
        <Text color="green"> kodebase start D.2.2</Text>
        <Text color="gray"> Creates feature branch D.2.2 and starts work</Text>
        <Text></Text>
        <Text bold>Command Shortcuts:</Text>
        <Text> kb c = kodebase create</Text>
        <Text> kb s = kodebase status</Text>
        <Text> kb l = kodebase list</Text>
        <Text> kb t = kodebase tutorial</Text>
        <Text> kb v = kodebase validate</Text>
        <Text></Text>
        <Text bold>Get help for specific commands:</Text>
        <Text> kodebase create --help</Text>
        <Text> kb s --help</Text>
        <Text> kb l --help</Text>
      </Box>
    );
  }

  // Handle create command
  if (resolvedCommand === 'create') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase create
          </Text>
          <Text>Create a new artifact (initiative, milestone, or issue)</Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase create [options] [parent_id] &lt;idea&gt;</Text>
          <Text> kodebase create --wizard (interactive mode)</Text>
          <Text></Text>
          <Text bold>Options:</Text>
          <Text> --wizard Launch interactive creation wizard</Text>
          <Text>
            {' '}
            --submit Validate and create draft PR after artifact creation
          </Text>
          <Text></Text>
          <Text bold>Arguments:</Text>
          <Text>
            {' '}
            parent_id Optional parent artifact ID (for milestones and issues)
          </Text>
          <Text> idea Description of what you want to build or accomplish</Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green">
            {' '}
            kodebase create "Build user authentication system"
          </Text>
          <Text color="gray"> Creates a new initiative</Text>
          <Text></Text>
          <Text color="green">
            {' '}
            kodebase create A "API development milestone"
          </Text>
          <Text color="gray"> Creates a milestone under initiative A</Text>
          <Text></Text>
          <Text color="green">
            {' '}
            kodebase create A.1 "Implement login endpoint"
          </Text>
          <Text color="gray"> Creates an issue under milestone A.1</Text>
          <Text></Text>
          <Text color="green"> kodebase create --wizard</Text>
          <Text color="gray"> Launches interactive creation wizard</Text>
          <Text></Text>
          <Text bold>Notes:</Text>
          <Text> • Omit parent_id to create an initiative</Text>
          <Text> • Use quotes around multi-word ideas</Text>
          <Text> • Parent artifacts must exist and not be completed</Text>
        </Box>
      );
    }

    // Check for wizard flag
    if (restArgs.includes('--wizard')) {
      const submit = restArgs.includes('--submit');
      return <Create wizard={true} verbose={verbose} submit={submit} />;
    }

    // Check for submit flag
    const submit = restArgs.includes('--submit');

    if (restArgs.length === 0) {
      throw new ValidationError('idea', '', 'Idea description is required', {
        suggestions: [
          {
            action: 'Provide an idea description',
            command:
              'kodebase create "Your idea here" (or kb c "Your idea here")',
            description: 'Describe what you want to build or accomplish',
          },
          {
            action: 'Use interactive wizard',
            command: 'kodebase create --wizard (or kb c --wizard)',
            description: 'Launch interactive creation wizard',
          },
          {
            action: 'Get help',
            command: 'kodebase create --help',
            description: 'See usage examples and detailed documentation',
          },
        ],
      });
    }

    let parentId: string | undefined;
    let idea: string;

    // Filter out any flags from the args for normal processing
    const nonFlagArgs = restArgs.filter((arg) => !arg.startsWith('--'));

    if (nonFlagArgs.length === 1) {
      // No parent ID provided - creating initiative
      idea = nonFlagArgs[0] || '';
    } else {
      // Parent ID provided
      parentId = nonFlagArgs[0];
      idea = nonFlagArgs.slice(1).join(' ');
    }

    return (
      <Create
        parentId={parentId}
        idea={idea}
        verbose={verbose}
        submit={submit}
      />
    );
  }

  // Handle status command
  if (resolvedCommand === 'status') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase status
          </Text>
          <Text>
            Show detailed artifact status, timeline, and relationships
          </Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase status &lt;artifact-id&gt; [--json]</Text>
          <Text></Text>
          <Text bold>Arguments:</Text>
          <Text>
            {' '}
            artifact-id The ID of the artifact to show (e.g., A.1.5, D.2, C)
          </Text>
          <Text></Text>
          <Text bold>Options:</Text>
          <Text> --json Output status information in JSON format</Text>
          <Text>
            {' '}
            --check-parent Check parent blocking status and show warnings
          </Text>
          <Text>
            {' '}
            --experimental Enable experimental features (deps analysis, cascade
            preview)
          </Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green"> kodebase status D.1.5</Text>
          <Text color="gray"> Shows formatted status for issue D.1.5</Text>
          <Text></Text>
          <Text color="green"> kodebase status A.1 --json</Text>
          <Text color="gray"> Shows milestone A.1 status in JSON format</Text>
          <Text></Text>
          <Text color="green"> kodebase status A.1.5 --experimental</Text>
          <Text color="gray">
            {' '}
            Shows status with experimental dependency analysis
          </Text>
          <Text></Text>
          <Text bold>Status Information:</Text>
          <Text> • Current status and priority</Text>
          <Text> • Event timeline with timestamps</Text>
          <Text> • Dependencies (blocks/blocked by)</Text>
          <Text> • Metadata and assignee information</Text>
        </Box>
      );
    }

    if (restArgs.length === 0) {
      throw new ValidationError('artifact-id', '', 'Artifact ID is required', {
        suggestions: [
          {
            action: 'Provide an artifact ID',
            command: 'kodebase status A.1.5 (or kb s A.1.5)',
            description: 'Replace A.1.5 with your actual artifact ID',
          },
          {
            action: 'List available artifacts',
            command: 'kodebase list (or kb l)',
            description: 'See all available artifact IDs',
          },
          {
            action: 'Get help',
            command: 'kodebase status --help',
            description: 'Learn more about the status command',
          },
        ],
      });
    }

    const artifactId = restArgs[0];
    const format = restArgs.includes('--json') ? 'json' : 'formatted';
    const checkParent = restArgs.includes('--check-parent');
    const experimental = restArgs.includes('--experimental');

    if (!artifactId || artifactId.trim() === '') {
      throw new InvalidArtifactIdError(artifactId || '(empty)');
    }

    return (
      <Status
        artifactId={artifactId}
        format={format}
        verbose={verbose}
        checkParent={checkParent}
        experimental={experimental}
      />
    );
  }

  // Handle start command
  if (resolvedCommand === 'start') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase start
          </Text>
          <Text>Create feature branch and start work on an artifact</Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase start &lt;artifact-id&gt;</Text>
          <Text> kodebase start --interactive</Text>
          <Text></Text>
          <Text bold>Options:</Text>
          <Text> -i, --interactive Launch fuzzy-search artifact picker</Text>
          <Text>
            {' '}
            --submit Validate and create draft PR after starting work
          </Text>
          <Text></Text>
          <Text bold>Arguments:</Text>
          <Text>
            {' '}
            artifact-id The ID of the artifact to start (e.g., A.1.5, D.2.2)
          </Text>
          <Text></Text>
          <Text bold>What this command does:</Text>
          <Text> • Validates artifact exists and is in 'ready' status</Text>
          <Text> • Creates feature branch with exact artifact ID name</Text>
          <Text> • Switches to the new branch automatically</Text>
          <Text>
            {' '}
            • Post-checkout hooks update artifact status to 'in_progress'
          </Text>
          <Text> • Shows next steps for development workflow</Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green"> kodebase start D.2.2</Text>
          <Text color="gray"> Creates and switches to branch D.2.2</Text>
          <Text></Text>
          <Text color="green"> kodebase start A.1.5</Text>
          <Text color="gray"> Starts work on issue A.1.5</Text>
          <Text></Text>
          <Text color="green"> kodebase start --interactive</Text>
          <Text color="gray">
            {' '}
            Search and select artifact with fuzzy picker
          </Text>
          <Text></Text>
          <Text bold>Requirements:</Text>
          <Text> • Must be in a git repository</Text>
          <Text> • Artifact must exist and have status 'ready'</Text>
          <Text> • Branch with artifact ID must not already exist</Text>
        </Box>
      );
    }

    // Check for interactive flag
    if (restArgs.includes('--interactive') || restArgs.includes('-i')) {
      return <InteractiveStart filterStatus={['ready']} />;
    }

    if (restArgs.length === 0) {
      throw new ValidationError('artifact-id', '', 'Artifact ID is required', {
        suggestions: [
          {
            action: 'Provide an artifact ID',
            command: 'kodebase start A.1.5',
            description: 'Replace A.1.5 with your actual artifact ID',
          },
          {
            action: 'Use interactive mode',
            command: 'kodebase start --interactive (or kb start -i)',
            description: 'Select artifact with fuzzy search picker',
          },
          {
            action: 'List ready artifacts',
            command: 'kodebase list --status ready (or kb l --status ready)',
            description: 'See all artifacts ready to start',
          },
          {
            action: 'Get help',
            command: 'kodebase start --help',
            description: 'Learn more about the start command',
          },
        ],
      });
    }

    // Check for submit flag
    const submit = restArgs.includes('--submit');

    const artifactId = restArgs[0];

    if (!artifactId || artifactId.trim() === '') {
      throw new InvalidArtifactIdError(artifactId || '(empty)');
    }

    return <Start artifactId={artifactId} verbose={verbose} submit={submit} />;
  }

  // Handle ready command
  if (resolvedCommand === 'ready') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase ready
          </Text>
          <Text>Mark a draft artifact as ready for work</Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase ready &lt;artifact-id&gt;</Text>
          <Text></Text>
          <Text bold>Arguments:</Text>
          <Text>
            {' '}
            artifact-id The ID of the artifact to mark as ready (e.g., A.1.5,
            D.2.2)
          </Text>
          <Text></Text>
          <Text bold>What this command does:</Text>
          <Text> • Validates artifact exists and is in 'draft' status</Text>
          <Text>
            {' '}
            • Checks for blocking dependencies and ensures they're resolved
          </Text>
          <Text> • Validates all required fields are present and complete</Text>
          <Text> • Updates artifact status to 'ready' with new event</Text>
          <Text> • Shows next steps for starting work on the artifact</Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green"> kodebase ready D.2.3</Text>
          <Text color="gray"> Marks issue D.2.3 as ready for development</Text>
          <Text></Text>
          <Text color="green"> kodebase ready A.1.5</Text>
          <Text color="gray"> Marks issue A.1.5 as ready for work</Text>
          <Text></Text>
          <Text bold>Prerequisites:</Text>
          <Text> • Artifact must be in 'draft' status</Text>
          <Text>
            {' '}
            • No blocking dependencies (blocked_by must be empty or resolved)
          </Text>
          <Text>
            {' '}
            • All required fields must be completed (title, acceptance_criteria,
            etc.)
          </Text>
        </Box>
      );
    }

    if (restArgs.length === 0) {
      throw new ValidationError('artifact-id', '', 'Artifact ID is required', {
        suggestions: [
          {
            action: 'Specify an artifact ID',
            command: 'kodebase ready A.1.5',
            description: 'Mark artifact A.1.5 as ready for work',
          },
          {
            action: 'Get help',
            command: 'kodebase ready --help',
            description: 'See usage examples and detailed documentation',
          },
        ],
      });
    }
    const artifactId = restArgs[0];
    if (!artifactId || artifactId.trim() === '') {
      throw new InvalidArtifactIdError(artifactId || '(empty)');
    }
    return <Ready artifactId={artifactId} verbose={verbose} />;
  }

  // Handle list command
  if (resolvedCommand === 'list') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase list
          </Text>
          <Text>List artifacts with filtering, sorting, and pagination</Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase list [options]</Text>
          <Text></Text>
          <Text bold>Filter Options:</Text>
          <Text>
            {' '}
            --type &lt;type&gt; Filter by artifact type (initiative, milestone,
            issue)
          </Text>
          <Text>
            {' '}
            --status &lt;status&gt; Filter by status (draft, ready, in_progress,
            etc.)
          </Text>
          <Text> --assignee &lt;name&gt; Filter by assignee name or email</Text>
          <Text> --parent &lt;id&gt; Filter by parent artifact ID</Text>
          <Text></Text>
          <Text bold>Display Options:</Text>
          <Text>
            {' '}
            --sort &lt;field&gt; Sort by field (created, updated, priority,
            status)
          </Text>
          <Text>
            {' '}
            --page &lt;number&gt; Page number for pagination (default: 1)
          </Text>
          <Text> --page-size &lt;size&gt; Items per page (default: 20)</Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green"> kodebase list</Text>
          <Text color="gray"> Lists all artifacts</Text>
          <Text></Text>
          <Text color="green"> kodebase list --status ready --type issue</Text>
          <Text color="gray"> Lists all ready issues</Text>
          <Text></Text>
          <Text color="green"> kodebase list --parent A.1 --sort priority</Text>
          <Text color="gray">
            {' '}
            Lists all artifacts under A.1, sorted by priority
          </Text>
          <Text></Text>
          <Text color="green">
            {' '}
            kodebase list --assignee "john@example.com"
          </Text>
          <Text color="gray">
            {' '}
            Lists artifacts assigned to john@example.com
          </Text>
        </Box>
      );
    }
    const options: {
      type?: string;
      status?: string;
      assignee?: string;
      parent?: string;
      sort?: string;
      page?: number;
      pageSize?: number;
    } = {};

    // Parse options
    for (let i = 0; i < restArgs.length; i++) {
      const arg = restArgs[i];
      if (arg === '--type' && i + 1 < restArgs.length) {
        options.type = restArgs[i + 1];
        i++; // Skip next argument as it's the value
      } else if (arg === '--status' && i + 1 < restArgs.length) {
        options.status = restArgs[i + 1];
        i++;
      } else if (arg === '--assignee' && i + 1 < restArgs.length) {
        options.assignee = restArgs[i + 1];
        i++;
      } else if (arg === '--parent' && i + 1 < restArgs.length) {
        options.parent = restArgs[i + 1];
        i++;
      } else if (arg === '--sort' && i + 1 < restArgs.length) {
        options.sort = restArgs[i + 1];
        i++;
      } else if (arg === '--page' && i + 1 < restArgs.length) {
        const pageValue = restArgs[i + 1];
        if (pageValue) {
          options.page = parseInt(pageValue, 10);
        }
        i++;
      } else if (arg === '--page-size' && i + 1 < restArgs.length) {
        const pageSizeValue = restArgs[i + 1];
        if (pageSizeValue) {
          options.pageSize = parseInt(pageSizeValue, 10);
        }
        i++;
      }
    }

    return <List options={options} />;
  }

  // Handle pr command
  if (resolvedCommand === 'pr') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase pr
          </Text>
          <Text>Create or update pull request for current artifact branch</Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase pr [options]</Text>
          <Text></Text>
          <Text bold>Options:</Text>
          <Text> --ready Mark PR as ready for review (default: draft)</Text>
          <Text> --verbose Show detailed output</Text>
          <Text> -h, --help Show this help message</Text>
          <Text></Text>
          <Text bold>Description:</Text>
          <Text>
            Automatically creates or updates a pull request for the current
            branch.
          </Text>
          <Text>
            • Detects artifact ID from branch name (e.g., A.1.5, D.2.4)
          </Text>
          <Text>• Generates PR title from artifact title</Text>
          <Text>• Creates description with acceptance criteria</Text>
          <Text>• Creates draft PR by default, use --ready for review</Text>
          <Text>• Updates existing PR if one already exists</Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green"> kodebase pr</Text>
          <Text color="gray">
            {' '}
            Create or update draft PR for current branch
          </Text>
          <Text></Text>
          <Text color="green"> kodebase pr --ready</Text>
          <Text color="gray">
            {' '}
            Create or update PR and mark ready for review
          </Text>
        </Box>
      );
    }

    // Parse options
    const ready = restArgs.includes('--ready');

    return <PR ready={ready} verbose={verbose} />;
  }

  // Handle setup command
  if (resolvedCommand === 'setup') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase setup
          </Text>
          <Text>Configure Kodebase CLI settings and preferences</Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase setup</Text>
          <Text></Text>
          <Text bold>Description:</Text>
          <Text>Launches the interactive setup wizard to configure:</Text>
          <Text> • Git identity for artifact tracking</Text>
          <Text> • Shell completion for better CLI experience</Text>
          <Text> • Default preferences (output format, verbosity, editor)</Text>
          <Text> • Option to launch interactive tutorial</Text>
          <Text></Text>
          <Text bold>Notes:</Text>
          <Text> • Run automatically on first use after installation</Text>
          <Text> • Can be run anytime to reconfigure settings</Text>
          <Text> • Configuration saved to ~/.config/kodebase/config.json</Text>
        </Box>
      );
    }

    return <Setup verbose={verbose} />;
  }

  // Handle tutorial command
  if (resolvedCommand === 'tutorial') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase tutorial
          </Text>
          <Text>Start interactive tutorial for new users</Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase tutorial</Text>
          <Text> kb tutorial (or kb t)</Text>
          <Text></Text>
          <Text bold>Description:</Text>
          <Text>
            Launches an interactive tutorial that guides new users through
          </Text>
          <Text>
            kodebase concepts and workflows in a safe sandbox environment.
          </Text>
          <Text>• Learn core terminology and artifact types</Text>
          <Text>• Practice creating initiatives, milestones, and issues</Text>
          <Text>• Understand Git workflow integration</Text>
          <Text>• Try essential CLI commands risk-free</Text>
          <Text>• Automatic cleanup - no permanent changes to your system</Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green"> kodebase tutorial</Text>
          <Text color="gray"> Start the interactive tutorial</Text>
          <Text></Text>
          <Text color="green"> kb t</Text>
          <Text color="gray"> Same command using alias shortcut</Text>
        </Box>
      );
    }

    return <Tutorial verbose={verbose} />;
  }

  // Handle validate command
  if (resolvedCommand === 'validate') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase validate
          </Text>
          <Text>
            Validate artifacts for schema compliance and readiness rules
          </Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text> kodebase validate [artifact-path] [--fix] [--json]</Text>
          <Text> kb v [artifact-path] [--fix] [--json]</Text>
          <Text></Text>
          <Text bold>Options:</Text>
          <Text> --fix Attempt to auto-repair fixable issues</Text>
          <Text> --json Output validation results in JSON format</Text>
          <Text></Text>
          <Text bold>Arguments:</Text>
          <Text> artifact-path Optional path to specific artifact file</Text>
          <Text> If omitted, validates all artifacts in repository</Text>
          <Text></Text>
          <Text bold>Description:</Text>
          <Text>Validates artifacts against:</Text>
          <Text>• Schema compliance (correct structure and types)</Text>
          <Text>• Readiness rules (required fields and dependencies)</Text>
          <Text>• Circular dependency detection</Text>
          <Text>• Cross-level relationship validation</Text>
          <Text></Text>
          <Text bold>Exit Codes:</Text>
          <Text> 0 - All validations passed</Text>
          <Text> 1 - Validation errors found</Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green"> kodebase validate</Text>
          <Text color="gray"> Validate all artifacts in the repository</Text>
          <Text></Text>
          <Text color="green"> kb v A.1.5.yml</Text>
          <Text color="gray"> Validate specific artifact file</Text>
          <Text></Text>
          <Text color="green"> kodebase validate --fix</Text>
          <Text color="gray"> Validate and auto-fix safe issues</Text>
          <Text></Text>
          <Text color="green"> kodebase validate --json</Text>
          <Text color="gray"> Validate and output JSON for automation</Text>
        </Box>
      );
    }

    const fix = restArgs.includes('--fix');
    const format = restArgs.includes('--json') ? 'json' : 'formatted';
    const path = restArgs.find((arg) => !arg.startsWith('--'));

    return <Validate fix={fix} path={path} format={format} />;
  }

  // Handle deps command (experimental)
  if (resolvedCommand === 'deps') {
    // Check for help flag
    if (restArgs.includes('--help') || restArgs.includes('-h')) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            kodebase deps (experimental)
          </Text>
          <Text>Analyze artifact dependency tree and impact relationships</Text>
          <Text></Text>
          <Text bold>Usage:</Text>
          <Text>
            {' '}
            kodebase deps &lt;artifact-id&gt; [--json] --experimental
          </Text>
          <Text></Text>
          <Text bold>Options:</Text>
          <Text> --json Output dependency analysis in JSON format</Text>
          <Text> --experimental Enable experimental features (required)</Text>
          <Text></Text>
          <Text bold>Arguments:</Text>
          <Text>
            {' '}
            artifact-id The ID of the artifact to analyze (e.g., A.1.5, D.2, C)
          </Text>
          <Text></Text>
          <Text bold>Description:</Text>
          <Text>This experimental command provides:</Text>
          <Text>• Complete dependency tree with blocking relationships</Text>
          <Text>• Circular dependency detection and warnings</Text>
          <Text>• Impact analysis showing affected artifacts</Text>
          <Text>• Critical path identification for project planning</Text>
          <Text></Text>
          <Text bold>Examples:</Text>
          <Text color="green"> kodebase deps A.1.5 --experimental</Text>
          <Text color="gray"> Analyze dependencies for issue A.1.5</Text>
          <Text></Text>
          <Text color="green"> kodebase deps D.2 --json --experimental</Text>
          <Text color="gray"> Output dependency analysis in JSON format</Text>
          <Text></Text>
          <Text bold>Notes:</Text>
          <Text> • This is an experimental feature and may change</Text>
          <Text> • Requires --experimental flag to enable</Text>
          <Text> • Analysis includes recursive dependency traversal</Text>
        </Box>
      );
    }

    // Check for experimental flag requirement
    if (!restArgs.includes('--experimental')) {
      throw new ValidationError(
        'experimental-flag',
        'deps',
        'The deps command requires --experimental flag',
        {
          suggestions: [
            {
              action: 'Enable experimental features',
              command: `kodebase deps ${restArgs[0] || '<artifact-id>'} --experimental`,
              description: 'Add --experimental flag to use this feature',
            },
            {
              action: 'Get help',
              command: 'kodebase deps --help',
              description: 'Learn more about the deps command',
            },
          ],
        },
      );
    }

    if (
      restArgs.length === 0 ||
      !restArgs.find((arg) => !arg.startsWith('--'))
    ) {
      throw new ValidationError('artifact-id', '', 'Artifact ID is required', {
        suggestions: [
          {
            action: 'Provide an artifact ID',
            command: 'kodebase deps A.1.5 --experimental',
            description: 'Replace A.1.5 with your actual artifact ID',
          },
          {
            action: 'List available artifacts',
            command: 'kodebase list',
            description: 'See all available artifact IDs',
          },
          {
            action: 'Get help',
            command: 'kodebase deps --help',
            description: 'Learn more about the deps command',
          },
        ],
      });
    }

    const artifactId = restArgs.find((arg) => !arg.startsWith('--'));
    const format = restArgs.includes('--json') ? 'json' : 'formatted';

    if (!artifactId || artifactId.trim() === '') {
      throw new InvalidArtifactIdError(artifactId || '(empty)');
    }

    return <Deps artifactId={artifactId} format={format} verbose={verbose} />;
  }

  // Handle unknown commands
  throw new ValidationError(
    'command',
    resolvedCommand || 'unknown',
    'Unknown command',
    {
      suggestions: [
        {
          action: 'See available commands',
          command: 'kodebase --help (or kb --help)',
          description: 'List all available commands and options',
        },
        {
          action: 'Check command spelling',
          description:
            'Verify you typed the command correctly. Try "kb s", "kb c", or "kb l" for shortcuts',
        },
      ],
    },
  );
};

// Export the error-wrapped version of the App
export const App = withErrorHandler(AppComponent);
