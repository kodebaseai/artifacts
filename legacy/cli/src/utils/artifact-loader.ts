import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ArtifactParser, type ArtifactSchema } from '@kodebase/core';

/**
 * Utility for loading artifacts by ID from the filesystem
 */
export class ArtifactLoader {
  private parser: ArtifactParser;
  private artifactsRoot: string;

  constructor(artifactsRoot: string = '.kodebase/artifacts') {
    this.parser = new ArtifactParser();
    this.artifactsRoot = artifactsRoot;
  }

  /**
   * Load an artifact by its ID
   * @param artifactId - The artifact ID (e.g., 'D.1.3', 'A.1', 'B')
   * @returns Promise<ArtifactSchema> - The parsed artifact
   * @throws Error if artifact not found or invalid
   */
  async loadArtifact(artifactId: string): Promise<ArtifactSchema> {
    const filePath = await this.findArtifactPath(artifactId);

    try {
      const content = await readFile(filePath, 'utf-8');

      // Determine artifact type based on ID pattern
      const type = this.determineArtifactType(artifactId);

      // Parse based on type
      switch (type) {
        case 'initiative':
          return this.parser.parseInitiative(content);
        case 'milestone':
          return this.parser.parseMilestone(content);
        case 'issue':
          return this.parser.parseIssue(content);
        default:
          throw new Error(`Unknown artifact type for ID: ${artifactId}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Artifact not found: ${artifactId}`);
      }
      throw error;
    }
  }

  /**
   * Get the file path for an artifact ID (public interface)
   * @param artifactId - The artifact ID
   * @returns Promise<string> - The file path
   */
  async getArtifactPath(artifactId: string): Promise<string> {
    return this.findArtifactPath(artifactId);
  }

  /**
   * Find the file path for an artifact ID by scanning the file system
   * @param artifactId - The artifact ID
   * @returns Promise<string> - The file path
   */
  private async findArtifactPath(artifactId: string): Promise<string> {
    const parts = artifactId.split('.');

    if (parts.length === 1) {
      // Initiative (e.g., 'D')
      const initiativeId = parts[0];
      const folders = await readdir(this.artifactsRoot);
      const initiativeFolder = folders.find((folder) =>
        folder.startsWith(`${initiativeId}.`),
      );

      if (!initiativeFolder) {
        throw new Error(`Initiative folder not found for ID: ${artifactId}`);
      }

      return join(this.artifactsRoot, initiativeFolder, `${initiativeId}.yml`);
    } else if (parts.length === 2) {
      // Milestone (e.g., 'D.1')
      const [initiativeId] = parts;
      const folders = await readdir(this.artifactsRoot);
      const initiativeFolder = folders.find((folder) =>
        folder.startsWith(`${initiativeId}.`),
      );

      if (!initiativeFolder) {
        throw new Error(`Initiative folder not found for ID: ${artifactId}`);
      }

      const milestoneFolders = await readdir(
        join(this.artifactsRoot, initiativeFolder),
      );
      const milestoneFolder = milestoneFolders.find((folder) =>
        folder.startsWith(`${artifactId}.`),
      );

      if (!milestoneFolder) {
        throw new Error(`Milestone folder not found for ID: ${artifactId}`);
      }

      return join(
        this.artifactsRoot,
        initiativeFolder,
        milestoneFolder,
        `${artifactId}.yml`,
      );
    } else if (parts.length === 3) {
      // Issue (e.g., 'D.1.3')
      const [initiativeId, milestoneNumber] = parts;
      const milestoneId = `${initiativeId}.${milestoneNumber}`;

      const folders = await readdir(this.artifactsRoot);
      const initiativeFolder = folders.find((folder) =>
        folder.startsWith(`${initiativeId}.`),
      );

      if (!initiativeFolder) {
        throw new Error(`Initiative folder not found for ID: ${artifactId}`);
      }

      const milestoneFolders = await readdir(
        join(this.artifactsRoot, initiativeFolder),
      );
      const milestoneFolder = milestoneFolders.find((folder) =>
        folder.startsWith(`${milestoneId}.`),
      );

      if (!milestoneFolder) {
        throw new Error(`Milestone folder not found for ID: ${artifactId}`);
      }

      const issueFiles = await readdir(
        join(this.artifactsRoot, initiativeFolder, milestoneFolder),
      );
      const issueFile = issueFiles.find(
        (file) => file.startsWith(`${artifactId}.`) && file.endsWith('.yml'),
      );

      if (!issueFile) {
        throw new Error(`Issue file not found for ID: ${artifactId}`);
      }

      return join(
        this.artifactsRoot,
        initiativeFolder,
        milestoneFolder,
        issueFile,
      );
    }

    throw new Error(`Invalid artifact ID format: ${artifactId}`);
  }

