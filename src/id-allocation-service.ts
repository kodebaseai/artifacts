import { loadAllArtifactPaths, loadArtifactsByType } from "@kodebase/core";

/**
 * Service for allocating unique IDs for Kodebase artifacts.
 *
 * This service generates sequential IDs following the Kodebase naming convention:
 * - Initiatives: Single or multiple uppercase letters (A, B, ..., Z, AA, AB, ...)
 * - Milestones: Initiative ID followed by a numeric suffix (A.1, A.2, B.1, ...)
 * - Issues: Milestone ID followed by a numeric suffix (A.1.1, A.1.2, B.2.1, ...)
 *
 * The service scans existing artifacts in the filesystem to determine the next
 * available ID, ensuring no conflicts occur.
 *
 * @example
 * ```ts
 * const service = new IdAllocationService("/path/to/.kodebase/artifacts");
 *
 * // Allocate next initiative ID (if highest is B, returns C)
 * const initiativeId = await service.allocateNextInitiativeId();
 * console.log(initiativeId); // "C"
 *
 * // Allocate next milestone for initiative B (if highest is B.3, returns B.4)
 * const milestoneId = await service.allocateNextMilestoneId("B");
 * console.log(milestoneId); // "B.4"
 *
 * // Allocate next issue for milestone B.4 (if highest is B.4.2, returns B.4.3)
 * const issueId = await service.allocateNextIssueId("B.4");
 * console.log(issueId); // "B.4.3"
 * ```
 *
 * @see {@link ScaffoldingService} for creating artifacts with allocated IDs
 */
export class IdAllocationService {
  /**
   * Creates a new ID allocation service.
   *
   * @param artifactsRoot - Absolute path to the artifacts directory (typically `.kodebase/artifacts`)
   */
  constructor(private readonly artifactsRoot: string) {}

  /**
   * Allocates the next available initiative ID.
   *
   * Scans all existing initiatives in the artifacts directory and returns the next
   * sequential ID in the series A, B, ..., Z, AA, AB, ..., AZ, BA, BB, etc.
   * If no initiatives exist, returns "A".
   *
   * @returns The next available initiative ID
   *
   * @example
   * ```ts
   * const service = new IdAllocationService("/path/to/.kodebase/artifacts");
   *
   * // First initiative
   * const firstId = await service.allocateNextInitiativeId();
   * console.log(firstId); // "A"
   *
   * // After A-Z are used, moves to two letters
   * const id27 = await service.allocateNextInitiativeId();
   * console.log(id27); // "AA"
   * ```
   *
   * @see {@link allocateNextMilestoneId} for allocating milestone IDs within an initiative
   */
  async allocateNextInitiativeId(): Promise<string> {
    const allPaths = await loadAllArtifactPaths(this.artifactsRoot);
    const initiativeIds = loadArtifactsByType(allPaths, "initiative");

    if (initiativeIds.length === 0) {
      return "A";
    }

    const highestId = this.findHighestInitiativeId(initiativeIds);
    return this.incrementInitiativeId(highestId);
  }

  /**
   * Allocates the next available milestone ID for a given initiative.
   *
   * Scans all existing milestones under the specified initiative and returns the next
   * sequential numeric ID. Milestones are numbered starting from 1 (e.g., A.1, A.2, A.3).
   * If no milestones exist for the initiative, returns `{parentId}.1`.
   *
   * @param parentId - The initiative ID (e.g., "A", "B", "AA")
   * @returns The next available milestone ID for the initiative
   * @throws {Error} If the parentId is not a valid initiative ID format
   *
   * @example
   * ```ts
   * const service = new IdAllocationService("/path/to/.kodebase/artifacts");
   *
   * // First milestone for initiative A
   * const firstMilestone = await service.allocateNextMilestoneId("A");
   * console.log(firstMilestone); // "A.1"
   *
   * // If A.1, A.2 exist, allocates A.3
   * const thirdMilestone = await service.allocateNextMilestoneId("A");
   * console.log(thirdMilestone); // "A.3"
   *
   * // Works with multi-letter initiatives too
   * const milestone = await service.allocateNextMilestoneId("AA");
   * console.log(milestone); // "AA.1"
   * ```
   *
   * @see {@link allocateNextInitiativeId} for allocating initiative IDs
   * @see {@link allocateNextIssueId} for allocating issue IDs within a milestone
   */
  async allocateNextMilestoneId(parentId: string): Promise<string> {
    this.validateInitiativeId(parentId);

    const allPaths = await loadAllArtifactPaths(this.artifactsRoot);
    const allMilestoneIds = loadArtifactsByType(allPaths, "milestone");

    const milestoneIds = allMilestoneIds.filter((id) =>
      id.startsWith(`${parentId}.`),
    );

    if (milestoneIds.length === 0) {
      return `${parentId}.1`;
    }

    const highestNumber = Math.max(
      ...milestoneIds.map((id) => {
        const parts = id.split(".");
        const lastPart = parts[parts.length - 1];
        if (!lastPart) throw new Error(`Invalid milestone ID: ${id}`);
        return Number.parseInt(lastPart, 10);
      }),
    );

    return `${parentId}.${highestNumber + 1}`;
  }

