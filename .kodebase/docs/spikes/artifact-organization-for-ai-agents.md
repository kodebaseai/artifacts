# Spike: Artifact Organization for AI Agents

## Problem Statement

As Kodebase scales to handle hundreds of artifacts (initiatives, milestones, tickets), we need a directory structure that optimizes for both human navigation and AI agent context consumption. The critical challenge is providing AI agents with relevant context without overwhelming them with unnecessary files.

### Decision Criteria
1. **Cognitive Load**: Stay within Miller's Law (7±2 items per directory)
2. **AI Efficiency**: Minimize irrelevant files in agent context
3. **Developer Workflow**: Align with natural work patterns
4. **Scalability**: Handle 1000+ artifacts gracefully
5. **Tool Compatibility**: Avoid conflicts with IDE schemas

## Investigation Summary

### Research Activities
1. Academic literature review (12 papers on developer workflows and cognitive load)
2. Generated realistic test data (8 initiatives, 33 milestones, 341 tickets)
3. Built and tested multiple directory structures
4. Analyzed cognitive load and navigation patterns
5. Measured AI context efficiency

### Key Academic Findings
- Developers spend ~35% of time navigating code structure (Ko et al., 2006)
- Working memory limits affect comprehension (Miller, 1956)
- Issue context critical for productivity (Kersten & Murphy, 2006)

## Options Analysis

### Option A: Flat Structure (All artifacts in one directory)
```
artifacts/
├── A.initiative.yml
├── A.1.milestone.yml
├── A.1.1.ticket.yml
└── ... (400+ files)
```

**Pros:**
- Simple git operations
- No deep nesting
- Fast file access

**Cons:**
- ❌ Cognitive overload (400+ files)
- ❌ No visual hierarchy
- ❌ Difficult to archive completed work
- ❌ AI must process all files for any query

### Option B: Milestone-Oriented Structure
```
artifacts/
└── A/
    ├── A.initiative.yml
    ├── A.1/
    │   ├── A.1.milestone.yml
    │   └── A.1.*.ticket.yml (8-15 files)
    └── A.2/
```

**Pros:**
- ✅ Natural work grouping
- ✅ Excellent cognitive chunking (8-15 files per folder)
- ✅ Surgical AI context provision
- ✅ Easy archival by milestone

**Cons:**
- Three levels of nesting
- Slightly more complex navigation

### Option C: Type-Oriented Structure
```
artifacts/
└── A/
    ├── A.initiative.yml
    ├── milestones/
    │   └── A.*.milestone.yml (3-5 files)
    └── tickets/
        └── A.*.ticket.yml (30-60 files)
```

**Pros:**
- Clean separation by type
- Consistent depth
- Familiar pattern

**Cons:**
- ❌ Tickets directory becomes unwieldy (60+ files)
- ❌ Work split across type directories
- ❌ AI must process entire tickets folder
- ❌ Complex archival process

### Option D: Bucketed Scale Structure (Future)
```
artifacts/
├── A...Z/     (current initiatives)
└── AA...AZ/   (when we exceed Z)
```

**Purpose:** Handle massive scale beyond 26 initiatives

## Test Results

### Generated Test Data
- 8 Initiatives (A-H)
- 33 Milestones
- 341 Tickets
- Total: 382 artifact files

### Critical Finding: AI Context Efficiency

When providing context for ticket A.3.8:

