import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ArtifactLoader } from './artifact-loader.js';

/**
 * Utility for completion-related artifact operations
 * Provides fast artifact ID scanning for shell auto-completion
 */
export class ArtifactCompletionScanner {
  private loader: ArtifactLoader;
  private artifactsRoot: string;

  constructor(artifactsRoot: string = '.kodebase/artifacts') {
    this.loader = new ArtifactLoader(artifactsRoot);
    this.artifactsRoot = artifactsRoot;
  }

  /**
   * Get all artifact IDs for completion suggestions
   * Optimized for performance - only scans filesystem, no parsing
   * @returns Promise<string[]> - Array of artifact IDs
   */
  async getAllArtifactIds(): Promise<string[]> {
    const artifactIds: string[] = [];

    try {
      const initiativeFolders = await readdir(this.artifactsRoot);

      for (const initiativeFolder of initiativeFolders) {
        if (!initiativeFolder.includes('.')) continue;

        const initiativeId = initiativeFolder.split('.')[0];
        if (!initiativeId) continue;

        // Add initiative ID
        artifactIds.push(initiativeId);

        const initiativePath = join(this.artifactsRoot, initiativeFolder);

        try {
          // Load milestone folders
          const milestoneItems = await readdir(initiativePath);
          const milestoneFolders = milestoneItems.filter(
            (item) => item.includes('.') && !item.endsWith('.yml'),
          );

          for (const milestoneFolder of milestoneFolders) {
            const milestoneId = milestoneFolder
              .split('.')
              .slice(0, 2)
              .join('.');

            // Add milestone ID
            artifactIds.push(milestoneId);

            const milestonePath = join(initiativePath, milestoneFolder);

            try {
              // Load issue files
              const issueFiles = await readdir(milestonePath);
              const issueYmlFiles = issueFiles.filter(
                (file) =>
                  file.endsWith('.yml') && file !== `${milestoneId}.yml`,
              );

              for (const issueFile of issueYmlFiles) {
                const issueId = issueFile
                  .replace('.yml', '')
                  .split('.')
                  .slice(0, 3)
                  .join('.');

                // Add issue ID
                artifactIds.push(issueId);
              }
            } catch {
              // Skip if milestone directory cannot be read
            }
          }
        } catch {
          // Skip if initiative directory cannot be read
        }
      }
    } catch {
      // Return empty array if artifacts directory doesn't exist
      return [];
    }

    // Sort for consistent output
    return artifactIds.sort();
  }

  /**
   * Get artifact IDs that match a partial input
   * @param partial - Partial artifact ID to match
   * @returns Promise<string[]> - Matching artifact IDs
   */
  async getMatchingArtifactIds(partial: string): Promise<string[]> {
    const allIds = await this.getAllArtifactIds();
    return allIds.filter((id) => id.startsWith(partial));
  }
}
