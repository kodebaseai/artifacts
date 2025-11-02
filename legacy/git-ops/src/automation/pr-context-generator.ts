/**
 * PR Context Generator for LLM-guided description creation
 *
 * This module provides intelligent context generation for PR descriptions
 * instead of static templates. It analyzes the actual implementation work
 * and provides guidance for LLMs to create dynamic, relevant PR descriptions.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  type Artifact,
  CContextLevel,
  type TContextLevel,
} from '@kodebase/core';
import { ArtifactLoader } from '../hooks/artifact-loader';

/**
 * Options for PR context generation
 */
export interface PRContextOptions {
  /** Repository path */
  repoPath: string;
  /** Artifact ID to generate context for */
  artifactId: string;
  /** Context level */
  contextLevel?: TContextLevel;
}

/**
 * Git analysis information
 */
export interface GitAnalysis {
  /** Current branch name */
  currentBranch: string;
  /** Number of commits for this issue */
  commitCount: number;
  /** Recent commits for this issue */
  recentCommits: string[];
  /** Files changed */
  filesChanged: string[];
  /** Change statistics */
  changeStats: string;
}

/**
 * Development insights extracted from artifact
 */
export interface DevelopmentInsights {
  /** Key insights from completion analysis */
  keyInsights: string[];
  /** Implementation approach */
  implementationApproach: string;
  /** Knowledge generated */
  knowledgeGenerated: string;
  /** Challenges encountered */
  challengesEncountered: Array<{
    challenge: string;
    solution: string;
  }>;
}

/**
 * Complete PR context for LLM guidance
 */
export interface PRContext {
  /** Artifact information */
  artifact: Artifact;
  /** Git analysis */
  gitAnalysis: GitAnalysis;
  /** Development insights */
  developmentInsights: DevelopmentInsights;
  /** LLM guidance template */
  llmGuidance: string;
}

/**
 * PR Context Generator class
 */
export class PRContextGenerator {
  private artifactLoader: ArtifactLoader;

  constructor() {
    this.artifactLoader = new ArtifactLoader();
  }

  /**
   * Generate comprehensive PR context for LLM guidance
   */
  async generateContext(options: PRContextOptions): Promise<PRContext> {
    const { repoPath, artifactId, contextLevel = 'full' } = options;

    // Load artifact
    const artifact = await this.artifactLoader.loadArtifact(
      artifactId,
      repoPath,
    );

    // Analyze git information
    const gitAnalysis = this.analyzeGitInformation(artifactId, repoPath);

    // Extract development insights
    const developmentInsights = this.extractDevelopmentInsights(artifact);

    // Generate LLM guidance
    const llmGuidance = this.generateLLMGuidance(contextLevel);

    return {
      artifact,
      gitAnalysis,
      developmentInsights,
      llmGuidance,
    };
  }

