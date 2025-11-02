/**
 * CI helper that validates artifact updates using the existing CLI and state machine logic.
 * The GitHub workflow feeds changed artifact paths to this script so we can reuse the
 * established `kodebase validate` command while adding explicit state transition checks.
 */
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, relative, join } from 'node:path';
import process from 'node:process';
import { homedir } from 'node:os';
import { parse } from 'yaml';
import {
  ArtifactValidator,
  validateEventOrder,
  type ArtifactType,
  type EventMetadata,
} from '@kodebase/core';

interface CliValidationSummary {
  totalArtifacts: number;
  validArtifacts: number;
  invalidArtifacts: number;
  duration: number;
  success: boolean;
}

interface CliValidationResult {
  summary: CliValidationSummary;
  globalErrors: unknown[];
  artifactResults: Array<{
    artifactId: string;
    artifactType: string;
    isValid: boolean;
    errors: unknown[];
  }>;
}

interface ValidationReport {
  filePath: string;
  relativePath: string;
  issueId?: string;
  cli: CliValidationResult;
  stateMachine: {
    artifactType: ArtifactType;
    eventCount: number;
  };
}

const validator = new ArtifactValidator();

function spawnCommand(
  command: string,
  args: string[],
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | null;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0', TERM: 'dumb' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      rejectPromise(error);
    });

    child.on('close', (code) => {
      resolvePromise({ stdout, stderr, exitCode: code });
    });
  });
}

function extractJsonPayload(output: string): unknown {
  const firstBrace = output.indexOf('{');
  const lastBrace = output.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Unable to locate JSON payload in CLI output');
  }

  const jsonPayload = output.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonPayload);
}

async function runCliValidation(
  filePath: string,
): Promise<CliValidationResult> {
  const commandArgs = [
    '--filter',
    '@kodebase/cli',
    'exec',
    '--',
    'node',
    'dist/index.js',
    'validate',
    filePath,
    '--json',
  ];

  const { stdout, stderr, exitCode } = await spawnCommand('pnpm', commandArgs);

  if (exitCode !== 0) {
    const messageParts = [
      `kodebase validate exited with code ${exitCode}`,
      stderr.trim() ? `stderr:\n${stderr.trim()}` : undefined,
      stdout.trim() ? `stdout:\n${stdout.trim()}` : undefined,
    ].filter(Boolean);

    throw new Error(messageParts.join('\n\n'));
  }

  try {
    return extractJsonPayload(stdout.trim()) as CliValidationResult;
  } catch (error) {
    throw new Error(
      `Failed to parse kodebase validate output for ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }\nRaw output:\n${stdout}`,
    );
  }
}

async function validateStateMachine(filePath: string) {
  const absolutePath = resolve(filePath);
  const yamlContent = await fs.readFile(absolutePath, 'utf8');
  const artifactData = parse(yamlContent);

  const artifactType = validator.getArtifactType(artifactData);
  if (!artifactType) {
    throw new Error(`Unable to determine artifact type for ${filePath}`);
  }

  const artifact = validator.validate(artifactData);
  const events = artifact.metadata.events as EventMetadata[];

  validateEventOrder(events, artifactType);

  return {
    artifactType,
    eventCount: events.length,
  };
}

async function appendSummary(reportLines: string[]) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  await fs.appendFile(summaryPath, `${reportLines.join('\n')}\n`, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('No artifact files provided. Skipping validation.');
    return;
  }

  await ensureCliConfig();

  const issueId = process.env.PR_ISSUE_ID;
  const workspaceRoot = process.cwd();
  const reports: ValidationReport[] = [];

  for (const rawPath of args) {
    const absolutePath = resolve(rawPath);
    const relativePath = relative(workspaceRoot, absolutePath);

    const cliResult = await runCliValidation(absolutePath);

    if (!cliResult.summary?.success) {
      throw new Error(
        `kodebase validate reported failures for ${relativePath}: ${JSON.stringify(
          cliResult,
          null,
          2,
        )}`,
      );
    }

    const stateMachineReport = await validateStateMachine(absolutePath);

    reports.push({
      filePath: absolutePath,
      relativePath,
      issueId: issueId || undefined,
      cli: cliResult,
      stateMachine: stateMachineReport,
    });
  }

  const headerLine = issueId
    ? `✅ Artifact validation succeeded for ${issueId}`
    : '✅ Artifact validation succeeded';

  const summaryLines = [headerLine];

  for (const report of reports) {
    summaryLines.push(
      `- ${report.relativePath}: schema/readiness ${report.cli.summary.success ? 'passed' : 'failed'} in ${report.cli.summary.duration}ms; state machine passed (${report.stateMachine.eventCount} events, ${report.stateMachine.artifactType})`,
    );
  }

  await writeReport(reports, {
    headerLine,
    issueId: issueId || null,
    summaryLines,
  });

  console.log(summaryLines.join('\n'));
  await appendSummary(summaryLines);
}

main().catch((error) => {
  console.error('✗ Artifact validation failed');
  console.error(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

async function ensureCliConfig(): Promise<void> {
  const configDir = join(homedir(), '.config', 'kodebase');
  const configPath = join(configDir, 'config.json');

  try {
    await fs.access(configPath);
    return;
  } catch {
    // File doesn't exist, create default config below
  }

  const defaultConfig = {
    setupCompleted: true,
    version: '1.0.0',
    preferences: {
      outputFormat: 'json',
      verbosity: 'quiet',
    },
  };

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(
    configPath,
    JSON.stringify(defaultConfig, null, 2),
    'utf8',
  );
}

interface PersistedReportSummary {
  headerLine: string;
  issueId: string | null;
  summaryLines: string[];
}

async function writeReport(
  reports: ValidationReport[],
  summary: PersistedReportSummary,
): Promise<void> {
  const reportPath = process.env.VALIDATION_REPORT_PATH;

  if (!reportPath) {
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    issueId: summary.issueId,
    summary: summary.summaryLines,
    reports: reports.map((report) => ({
      filePath: report.filePath,
      relativePath: report.relativePath,
      issueId: report.issueId,
      cli: report.cli,
      stateMachine: report.stateMachine,
    })),
  };

  await fs.writeFile(
    reportPath,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  );
}