  /**
   * Allocates the next available issue ID for a given milestone.
   *
   * Scans all existing issues under the specified milestone and returns the next
   * sequential numeric ID. Issues are numbered starting from 1 (e.g., A.1.1, A.1.2, A.1.3).
   * If no issues exist for the milestone, returns `{parentId}.1`.
   *
   * @param parentId - The milestone ID (e.g., "A.1", "B.2", "AA.5")
   * @returns The next available issue ID for the milestone
   * @throws {Error} If the parentId is not a valid milestone ID format
   *
   * @example
   * ```ts
   * const service = new IdAllocationService("/path/to/.kodebase/artifacts");
   *
   * // First issue for milestone A.1
   * const firstIssue = await service.allocateNextIssueId("A.1");
   * console.log(firstIssue); // "A.1.1"
   *
   * // If A.1.1, A.1.2, A.1.3 exist, allocates A.1.4
   * const fourthIssue = await service.allocateNextIssueId("A.1");
   * console.log(fourthIssue); // "A.1.4"
   *
   * // Works with multi-letter initiatives too
   * const issue = await service.allocateNextIssueId("AA.2");
   * console.log(issue); // "AA.2.1"
   * ```
   *
   * @see {@link allocateNextMilestoneId} for allocating milestone IDs
   */
  async allocateNextIssueId(parentId: string): Promise<string> {
    this.validateMilestoneId(parentId);

    const allPaths = await loadAllArtifactPaths(this.artifactsRoot);
    const allIssueIds = loadArtifactsByType(allPaths, "issue");

    const issueIds = allIssueIds.filter((id) => id.startsWith(`${parentId}.`));

    if (issueIds.length === 0) {
      return `${parentId}.1`;
    }

    const highestNumber = Math.max(
      ...issueIds.map((id) => {
        const parts = id.split(".");
        const lastPart = parts[parts.length - 1];
        if (!lastPart) throw new Error(`Invalid issue ID: ${id}`);
        return Number.parseInt(lastPart, 10);
      }),
    );

    return `${parentId}.${highestNumber + 1}`;
  }

  /**
   * Finds the highest initiative ID from an array of IDs.
   *
   * Sorts by length first (longer IDs are higher), then alphabetically.
   * For example: Z < AA < AB < AZ < BA.
   *
   * @param ids - Array of initiative IDs to search
   * @returns The highest initiative ID
   * @throws {Error} If the array is empty
   * @internal
   */
  private findHighestInitiativeId(ids: string[]): string {
    const sorted = ids.sort((a, b) => {
      if (a.length !== b.length) {
        return b.length - a.length;
      }
      return b.localeCompare(a);
    });
    const highest = sorted[0];
    if (!highest) throw new Error("Cannot find highest ID from empty array");
    return highest;
  }

  /**
   * Increments an initiative ID to the next value in the sequence.
   *
   * Uses base-26 conversion where A=1, B=2, ..., Z=26, AA=27, AB=28, etc.
   *
   * @param id - The initiative ID to increment
   * @returns The next initiative ID in sequence
   * @internal
   */
  private incrementInitiativeId(id: string): string {
    let num = this.letterIdToNumber(id);
    num++;
    return this.numberToLetterId(num);
  }

  /**
   * Converts a letter-based ID to its numeric equivalent.
   *
   * Uses base-26 encoding where A=1, B=2, ..., Z=26, AA=27, AB=28, etc.
   * This is similar to Excel column naming.
   *
   * @param id - Letter-based ID (e.g., "A", "Z", "AA", "AB")
   * @returns Numeric representation (1-based)
   * @internal
   */
  private letterIdToNumber(id: string): number {
    let result = 0;
    for (let i = 0; i < id.length; i++) {
      const charValue = id.charCodeAt(i) - 64;
      result = result * 26 + charValue;
    }
    return result;
  }

  /**
   * Converts a numeric value to its letter-based ID equivalent.
   *
   * Uses base-26 encoding where 1=A, 2=B, ..., 26=Z, 27=AA, 28=AB, etc.
   * This is similar to Excel column naming.
   *
   * @param num - Numeric value (1-based, must be positive)
   * @returns Letter-based ID (e.g., "A", "Z", "AA", "AB")
   * @internal
   */
  private numberToLetterId(num: number): string {
    let result = "";
    let n = num;

    while (n > 0) {
      const remainder = (n - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      n = Math.floor((n - 1) / 26);
    }

    return result;
  }

  /**
   * Validates that a string is a valid initiative ID format.
   *
   * Valid formats: A-Z, AA-ZZ, AAA-ZZZ, etc. (one or more uppercase letters).
   *
   * @param id - The ID to validate
   * @throws {Error} If the ID format is invalid
   * @internal
   */
  private validateInitiativeId(id: string): void {
    if (!/^[A-Z]+$/.test(id)) {
      throw new Error(
        `Invalid initiative ID: ${id}. Must be uppercase letters only (A-Z, AA-ZZ, etc.)`,
      );
    }
  }

  /**
   * Validates that a string is a valid milestone ID format.
   *
   * Valid formats: A.1, B.2, AA.10, etc. (initiative ID followed by dot and number).
   *
   * @param id - The ID to validate
   * @throws {Error} If the ID format is invalid
   * @internal
   */
  private validateMilestoneId(id: string): void {
    if (!/^[A-Z]+\.\d+$/.test(id)) {
      throw new Error(
        `Invalid milestone ID: ${id}. Must be in format <initiative>.<number> (e.g., A.1, AA.2)`,
      );
    }
  }
}
