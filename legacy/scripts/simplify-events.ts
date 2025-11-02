import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parseDocument, YAMLMap, YAMLSeq } from 'yaml';

const ARTIFACTS_ROOT = path.resolve('.kodebase/artifacts');

interface ArtifactInfo {
  id: string;
  filePath: string;
  parentId?: string;
}

function deriveArtifactId(fileName: string): string {
  const base = fileName.replace(/\.yml$/, '');
  const segments = base.split('.');
  const idSegments: string[] = [];
  for (const segment of segments) {
    if (segment.length === 0) {
      continue;
    }
    if (idSegments.length === 0) {
      idSegments.push(segment);
      continue;
    }
    if (/^[0-9]+$/.test(segment)) {
      idSegments.push(segment);
      continue;
    }
    break;
  }
  return idSegments.join('.');
}

function collectArtifacts(
  dir: string,
  artifacts: ArtifactInfo[] = [],
): ArtifactInfo[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectArtifacts(entryPath, artifacts);
    } else if (entry.isFile() && entry.name.endsWith('.yml')) {
      const id = deriveArtifactId(entry.name);
      const parts = id.split('.');
      const parentId =
        parts.length > 1 ? parts.slice(0, -1).join('.') : undefined;
      artifacts.push({ id, filePath: entryPath, parentId });
    }
  }
  return artifacts;
}

const artifacts = collectArtifacts(ARTIFACTS_ROOT);
const childrenMap = new Map<string, string[]>();
for (const artifact of artifacts) {
  if (artifact.parentId) {
    const list = childrenMap.get(artifact.parentId) ?? [];
    list.push(artifact.id);
    childrenMap.set(artifact.parentId, list);
  }
}
for (const [parentId, list] of childrenMap) {
  list.sort();
  childrenMap.set(parentId, list);
}

function removeDeprecatedMetadata(
  metadata: Record<string, unknown> | undefined,
) {
  if (!metadata) return undefined;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key === 'correlation_id' || key === 'parent_event_id') {
      continue;
    }
    cleaned[key] = value;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function determineTrigger(
  eventType: string,
  artifactId: string,
  metadata: Record<string, unknown> | undefined,
): string | undefined {
  switch (eventType) {
    case 'draft':
      return 'artifact_created';
    case 'blocked':
      return 'has_dependencies';
    case 'ready':
      return 'dependencies_met';
    case 'cancelled':
      return 'cancelled';
    case 'archived':
      return 'archived';
    case 'completed':
      return 'pr_merged';
    case 'in_progress': {
      if (metadata && 'branch_created' in metadata) {
        return 'branch_created';
      }
      const partsCount = artifactId.split('.').length;
      if (partsCount <= 2) {
        const children = childrenMap.get(artifactId);
        if (children && children.length > 0) {
          return `child_started:${children[0]}`;
        }
        return 'child_started';
      }
      return 'branch_created';
    }
    case 'in_review': {
      const partsCount = artifactId.split('.').length;
      if (partsCount >= 3) {
        return 'pr_created';
      }
      return 'children_completed';
    }
    default:
      return undefined;
  }
}

let updatedCount = 0;
const filesWithChanges: string[] = [];

for (const artifact of artifacts) {
  const originalContent = readFileSync(artifact.filePath, 'utf8');
  const doc = parseDocument(originalContent);
  const metadataNode = doc.get('metadata');
  if (!(metadataNode instanceof YAMLMap)) {
    continue;
  }
  const eventsNode = metadataNode.get('events');
  if (!(eventsNode instanceof YAMLSeq)) {
    continue;
  }

  let blockedByIds: string[] = [];
  const relationshipsNode = metadataNode.get('relationships');
  if (relationshipsNode instanceof YAMLMap) {
    const blockedByNode = relationshipsNode.get('blocked_by');
    if (blockedByNode instanceof YAMLSeq) {
      blockedByIds = blockedByNode.items
        .map((item) =>
          typeof item === 'object' && item !== null && 'toJSON' in item
            ? (item as any).toJSON()
            : item,
        )
        .map((value) => String(value))
        .filter((value) => value.length > 0);
    }
  }

  let mutated = false;
  const newItems = eventsNode.items.map((item) => {
    if (!(item instanceof YAMLMap)) {
      return item;
    }

    const eventType = item.get('event');
    if (typeof eventType !== 'string') {
      return item;
    }

    const timestamp = item.get('timestamp');
    const actor = item.get('actor');
    const existingTrigger = item.get('trigger');
    const metadataNodeValue = item.get('metadata');
    let metadataObj: Record<string, unknown> | undefined;
    if (metadataNodeValue instanceof YAMLMap) {
      metadataObj = metadataNodeValue.toJSON() as Record<string, unknown>;
    }

    let cleanedMetadata = removeDeprecatedMetadata(metadataObj);

    if (eventType === 'blocked' && blockedByIds.length > 0) {
      const alreadyHasBlocking =
        cleanedMetadata && 'blocking_dependencies' in cleanedMetadata;
      if (!alreadyHasBlocking) {
        const dependencies = blockedByIds.map((id) => ({
          artifact_id: id,
          resolved: false,
        }));
        cleanedMetadata = {
          ...(cleanedMetadata ?? {}),
          blocking_dependencies: dependencies,
        };
      }
    }

    const map = new YAMLMap();
    map.set('event', eventType);
    if (typeof timestamp !== 'undefined') {
      map.set('timestamp', timestamp);
    }
    if (typeof actor !== 'undefined') {
      map.set('actor', actor);
    }

    let triggerValue: string | undefined;
    if (typeof existingTrigger === 'string') {
      triggerValue = existingTrigger;
      if (
        existingTrigger.startsWith('child_started:<') &&
        existingTrigger.endsWith('>')
      ) {
        triggerValue = `child_started:${existingTrigger.slice('child_started:<'.length, -1)}`;
        mutated = true;
      }
    } else {
      triggerValue = determineTrigger(eventType, artifact.id, cleanedMetadata);
      if (triggerValue) {
        mutated = true;
      }
    }

    if (triggerValue) {
      map.set('trigger', triggerValue);
    }

    if (cleanedMetadata) {
      map.set('metadata', doc.createNode(cleanedMetadata));
    }

    const hadEventId = item.get('event_id') !== undefined;
    const metadataHadDeprecated =
      metadataObj &&
      ('correlation_id' in metadataObj || 'parent_event_id' in metadataObj);
    const metadataChanged = cleanedMetadata
      ? true
      : metadataObj && !cleanedMetadata;

    if (hadEventId || metadataHadDeprecated || metadataChanged) {
      mutated = true;
    }

    return map;
  });

  if (!mutated) {
    continue;
  }

  eventsNode.items = newItems;
  const newContent = doc.toString();
  if (newContent !== originalContent) {
    writeFileSync(artifact.filePath, newContent);
    updatedCount += 1;
    filesWithChanges.push(artifact.filePath);
  }
}

console.log(`Updated ${updatedCount} artifact files.`);
if (filesWithChanges.length > 0) {
  console.log('Modified files:');
  for (const file of filesWithChanges) {
    console.log(` - ${path.relative(process.cwd(), file)}`);
  }
}
