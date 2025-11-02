import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import {
  ArtifactLoader,
  type ArtifactSummary,
} from '../utils/artifact-loader.js';
import { fuzzyMatch } from '../utils/fuzzy-search.js';
import { StatusBadge } from './StatusBadge.js';

export interface ArtifactPickerProps {
  onSelect: (artifactId: string) => void;
  onCancel: () => void;
  filterType?: 'initiative' | 'milestone' | 'issue';
  filterStatus?: string[];
  placeholder?: string;
  maxVisible?: number;
  showPreview?: boolean;
  onPreviewChange?: (artifact: ArtifactSummary | null) => void;
}

interface FilteredArtifact extends ArtifactSummary {
  _fuzzyScore: number;
  _fuzzyMatches: { [key: string]: number[] };
}

/**
 * Interactive fuzzy-search artifact picker component
 *
 * Provides real-time filtering with keyboard navigation for selecting
 * artifacts from large lists. Follows existing CLI UI patterns.
 */
export function ArtifactPicker({
  onSelect,
  onCancel,
  filterType,
  filterStatus,
  placeholder = 'Search artifacts...',
  maxVisible = 10,
  showPreview: _showPreview = false,
  onPreviewChange,
}: ArtifactPickerProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputMode, setInputMode] = useState(true);
  const [lastSearchLength, setLastSearchLength] = useState(0);

  // Load artifacts on mount
  React.useEffect(() => {
    const loadArtifacts = async () => {
      try {
        const loader = new ArtifactLoader();
        const allArtifacts = await loader.loadAllArtifacts();

        // Apply type and status filters
        let filtered = allArtifacts;

        if (filterType) {
          filtered = filtered.filter(
            (artifact) => artifact.type === filterType,
          );
        }

        if (filterStatus && filterStatus.length > 0) {
          filtered = filtered.filter((artifact) =>
            filterStatus.includes(artifact.status),
          );
        }

        setArtifacts(filtered);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.error('Failed to load artifacts:', error);
      }
    };

    loadArtifacts();
  }, [filterType, filterStatus]);

  // Fuzzy search filtered results
  const filteredArtifacts = useMemo<FilteredArtifact[]>(() => {
    if (!searchTerm.trim()) {
      return artifacts.map((artifact) => ({
        ...artifact,
        _fuzzyScore: 0,
        _fuzzyMatches: {},
      }));
    }

    const results = artifacts.map((artifact) => {
      let bestScore = 0;
      const matches: { [key: string]: number[] } = {};

      // Search in ID
      const idMatch = fuzzyMatch(searchTerm, artifact.id);
      if (idMatch.score > bestScore) {
        bestScore = idMatch.score;
      }
      if (idMatch.score > 0) {
        matches.id = idMatch.matches;
      }

      // Search in title
      const titleMatch = fuzzyMatch(searchTerm, artifact.title);
      if (titleMatch.score > bestScore) {
        bestScore = titleMatch.score;
      }
      if (titleMatch.score > 0) {
        matches.title = titleMatch.matches;
      }

      // Search in type
      const typeMatch = fuzzyMatch(searchTerm, artifact.type);
      if (typeMatch.score > bestScore) {
        bestScore = typeMatch.score;
      }
      if (typeMatch.score > 0) {
        matches.type = typeMatch.matches;
      }

      return {
        ...artifact,
        _fuzzyScore: bestScore,
        _fuzzyMatches: matches,
      };
    });

    return results
      .filter((item) => item._fuzzyScore > 0)
      .sort((a, b) => b._fuzzyScore - a._fuzzyScore);
  }, [artifacts, searchTerm]);

  // Visible artifacts (for large lists)
  const visibleArtifacts = useMemo(() => {
    return filteredArtifacts.slice(0, maxVisible);
  }, [filteredArtifacts, maxVisible]);

  // Reset selection when search changes
  React.useEffect(() => {
    if (searchTerm.length !== lastSearchLength) {
      setSelectedIndex(0);
      setLastSearchLength(searchTerm.length);
    }
  });

  // Notify parent of preview changes
  React.useEffect(() => {
    if (onPreviewChange) {
      const selectedArtifact = visibleArtifacts[selectedIndex] || null;
      onPreviewChange(selectedArtifact);
    }
  }, [selectedIndex, visibleArtifacts, onPreviewChange]);

  // Handle keyboard input
  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (inputMode) {
      // In search input mode
      if (key.downArrow && visibleArtifacts.length > 0) {
        setInputMode(false);
        setSelectedIndex(0);
      }
    } else {
      // In navigation mode
      if (key.upArrow) {
        if (selectedIndex === 0) {
          setInputMode(true);
        } else {
          setSelectedIndex(Math.max(0, selectedIndex - 1));
        }
      } else if (key.downArrow) {
        setSelectedIndex(
          Math.min(visibleArtifacts.length - 1, selectedIndex + 1),
        );
      } else if (key.return) {
        const selectedArtifact = visibleArtifacts[selectedIndex];
        if (selectedArtifact) {
          onSelect(selectedArtifact.id);
        }
      } else if (key.escape) {
        onCancel();
      } else {
        // Return to search mode for other keys
        setInputMode(true);
      }
    }
  });

  const renderArtifactLine = useCallback(
    (artifact: FilteredArtifact, index: number) => {
      const isSelected = !inputMode && index === selectedIndex;
      const prefix = isSelected ? '› ' : '  ';

      // Calculate indentation based on artifact level
      const indent = '  '.repeat(artifact.level);

      return (
        <Box key={artifact.id}>
          <Text color={isSelected ? 'cyan' : 'white'}>
            {prefix}
            {indent}
            {artifact.id}
          </Text>
          <Text color="gray"> - </Text>
          <Text color={isSelected ? 'white' : 'gray'} wrap="truncate">
            {artifact.title}
          </Text>
          <Text> </Text>
          <StatusBadge status={artifact.status} />
        </Box>
      );
    },
    [inputMode, selectedIndex],
  );

  if (loading) {
    return (
      <Box>
        <Text color="yellow">Loading artifacts...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Search Input */}
      <Box>
        <Text color="cyan">Search: </Text>
        {inputMode ? (
          <TextInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={placeholder}
          />
        ) : (
          <Text color="gray">{searchTerm || placeholder}</Text>
        )}
      </Box>

      {/* Results Count */}
      <Box marginY={1}>
        <Text color="gray">
          {filteredArtifacts.length} artifact
          {filteredArtifacts.length !== 1 ? 's' : ''}
          {filteredArtifacts.length > maxVisible && ` (showing ${maxVisible})`}
        </Text>
      </Box>

      {/* Artifact List */}
      <Box flexDirection="column">
        {visibleArtifacts.length > 0 ? (
          visibleArtifacts.map((artifact, index) =>
            renderArtifactLine(artifact, index),
          )
        ) : (
          <Text color="gray">No artifacts found</Text>
        )}
      </Box>

      {/* Help Text */}
      <Box marginTop={1}>
        <Text color="gray">
          {inputMode
            ? '↓ to navigate • ESC to cancel'
            : '↑↓ to navigate • ENTER to select • ESC to cancel'}
        </Text>
      </Box>
    </Box>
  );
}