**Milestone-Oriented (Option B):**
- Files provided: 10 (A.3/* only)
- Relevance: 100%
- Tokens: ~150 lines

**Type-Oriented (Option C):**
- Files provided: 32-61 (entire tickets folder)
- Relevance: 3-10%
- Tokens: ~900 lines (6x more)

### Cognitive Load Analysis

| Structure | Root Items | Per Initiative | Per Work Unit |
|-----------|------------|----------------|---------------|
| Flat (A)  | 400+ ❌    | N/A            | N/A           |
| Milestone (B) | 8 ✅   | 4-6 ✅         | 8-15 ✅       |
| Type (C)  | 8 ✅       | 3 ✅           | 30-60 ⚠️      |

## Decision

**Selected: Option B (Milestone-Oriented Structure)**

### Rationale

1. **AI Efficiency**: Enables "surgical context provision" - agents receive only relevant files
2. **Cognitive Load**: Every directory stays within 7±2 item limit
3. **Natural Workflow**: Aligns with how developers actually work (by milestone)
4. **Maintenance**: Simple archival of completed milestones
5. **Scalability**: Combines well with bucketing for future growth

### Key Insight

The slightly "messier" structure (mixing types within milestone folders) is actually cleaner for both humans and AI because it respects natural work boundaries.

## Implementation Path

### Immediate Actions
1. Update `.kodebase/artifacts/` to use milestone-oriented structure
2. Modify artifact creation commands to maintain structure
3. Update MCP context builder to leverage milestone boundaries

### Future Considerations
1. Implement bucketing system when approaching 26 initiatives
2. Add tooling to reorganize artifacts if structure changes
3. Monitor actual usage patterns to validate assumptions

## Validation Metrics

- [ ] AI token usage reduced by 3-6x
- [ ] Developer navigation time decreased
- [ ] Context relevance above 90%
- [ ] No cognitive overload complaints
- [ ] Successful scaling to 1000+ artifacts

## Lessons Learned

1. **Test with real data**: Abstract discussions missed the 60+ file problem
2. **Consider the primary consumer**: AI agents have different needs than humans
3. **Natural boundaries matter**: Work-based grouping beats type-based sorting
4. **Measure everything**: Cognitive load, token usage, navigation patterns

## References

### Research Artifacts
- Full research available in: `/ARTIFACT-STRUCTURE-SPIKE/`
- Test scripts: `generate-structure-b-milestone.sh`, `generate-structure-c-type.sh`
- Comparison analysis: `alpha-comparison.md`

### Academic Papers

1. **Ko, A. J., Myers, B. A., Coblenz, M. J., & Aung, H. H. (2006)**. An Exploratory Study of How Developers Seek, Relate, and Collect Relevant Information during Software Maintenance Issues. *IEEE Transactions on Software Engineering*, 32(12), 971-987.

2. **Sillito, J., Murphy, G. C., & De Volder, K. (2008)**. Questions Programmers Ask During Software Evolution Issues. *Proceedings of ICSE '08*, 23-34.

3. **Murphy, G. C., Kersten, M., & Findlater, L. (2006)**. How Are Java Software Developers Using the Eclipse IDE? *IEEE Software*, 23(4), 76-83.

4. **Kersten, M., & Murphy, G. C. (2006)**. Using Issue Context to Improve Programmer Productivity. *Proceedings of FSE '06*, 1-11.

5. **LaToza, T. D., & Myers, B. A. (2010)**. Developers Ask Reachability Questions. *Proceedings of ICSE '10*, 185-194.

6. **Parnin, C., & Rugaber, S. (2011)**. Resumption Strategies for Interrupted Programming Issues. *Proceedings of ICPC '11*, 93-102.

7. **Fritz, T., Murphy, G. C., Murphy-Hill, E., Ou, J., & Hill, E. (2014)**. Developers' Code Context Models for Change Issues. *Proceedings of FSE '14*, 7-18.

8. **Miller, G. A. (1956)**. The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information. *Psychological Review*, 63(2), 81-97.

9. **Sweller, J. (1988)**. Cognitive Load During Problem Solving: Effects on Learning. *Cognitive Science*, 12(2), 257-285.

10. **DeLine, R., Czerwinski, M., & Robertson, G. (2005)**. Information Needs in Collocated Software Development Teams. *Proceedings of ICSE '05*, 344-353.

11. **Robillard, M. P., Coelho, W., & Murphy, G. C. (2004)**. How Effective Developers Investigate Source Code: An Exploratory Study. *IEEE Transactions on Software Engineering*, 30(12), 889-903.

12. **Rugaber, S. (2000)**. The Use of Domain Knowledge in Program Understanding. *Annals of Software Engineering*, 9(1), 143-192.

---

*Spike completed: January 6, 2025*
*Decision implemented in: kodebase v0.1.0*
