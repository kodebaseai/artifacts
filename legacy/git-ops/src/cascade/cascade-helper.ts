/**
 * Cascade Helper for Git Operations
 *
 * Handles intelligent cascading logic for parent-child artifact relationships.
 * Determines when parent artifacts should transition based on child states.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Artifact, TArtifactEvent } from '@kodebase/core';
import {
  canTransition,
  getCurrentState,
  performTransition,
} from '@kodebase/core';
import { glob } from 'glob';
import { stringify as dumpYaml, parse as loadYaml } from 'yaml';

/**
 * Cascade analysis result
 */
export interface CascadeAnalysis {
  shouldCascade: boolean;
  targetState: string;
  reason: string;
  parentArtifactId: string;
  childArtifactIds: string[];
}

/**
 * Cascade helper utilities
 */

// biome-ignore lint/complexity/noStaticOnlyClass: Makes sense for consistency
export class CascadeHelper {
  /**
   * Check if milestone should cascade to in_progress when first issue starts
   */
  static async checkMilestoneInProgressCascade(
    issueId: string,
    repoRoot: string,
    _actor: string,
  ): Promise<CascadeAnalysis | null> {
    try {
      // Extract milestone ID from issue ID (e.g., A.1.5 -> A.1)
      const milestoneId = CascadeHelper.extractMilestoneId(issueId);
      if (!milestoneId) {
        return null;
      }

      // Find milestone artifact
      const milestoneArtifact = await CascadeHelper.findArtifact(
        milestoneId,
        repoRoot,
      );
      if (!milestoneArtifact) {
        return null;
      }

      const milestoneStatus = getCurrentState(
        milestoneArtifact.metadata.events,
      );

      // Only cascade if milestone is in 'ready' state
      if (milestoneStatus !== 'ready') {
        return null;
      }

      // Check if this is the first issue in the milestone to start
      const milestoneIssues = await CascadeHelper.findMilestoneIssues(
        milestoneId,
        repoRoot,
      );
      const inProgressIssues = milestoneIssues.filter((issue) => {
        const status = getCurrentState(issue.metadata.events);
        return status === 'in_progress';
      });

      // If no other issues are in progress, this is the first one
      if (inProgressIssues.length === 0) {
        return {
          shouldCascade: true,
          targetState: 'in_progress',
          reason: `First issue ${issueId} in milestone ${milestoneId} started`,
          parentArtifactId: milestoneId,
          childArtifactIds: milestoneIssues.map((issue) =>
            CascadeHelper.extractArtifactId(issue),
          ),
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking milestone cascade:', error);
      return null;
    }
  }

  /**
   * Check if initiative should cascade to in_progress when first milestone starts
   */
  static async checkInitiativeInProgressCascade(
    milestoneId: string,
    repoRoot: string,
    _actor: string,
  ): Promise<CascadeAnalysis | null> {
    try {
      // Extract initiative ID from milestone ID (e.g., A.1 -> A)
      const initiativeId = CascadeHelper.extractInitiativeId(milestoneId);
      if (!initiativeId) {
        return null;
      }

      // Find initiative artifact
      const initiativeArtifact = await CascadeHelper.findArtifact(
        initiativeId,
        repoRoot,
      );
      if (!initiativeArtifact) {
        return null;
      }

      const initiativeStatus = getCurrentState(
        initiativeArtifact.metadata.events,
      );

      // Only cascade if initiative is in 'ready' state
      if (initiativeStatus !== 'ready') {
        return null;
      }

      // Check if this is the first milestone in the initiative to start
      const initiativeMilestones = await CascadeHelper.findInitiativeMilestones(
        initiativeId,
        repoRoot,
      );
      const inProgressMilestones = initiativeMilestones.filter((milestone) => {
        const status = getCurrentState(milestone.metadata.events);
        return status === 'in_progress';
      });

      // If no other milestones are in progress, this is the first one
      if (inProgressMilestones.length === 0) {
        return {
          shouldCascade: true,
          targetState: 'in_progress',
          reason: `First milestone ${milestoneId} in initiative ${initiativeId} started`,
          parentArtifactId: initiativeId,
          childArtifactIds: initiativeMilestones.map((milestone) =>
            CascadeHelper.extractArtifactId(milestone),
          ),
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking initiative cascade:', error);
      return null;
    }
  }

  /**
   * Check if milestone should cascade to completed when last issue completes
   */
  static async checkMilestoneCompletionCascade(
    issueId: string,
    repoRoot: string,
    _actor: string,
  ): Promise<CascadeAnalysis | null> {
    try {
      // Extract milestone ID from issue ID
      const milestoneId = CascadeHelper.extractMilestoneId(issueId);
      if (!milestoneId) {
        return null;
      }

      // Find milestone artifact
      const milestoneArtifact = await CascadeHelper.findArtifact(
        milestoneId,
        repoRoot,
      );
      if (!milestoneArtifact) {
        return null;
      }

      const milestoneStatus = getCurrentState(
        milestoneArtifact.metadata.events,
      );

      // Only cascade if milestone is in 'in_progress' state
      if (milestoneStatus !== 'in_progress') {
        return null;
      }

      // Check if all issues in the milestone are completed
      const milestoneIssues = await CascadeHelper.findMilestoneIssues(
        milestoneId,
        repoRoot,
      );
      const completedIssues = milestoneIssues.filter((issue) => {
        const status = getCurrentState(issue.metadata.events);
        return status === 'completed';
      });

      // If all issues are completed, milestone should be completed
      if (
        completedIssues.length === milestoneIssues.length &&
        milestoneIssues.length > 0
      ) {
        return {
          shouldCascade: true,
          targetState: 'completed',
          reason: `All issues in milestone ${milestoneId} completed`,
          parentArtifactId: milestoneId,
          childArtifactIds: milestoneIssues.map((issue) =>
            CascadeHelper.extractArtifactId(issue),
          ),
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking milestone completion cascade:', error);
      return null;
    }
  }

  /**
   * Check if initiative should cascade to completed when last milestone completes
   */
  static async checkInitiativeCompletionCascade(
    milestoneId: string,
    repoRoot: string,
    _actor: string,
  ): Promise<CascadeAnalysis | null> {
    try {
      // Extract initiative ID from milestone ID
      const initiativeId = CascadeHelper.extractInitiativeId(milestoneId);
      if (!initiativeId) {
        return null;
      }

      // Find initiative artifact
      const initiativeArtifact = await CascadeHelper.findArtifact(
        initiativeId,
        repoRoot,
      );
      if (!initiativeArtifact) {
        return null;
      }

      const initiativeStatus = getCurrentState(
        initiativeArtifact.metadata.events,
      );

      // Only cascade if initiative is in 'in_progress' state
      if (initiativeStatus !== 'in_progress') {
        return null;
      }

      // Check if all milestones in the initiative are completed
      const initiativeMilestones = await CascadeHelper.findInitiativeMilestones(
        initiativeId,
        repoRoot,
      );
      const completedMilestones = initiativeMilestones.filter((milestone) => {
        const status = getCurrentState(milestone.metadata.events);
        return status === 'completed';
      });

      // If all milestones are completed, initiative should be completed
      if (
        completedMilestones.length === initiativeMilestones.length &&
        initiativeMilestones.length > 0
      ) {
        return {
          shouldCascade: true,
          targetState: 'completed',
          reason: `All milestones in initiative ${initiativeId} completed`,
          parentArtifactId: initiativeId,
          childArtifactIds: initiativeMilestones.map((milestone) =>
            CascadeHelper.extractArtifactId(milestone),
          ),
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking initiative completion cascade:', error);
      return null;
    }
  }

  /**
   * Perform cascade transition
   */
  static async performCascade(
    analysis: CascadeAnalysis,
    repoRoot: string,
    actor: string,
    triggerReason: string,
  ): Promise<void> {
    try {
      // Find and load the parent artifact
      const parentArtifact = await CascadeHelper.findArtifact(
        analysis.parentArtifactId,
        repoRoot,
      );
      if (!parentArtifact) {
        throw new Error(
          `Parent artifact ${analysis.parentArtifactId} not found`,
        );
      }

      // Check if transition is valid
      if (
        !canTransition(parentArtifact, analysis.targetState as TArtifactEvent)
      ) {
        throw new Error(
          `Cannot transition ${analysis.parentArtifactId} to ${analysis.targetState}`,
        );
      }

      // Perform the transition
      performTransition(
        parentArtifact,
        analysis.targetState as TArtifactEvent,
        actor,
        {
          cascade_reason: analysis.reason,
          trigger_source: triggerReason,
        },
      );

      // Save the updated artifact
      await CascadeHelper.saveArtifact(
        parentArtifact,
        analysis.parentArtifactId,
        repoRoot,
      );

      console.log(
        `Cascade completed: ${analysis.parentArtifactId} → ${analysis.targetState}`,
      );
    } catch (error) {
      console.error('Error performing cascade:', error);
      throw error;
    }
  }

  /**
   * Extract milestone ID from issue ID (e.g., A.1.5 -> A.1)
   */
  private static extractMilestoneId(issueId: string): string | null {
    const match = issueId.match(/^([A-Z]\.\d+)\.\d+$/);
    return match?.[1] ?? null;
  }

  /**
   * Extract initiative ID from milestone ID (e.g., A.1 -> A)
   */
  private static extractInitiativeId(milestoneId: string): string | null {
    const match = milestoneId.match(/^([A-Z])\.\d+$/);
    return match?.[1] ?? null;
  }

  /**
   * Extract artifact ID from artifact object
   */
  private static extractArtifactId(artifact: Artifact): string {
    // This is a simplified extraction - in practice, you might need to parse the filename
    // For now, we'll use the title or a pattern match
    const filename = artifact.metadata?.title || '';
    const match = filename.match(/^([A-Z](?:\.\d+)*)/);
    return match?.[1] ?? 'unknown';
  }

  /**
   * Find artifact by ID
   */
  private static async findArtifact(
    artifactId: string,
    repoRoot: string,
  ): Promise<Artifact | null> {
    try {
      // Look for artifact files matching the ID
      const pattern = join(
        repoRoot,
        '.kodebase',
        'artifacts',
        '**',
        `${artifactId}*.yml`,
      );
      const files = await glob(pattern);

      if (files.length === 0) {
        return null;
      }

      // Use the first match
      const filePath = files[0];
      if (!filePath) {
        return null;
      }

      const content = readFileSync(filePath, 'utf-8');
      return loadYaml(content) as Artifact;
    } catch (error) {
      console.error(`Error finding artifact ${artifactId}:`, error);
      return null;
    }
  }

  /**
   * Find all issues in a milestone
   */
  private static async findMilestoneIssues(
    milestoneId: string,
    repoRoot: string,
  ): Promise<Artifact[]> {
    try {
      // Look for issue files matching the milestone pattern
      const pattern = join(
        repoRoot,
        '.kodebase',
        'artifacts',
        '**',
        `${milestoneId}.*.yml`,
      );
      const files = await glob(pattern);

      const issues: Artifact[] = [];
      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8');
          const artifact = loadYaml(content) as Artifact;
          issues.push(artifact);
        } catch (error) {
          console.error(`Error reading issue file ${file}:`, error);
        }
      }

      return issues;
    } catch (error) {
      console.error(
        `Error finding milestone issues for ${milestoneId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Find all milestones in an initiative
   */
  private static async findInitiativeMilestones(
    initiativeId: string,
    repoRoot: string,
  ): Promise<Artifact[]> {
    try {
      // Look for milestone files matching the initiative pattern
      const pattern = join(
        repoRoot,
        '.kodebase',
        'artifacts',
        `${initiativeId}.*`,
        `${initiativeId}.*.yml`,
      );
      const files = await glob(pattern);

      const milestones: Artifact[] = [];
      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8');
          const artifact = loadYaml(content) as Artifact;
          milestones.push(artifact);
        } catch (error) {
          console.error(`Error reading milestone file ${file}:`, error);
        }
      }

      return milestones;
    } catch (error) {
      console.error(
        `Error finding initiative milestones for ${initiativeId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Save artifact to file
   */
  private static async saveArtifact(
    artifact: Artifact,
    artifactId: string,
    repoRoot: string,
  ): Promise<void> {
    try {
      // Find the artifact file
      const pattern = join(
        repoRoot,
        '.kodebase',
        'artifacts',
        '**',
        `${artifactId}*.yml`,
      );
      const files = await glob(pattern);

      if (files.length === 0) {
        throw new Error(`Artifact file not found for ${artifactId}`);
      }

      // Save to the first match
      const filePath = files[0];
      if (!filePath) {
        throw new Error(`Artifact file path is undefined for ${artifactId}`);
      }

      const yamlContent = dumpYaml(artifact);

      writeFileSync(filePath, yamlContent, 'utf-8');
    } catch (error) {
      console.error(`Error saving artifact ${artifactId}:`, error);
      throw error;
    }
  }
}
