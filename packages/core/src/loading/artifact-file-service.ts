/**
 * Low-level artifact file I/O operations.
 *
 * Provides read and write functions for artifact YAML files with
 * error handling and consistent formatting.
 *
 * @module artifact-file-service
 */

import fs from "node:fs/promises";

import yaml from "yaml";

/**
 * Read and parse an artifact YAML file.
 *
 * @param filePath - Absolute path to the artifact YAML file
 * @returns Parsed artifact data
 * @throws {Error} If file cannot be read or YAML is invalid
 *
 * @example
 * ```ts
 * import { readArtifact } from "@kodebase/core";
 *
 * const artifact = await readArtifact(".kodebase/artifacts/A.yml");
 * console.log(artifact.metadata.title);
 * ```
 */
export async function readArtifact<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    try {
      return yaml.parse(content) as T;
    } catch (parseError) {
      throw new Error(
        `Failed to parse artifact at ${filePath}: ${(parseError as Error).message}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to read artifact at ${filePath}: ${(error as Error).message}`,
    );
  }
}

/**
 * YAML serialization options for consistent formatting.
 * @internal
 */
const YAML_OPTIONS: yaml.ToStringOptions = {
  lineWidth: 0,
};

/**
 * Write artifact data to a YAML file.
 *
 * Serializes the artifact object to YAML with consistent formatting
 * (no line wrapping) and writes to the specified file path.
 *
 * @param filePath - Absolute path where the artifact should be written
 * @param data - Artifact data to serialize and write
 * @throws {Error} If serialization or write operation fails
 *
 * @example
 * ```ts
 * import { writeArtifact, scaffoldInitiative } from "@kodebase/core";
 *
 * const initiative = scaffoldInitiative({
 *   title: "Q1 Goals",
 *   priority: "high",
 *   estimation: "XL",
 *   actor: "Alice (alice@example.com)"
 * });
 *
 * await writeArtifact(".kodebase/artifacts/A.yml", initiative);
 * ```
 */
export async function writeArtifact(
  filePath: string,
  data: unknown,
): Promise<void> {
  try {
    const serialized = yaml.stringify(data, YAML_OPTIONS);
    await fs.writeFile(filePath, serialized, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to write artifact at ${filePath}: ${(error as Error).message}`,
    );
  }
}
