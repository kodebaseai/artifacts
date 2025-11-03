import { loadAllArtifactPaths, loadArtifactsByType } from "@kodebase/core";

export class IdAllocationService {
  constructor(private readonly artifactsRoot: string) {}

  async allocateNextInitiativeId(): Promise<string> {
    const allPaths = await loadAllArtifactPaths(this.artifactsRoot);
    const initiativeIds = loadArtifactsByType(allPaths, "initiative");

    if (initiativeIds.length === 0) {
      return "A";
    }

    const highestId = this.findHighestInitiativeId(initiativeIds);
    return this.incrementInitiativeId(highestId);
  }

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

  private incrementInitiativeId(id: string): string {
    let num = this.letterIdToNumber(id);
    num++;
    return this.numberToLetterId(num);
  }

  private letterIdToNumber(id: string): number {
    let result = 0;
    for (let i = 0; i < id.length; i++) {
      const charValue = id.charCodeAt(i) - 64;
      result = result * 26 + charValue;
    }
    return result;
  }

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

  private validateInitiativeId(id: string): void {
    if (!/^[A-Z]+$/.test(id)) {
      throw new Error(
        `Invalid initiative ID: ${id}. Must be uppercase letters only (A-Z, AA-ZZ, etc.)`,
      );
    }
  }

  private validateMilestoneId(id: string): void {
    if (!/^[A-Z]+\.\d+$/.test(id)) {
      throw new Error(
        `Invalid milestone ID: ${id}. Must be in format <initiative>.<number> (e.g., A.1, AA.2)`,
      );
    }
  }
}
