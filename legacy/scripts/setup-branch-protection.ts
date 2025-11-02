import { execSync } from 'node:child_process';
import { Octokit } from '@octokit/rest';

type BranchProtectionOptions = {
  owner?: string;
  repo?: string;
  branch: string;
  dryRun: boolean;
  enableAutoMerge: boolean;
};

type GitRemote = {
  owner: string;
  repo: string;
};

const DEFAULT_BRANCH = 'main';
const REQUIRED_STATUS_CHECKS = ['Artifact Validation'];
const REQUIRED_APPROVALS = 1;

function parseArgs(argv: string[]): BranchProtectionOptions {
  const options: BranchProtectionOptions = {
    branch: DEFAULT_BRANCH,
    dryRun: false,
    enableAutoMerge: true,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    const [key, value] = arg.includes('=')
      ? arg.split('=')
      : [arg, argv[index + 1]];

    switch (key) {
      case '--owner':
        options.owner = value;
        if (!arg.includes('=')) {
          index += 1;
        }
        break;
      case '--repo':
        options.repo = value;
        if (!arg.includes('=')) {
          index += 1;
        }
        break;
      case '--branch':
        options.branch = value ?? DEFAULT_BRANCH;
        if (!arg.includes('=')) {
          index += 1;
        }
        break;
      case '--dry-run':
      case '--dryRun':
        options.dryRun = true;
        break;
      case '--no-auto-merge':
        options.enableAutoMerge = false;
        break;
      default:
        break;
    }
  }

  const envOwner = process.env.GITHUB_OWNER;
  const envRepo = process.env.GITHUB_REPOSITORY?.split('/')?.[1];

  if (!options.owner && envOwner && envRepo) {
    options.owner = envOwner;
    options.repo = envRepo;
  }

  if (!options.owner || !options.repo) {
    const detected = detectGitRemote();
    if (detected) {
      options.owner = detected.owner;
      options.repo = detected.repo;
    }
  }

  if (!options.owner || !options.repo) {
    throw new Error(
      'Unable to determine repository owner and name. Provide --owner and --repo or configure git remote origin.',
    );
  }

  return options;
}

function detectGitRemote(): GitRemote | null {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
    }).trim();

    if (!remoteUrl) {
      return null;
    }

    if (remoteUrl.startsWith('git@')) {
      const match = remoteUrl.match(/git@[^:]+:([^/]+)\/(.+)\.git/);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    } else if (remoteUrl.startsWith('https://')) {
      const url = new URL(remoteUrl);
      const segments = url.pathname
        .replace(/^\//, '')
        .replace(/\.git$/, '')
        .split('/');
      if (segments.length === 2) {
        return { owner: segments[0], repo: segments[1] };
      }
    }
  } catch (error) {
    console.warn('Unable to detect git remote:', error);
  }

  return null;
}

async function ensureBranchProtection(
  octokit: Octokit,
  options: BranchProtectionOptions,
) {
  const { owner, repo, branch, dryRun } = options;

  if (!owner || !repo) {
    throw new Error('Missing repository owner or name.');
  }

  const payload = {
    owner,
    repo,
    branch,
    required_status_checks: {
      strict: true,
      contexts: REQUIRED_STATUS_CHECKS,
      checks: REQUIRED_STATUS_CHECKS.map((context) => ({
        app_id: null,
        context,
      })),
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: REQUIRED_APPROVALS,
      restrict_dismissals: false,
    },
    restrictions: null,
    required_conversation_resolution: true,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: false,
    required_linear_history: true,
  } as const;

  if (dryRun) {
    console.log('[dry-run] Would update branch protection with:', payload);
    return;
  }

  await octokit.request(
    'PUT /repos/{owner}/{repo}/branches/{branch}/protection',
    {
      ...payload,
      mediaType: {
        previews: ['luke-cage'],
      },
    },
  );

  console.log(`✓ Applied branch protection to ${owner}/${repo}@${branch}`);
  console.log(
    `  • Enforces status checks before merge: ${REQUIRED_STATUS_CHECKS.join(', ')}`,
  );
  console.log(
    '  • Validation workflow source: Issue I.2.1 Artifact Validation',
  );
}

async function enableAutoMerge(
  octokit: Octokit,
  options: BranchProtectionOptions,
) {
  const { owner, repo, dryRun, enableAutoMerge } = options;

  if (!owner || !repo) {
    throw new Error('Missing repository owner or name.');
  }

  if (!enableAutoMerge) {
    console.log('Auto-merge configuration skipped by flag.');
    return;
  }

  if (dryRun) {
    console.log('[dry-run] Would enable auto-merge for repository.');
    return;
  }

  await octokit.request('PATCH /repos/{owner}/{repo}', {
    owner,
    repo,
    allow_auto_merge: true,
  });

  console.log(`✓ Enabled auto-merge for ${owner}/${repo}`);
}

async function main() {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    throw new Error(
      'Set GITHUB_TOKEN (or GH_TOKEN) with permissions to manage branch protection.',
    );
  }

  const options = parseArgs(process.argv);
  const octokit = new Octokit({ auth: token });

  await ensureBranchProtection(octokit, options);
  await enableAutoMerge(octokit, options);

  console.log('✓ Branch protection setup complete.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to configure branch protection:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  });
}