  /**
   * Generate PR context using the shell script (for command-line usage)
   */
  async generateContextWithScript(options: PRContextOptions): Promise<string> {
    const { repoPath, artifactId, contextLevel = 'full' } = options;

    const scriptPath = join(repoPath, 'scripts', 'get-pr-context.sh');

    if (!existsSync(scriptPath)) {
      throw new Error(`PR context script not found: ${scriptPath}`);
    }

    try {
      const contextLevelFlag =
        contextLevel === CContextLevel.MINIMAL
          ? '--minimal'
          : contextLevel === CContextLevel.EXTENDED
            ? '--extended'
            : '';

      const command = `bash "${scriptPath}" ${artifactId} ${contextLevelFlag}`;

      const output = execSync(command, {
        cwd: repoPath,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      return output.trim();
    } catch (error) {
      throw new Error(
        `Failed to generate PR context: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Analyze git information for the given artifact
   */
  private analyzeGitInformation(
    artifactId: string,
    repoPath: string,
  ): GitAnalysis {
    try {
      // Get current branch
      const currentBranch =
        execSync('git branch --show-current', {
          cwd: repoPath,
          encoding: 'utf-8',
        }).trim() || 'unknown';

      // Get commit count for this issue
      const commitOutput = execSync(
        `git log --oneline --grep="${artifactId}:"`,
        {
          cwd: repoPath,
          encoding: 'utf-8',
        },
      );
      const commitCount = commitOutput.trim()
        ? commitOutput.trim().split('\n').length
        : 0;

      // Get recent commits
      const recentCommitsOutput = execSync(
        `git log --oneline --grep="${artifactId}:" -10`,
        {
          cwd: repoPath,
          encoding: 'utf-8',
        },
      );
      const recentCommits = recentCommitsOutput.trim()
        ? recentCommitsOutput.trim().split('\n')
        : [];

      // Get files changed
      let filesChanged: string[] = [];
      try {
        const filesOutput = execSync(
          'git diff --name-only origin/main...HEAD',
          {
            cwd: repoPath,
            encoding: 'utf-8',
          },
        );
        filesChanged = filesOutput.trim()
          ? filesOutput.trim().split('\n').slice(0, 10)
          : [];
      } catch {
        // Ignore errors for file diff
      }

      // Get change statistics
      let changeStats = 'No changes detected';
      try {
        const statsOutput = execSync('git diff --stat origin/main...HEAD', {
          cwd: repoPath,
          encoding: 'utf-8',
        });
        const lines = statsOutput.trim().split('\n');
        changeStats = lines[lines.length - 1] || 'No changes detected';
      } catch {
        // Ignore errors for stats
      }

      return {
        currentBranch,
        commitCount,
        recentCommits,
        filesChanged,
        changeStats,
      };
    } catch (_error) {
      // Return default values if git analysis fails
      return {
        currentBranch: 'unknown',
        commitCount: 0,
        recentCommits: [],
        filesChanged: [],
        changeStats: 'No changes detected',
      };
    }
  }

  /**
   * Extract development insights from artifact
   */
  private extractDevelopmentInsights(artifact: Artifact): DevelopmentInsights {
    const insights: DevelopmentInsights = {
      keyInsights: [],
      implementationApproach: '',
      knowledgeGenerated: '',
      challengesEncountered: [],
    };

    // Extract from completion analysis if available
    const completionAnalysis = (artifact as unknown as Record<string, unknown>)
      .completion_analysis as Record<string, unknown> | undefined;
    if (completionAnalysis) {
      if (completionAnalysis.key_insights) {
        if (typeof completionAnalysis.key_insights === 'string') {
          insights.keyInsights = [completionAnalysis.key_insights];
        } else if (Array.isArray(completionAnalysis.key_insights)) {
          insights.keyInsights = completionAnalysis.key_insights;
        }
      }

      if (typeof completionAnalysis.implementation_approach === 'string') {
        insights.implementationApproach =
          completionAnalysis.implementation_approach;
      }

      if (typeof completionAnalysis.knowledge_generated === 'string') {
        insights.knowledgeGenerated = completionAnalysis.knowledge_generated;
      }
    }

    // Extract from development process if available
    const developmentProcess = (artifact as unknown as Record<string, unknown>)
      .development_process as Record<string, unknown> | undefined;
    if (developmentProcess?.challenges_encountered) {
      const challenges = developmentProcess.challenges_encountered;
      if (Array.isArray(challenges)) {
        for (const challenge of challenges) {
          if (
            typeof challenge === 'object' &&
            challenge.challenge &&
            challenge.solution
          ) {
            insights.challengesEncountered.push({
              challenge: challenge.challenge,
              solution: challenge.solution,
            });
          }
        }
      }
    }

    return insights;
  }

  /**
   * Generate LLM guidance for PR description creation
   */
  private generateLLMGuidance(_contextLevel: string): string {
    return `
# LLM Guidance for PR Description Creation

## Template Structure

Use this exact structure for the PR description, adapting content based on the actual implementation:

\`\`\`markdown
## Summary

[Dynamic summary combining artifact title with actual implementation insights]

### ✅ All Acceptance Criteria Met

[List acceptance criteria from artifact, marking all as completed with **bold** formatting]

### 🔧 Key Enhancements

[List actual enhancements made during implementation - analyze git commits and development insights]

### 📋 Implementation Details

[Extract from completion_analysis.key_insights or generate based on code changes and git analysis]

### 🔄 Development Notes

[Extract from development_process.challenges_encountered if available]

### 🧪 Testing

[Describe testing approach and results based on implementation]

### 🔄 Integration with @kodebase/core

[Describe integration points with core functionality]

### 📁 Files Changed

[List key files modified with brief descriptions from git analysis]

🤖 Generated with [Claude Code](https://claude.ai/code)
\`\`\`

## Content Generation Instructions

1. **Summary**: Combine artifact title with implementation insights
2. **Acceptance Criteria**: Use artifact data, format as \`- **criterion**\`
3. **Key Enhancements**: Analyze commits and insights for actual work done
4. **Implementation Details**: Extract from completion_analysis or infer from changes
5. **Development Notes**: Use challenges_encountered from development_process
6. **Testing**: Describe actual testing approach used
7. **Integration**: Identify @kodebase/core integration points
8. **Files Changed**: List modified files with context

## Analysis Guidelines

- Review git commit history to understand development journey
- Extract insights from artifact's completion_analysis and development_process
- Focus on actual implementation work, not just planned work
- Use file changes to understand scope of work
- Maintain established template structure with dynamic content
- Ensure all acceptance criteria are marked as met
`;
  }

  /**
   * Check if artifact exists
   */
  artifactExists(artifactId: string, repoPath: string): boolean {
    return this.artifactLoader.artifactExists(artifactId, repoPath);
  }
}