  /**
   * Load all artifacts from the filesystem
   * @returns Promise<ArtifactSummary[]> - Array of artifact summaries
   */
  async loadAllArtifacts(): Promise<ArtifactSummary[]> {
    const artifacts: ArtifactSummary[] = [];

    try {
      const initiativeFolders = await readdir(this.artifactsRoot);

      for (const initiativeFolder of initiativeFolders) {
        if (!initiativeFolder.includes('.')) continue;

        const initiativeId = initiativeFolder.split('.')[0];
        if (!initiativeId) continue;

        const initiativePath = join(this.artifactsRoot, initiativeFolder);

        // Load initiative
        try {
          const initiativeArtifact = await this.loadArtifact(initiativeId);

          artifacts.push({
            id: initiativeId,
            title: initiativeArtifact.metadata.title,
            type: 'initiative',
            status: this.getLatestStatus(initiativeArtifact.metadata.events),
            assignee: initiativeArtifact.metadata.assignee || 'Unassigned',
            level: 0,
          });
        } catch {
          // Skip if initiative file not found
        }

        // Load milestones
        const milestoneItems = await readdir(initiativePath);
        const milestoneFolders = milestoneItems.filter(
          (item) => item.includes('.') && !item.endsWith('.yml'),
        );

        for (const milestoneFolder of milestoneFolders) {
          const milestoneId = milestoneFolder.split('.').slice(0, 2).join('.');
          const milestonePath = join(initiativePath, milestoneFolder);

          // Load milestone
          try {
            const milestoneArtifact = await this.loadArtifact(milestoneId);

            artifacts.push({
              id: milestoneId,
              title: milestoneArtifact.metadata.title,
              type: 'milestone',
              status: this.getLatestStatus(milestoneArtifact.metadata.events),
              assignee: milestoneArtifact.metadata.assignee || 'Unassigned',
              level: 1,
            });
          } catch {
            // Skip if milestone file not found
          }

          // Load issues
          try {
            const issueFiles = await readdir(milestonePath);
            const issueYmlFiles = issueFiles.filter(
              (file) => file.endsWith('.yml') && file !== `${milestoneId}.yml`,
            );
            console.log(
              `📁 Found ${issueYmlFiles.length} issue files in ${milestoneId}:`,
              issueYmlFiles,
            );

            for (const issueFile of issueYmlFiles) {
              const issueId = issueFile
                .replace('.yml', '')
                .split('.')
                .slice(0, 3)
                .join('.');

              try {
                const issueArtifact = await this.loadArtifact(issueId);

                artifacts.push({
                  id: issueId,
                  title: issueArtifact.metadata.title,
                  type: 'issue',
                  status: this.getLatestStatus(issueArtifact.metadata.events),
                  assignee: issueArtifact.metadata.assignee || 'Unassigned',
                  level: 2,
                });
              } catch (error) {
                console.log(
                  `❌ Failed to load issue ${issueId}:`,
                  error instanceof Error ? error.message : error,
                );
              }
            }
          } catch {
            // Skip if milestone directory cannot be read
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to load artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return artifacts;
  }

  /**
   * Get the latest status from artifact events
   * @param events - Array of events
   * @returns The latest status
   */
  private getLatestStatus(
    events: Array<{ event: string; timestamp: string }>,
  ): string {
    if (events.length === 0) return 'draft';

    // Sort events by timestamp (newest first) and get the latest event
    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return sortedEvents[0]?.event || 'draft';
  }

  /**
   * Determine artifact type based on ID format
   * @param artifactId - The artifact ID
   * @returns The artifact type
   */
  private determineArtifactType(
    artifactId: string,
  ): 'initiative' | 'milestone' | 'issue' {
    const parts = artifactId.split('.');

    if (parts.length === 1) return 'initiative';
    if (parts.length === 2) return 'milestone';
    if (parts.length === 3) return 'issue';

    throw new Error(`Invalid artifact ID format: ${artifactId}`);
  }
}

/**
 * Interface for artifact summary used in list display
 */
export interface ArtifactSummary {
  id: string;
  title: string;
  type: 'initiative' | 'milestone' | 'issue';
  status: string;
  assignee: string;
  level: number; // For hierarchical display (0=initiative, 1=milestone, 2=issue)
}
