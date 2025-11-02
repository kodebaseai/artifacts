# Design Notes: Artifacts Package

**Status**: Research Notes
**Created**: 2025-11-02
**Audience**: Future implementers

---

## Artifact Folder Scalability Strategy

### Problem

For large teams and long-lasting projects, the `.kodebase/artifacts/` folder can grow very large. IDE tree/file displays have performance issues with:
- Hundreds of top-level folders
- New artifacts appearing at the end of alphabetically sorted lists
- Deep nesting with many siblings

### Solution: Time-Based Grouping (Auto-Archive Pattern)

As the initiative ID space grows, automatically group older artifacts into range folders to maintain IDE performance and discoverability.

**Pattern discovered through**:
- Performance testing on large artifact trees (100+ initiatives)
- Research papers on file system organization (specific paper name: TBD)
- Empirical IDE performance observations

### Grouping Rules (Future Implementation)

**Phase 1: Flat Structure (A-Z)**
```
.kodebase/artifacts/
├── A.initiative-slug/
├── B.initiative-slug/
├── C.initiative-slug/
...
└── Z.initiative-slug/
```
- **Trigger**: None (default layout)
- **Count**: 26 initiatives
- **Performance**: Excellent (all IDEs handle this well)

**Phase 2: First Grouping (AA introduced)**
```
.kodebase/artifacts/
├── [A-Z]/           # Archived: 26 initiatives grouped
│   ├── A.initiative-slug/
│   ├── B.initiative-slug/
│   ...
│   └── Z.initiative-slug/
├── AA.initiative-slug/
├── AB.initiative-slug/
...
└── AZ.initiative-slug/
```
- **Trigger**: When `AA` initiative is created
- **Action**: Move A-Z into `[A-Z]/` folder (27 elements total inside)
- **Count**: 1 archived group + 26 active initiatives

**Phase 3: Second Grouping (BA introduced)**
```
.kodebase/artifacts/
├── [A-Z]/           # First archive
├── [AA-AZ]/         # Second archive: 26 initiatives grouped
│   ├── AA.initiative-slug/
│   ├── AB.initiative-slug/
│   ...
│   └── AZ.initiative-slug/
├── BA.initiative-slug/
├── BB.initiative-slug/
...
└── BZ.initiative-slug/
```
- **Trigger**: When `BA` initiative is created
- **Action**: Move AA-AZ into `[AA-AZ]/` folder
- **Pattern**: Continues indefinitely

### Key Benefits

1. **IDE Performance**: Top-level folder count stays ≤ 27 (1 archive + 26 active)
2. **Discoverability**: Recent/active initiatives always visible at top level
3. **Historical Access**: Older initiatives archived but still accessible
4. **Automatic**: No manual intervention required
5. **Scalable**: Pattern works for 100s or 1000s of initiatives

### Implementation Considerations (Future)

**When to implement**:
- Not in Initiative B (Artifacts Package) - too early
- Likely in Initiative C (CLI Package) or later
- Consider as enhancement when first customer reports performance issues

**Where to implement**:
- Likely in `@kodebase/artifacts` ArtifactService or ContextService
- Could be CLI-level operation (separate `kodebase archive` command)
- Could be automatic during `kodebase add` when threshold reached

**Edge cases to consider**:
1. **Active work in archived initiative**: Should archived folders be "reopened"?
2. **Cross-initiative dependencies**: How to display relationships across archives?
3. **Git conflicts**: Folder moves might conflict with active branches
4. **IDE indexing**: Does this break IDE search/navigation?
5. **Backward compatibility**: How to handle old projects without archives?

**Validation approach**:
- Performance benchmarks with 100, 500, 1000 initiatives
- IDE testing (VSCode, IntelliJ, Vim, etc.)
- User testing with real teams

### Research References

**Papers/Articles** (to be filled in):
- TBD: Locate original paper on file system organization patterns
- TBD: IDE tree rendering performance studies

**Performance Testing** (from legacy Kodebase research):
- 26 initiatives: No performance impact
- 52+ initiatives: VSCode tree rendering slows down
- 100+ initiatives: Noticeable lag in file navigation
- With grouping (27 top-level): Performance restored

### Alternative Approaches Considered

**❌ Alternative 1: Date-based folders**
```
.kodebase/artifacts/
├── 2025/
│   ├── 01-january/
│   └── 02-february/
```
- **Rejected**: Breaks ID continuity, harder to navigate

**❌ Alternative 2: Manual archiving**
```
.kodebase/artifacts/
├── active/
└── archive/
```
- **Rejected**: Requires human intervention, unclear rules

**❌ Alternative 3: Nested by tens**
```
.kodebase/artifacts/
├── A-J/
├── K-T/
└── U-Z/
```
- **Rejected**: Arbitrary grouping, doesn't scale with time

### Decision Criteria

The time-based grouping pattern was selected because:
1. **Temporal alignment**: Recent work is naturally more relevant
2. **Predictable thresholds**: Grouping happens at clear boundaries (A-Z, AA-AZ, etc.)
3. **Minimal disruption**: Only affects older, less-active initiatives
4. **Scalable**: Pattern works indefinitely without rule changes

### Status

**Current**: Research note only - not yet implemented
**Next Steps**:
1. Locate and cite original research paper
2. Add to Initiative C (CLI) or D (Extension) scope
3. Create RFC when ready to implement

---

## Related Documents

- [Artifacts Package Spec](./artifacts-package-spec.md)
- [Planning Document](./planning.md)
