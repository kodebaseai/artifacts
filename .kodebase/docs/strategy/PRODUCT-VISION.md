# Kodebase Product Vision

> **Last Updated:** 2025-11-02
> **Status:** Living Document
> **Owner:** Miguel Carvalho

---

## Executive Summary

**Kodebase is a system to control AI work through structured artifacts, not just assist with development.**

It enables solo developers and small teams to govern, scope, and audit AI contributions while maintaining full oversight through:
- **Artifact-driven governance** - Work structured as initiatives → milestones → issues
- **Event-sourced audit trail** - Every state change tracked with actor attribution
- **AI as controlled executor** - Agents work within Constitutional boundaries
- **Local-first philosophy** - No vendor lock-in, full data ownership

The innovation is not "AI helps you code faster" but **"you define work artifacts → AI executes within bounds → you validate results"**.

---

## Product Positioning

### The Core Insight

**Traditional approach:** "Let AI help you code faster" (Copilot, Cursor, etc.)

**Kodebase approach:** "Define work artifacts with clear boundaries → AI executes as governed agent → Automatic audit trail"

### The Philosophical Shift

> **From:** "AI assists development"
> **To:** "Developers CONTROL what AI can do"

This shift is crucial. Kodebase is not another AI coding assistant. It's a **governance and execution framework** where:
- Humans define **what** needs to be done (artifacts with acceptance criteria)
- AI executes **how** within constitutional boundaries
- System tracks **who** did **what** and **when** (event sourcing)
- Humans validate results before merging

### What Makes Us Different

| Aspect               | Traditional AI Tools |                                  Kodebase |
|----------------------|----------------------|--------------------------------------------------|
| **Scope Control**    | Vague prompts        | Structured artifacts with acceptance criteria    |
| **Audit Trail**      | None                 | Event-sourced with actor attribution             |
| **Governance**       | None                 | Constitutional boundaries for AI                 |
| **Work Structure**   | Ad-hoc               | Hierarchical (initiatives → milestones → issues) |
| **Collaboration**    | Comments/chat        | Artifacts as contracts                           |
| **State Management** | Manual               | Automatic via git automation                     |

---

## MVP Definition

### Core Value Proposition

Enable developers to:
1. **Structure work** into artifacts (initiatives → milestones → issues)
2. **Generate context** for AI agents from artifacts
3. **Govern AI execution** within constitutional boundaries
4. **Track progress automatically** through git automation
5. **Visualize work** and agent contributions in VSCode
6. **Audit all changes** through event-sourced trail

### MVP Features

**For Solo Developers (Free Tier):**
- ✅ Create and track artifacts (initiatives → milestones → issues)
- ✅ Automatic state management via git automation
- ✅ Generate context for AI agents
- ✅ Agent executes issues and updates artifacts
- ✅ VSCode extension provides visual interface
- ✅ Cascade completions automatically
- ✅ Full audit trail of human + AI work

**Future Premium (Small Teams):**
- 🎯 Team artifact sharing
- 🎯 AI-powered insights (dependency analysis, risk detection)
- 🎯 Advanced context intelligence
- 🎯 Team dashboards and analytics

### MVP Demo Flow

**The "Perfect Workflow":**

1. **Developer** creates Initiative B (CLI Package) in VSCode extension
2. **Developer** breaks down into milestones (B.1, B.2, B.3...)
3. **Developer** breaks down B.1 into issues (B.1.1, B.1.2, B.1.3...)
4. **Developer** clicks issue B.1.1 → "Generate Context for Agent"
5. **VSCode** copies formatted context to clipboard
6. **Developer** pastes context into Claude/Cursor agent
7. **AI Agent** reads context, executes work, updates `implementation_notes` in artifact
8. **AI Agent** commits changes with proper message format
9. **Git hook** transitions artifact to `completed` on PR merge
10. **Cascade engine** updates parent milestone progress
11. **Developer** reviews work and artifact updates in VSCode tree view

### Success Criteria

- ✅ Solo developer can structure and track work through artifacts
- ✅ AI agents can execute issues with proper context and boundaries
- ✅ Automatic state transitions via git hooks (no manual updates)
- ✅ Visual interface in VSCode for artifact management
- ✅ Full audit trail distinguishing human vs. AI contributions
- ✅ Type-safe artifact operations with validation
- ✅ Context generation at multiple levels (issue, milestone, initiative)

---

## Technical Architecture

### Package Strategy

**The Missing Layer:**

Our analysis of legacy code revealed that CLI, git-ops, and scripts were all **directly manipulating YAML files** with no abstraction layer. This creates technical debt and makes evolution difficult.

**Proposed Architecture:**

```
┌─────────────────────────────────────┐
│   VSCode Extension (UI)             │  ← Phase 3
├─────────────────────────────────────┤
│   CLI Commands     │   Git-Ops      │  ← Phase 2
├────────────────────┴────────────────┤
│   @kodebase/artifacts (MISSING!)    │  ← Phase 1 (NEXT)
├─────────────────────────────────────┤
│   @kodebase/core v1.0 ✅            │  ← SHIPPED
└─────────────────────────────────────┘
```

**Dependency Graph:**

```
@kodebase/core (v1.0) ✅ SHIPPED
    ↓ (uses schemas, validation, state machine)
@kodebase/artifacts (v1.0) 🎯 NEXT PRIORITY
    ↓ (provides typed operations)
    ├── @kodebase/git-ops (v2.0)
    └── @kodebase/cli (v2.0)
    ↓ (consumed by)
vscode-extension (v1.0)
```

### Why @kodebase/artifacts First?

**ADR-001: Artifacts Layer Before CLI/Git-Ops**

**Context:**
- Core package v1.0 provides schemas, validation, state machine
- Legacy CLI, git-ops, and scripts all manipulate YAML directly
- No shared abstraction for artifact operations
- Lots of duplicated file I/O and parsing code

**Decision:**
Build `@kodebase/artifacts` as the foundation layer before CLI or git-ops v2.0.

**Rationale:**
1. **Unblocks everything** - CLI, git-ops, extension all need artifact operations
2. **Eliminates duplication** - Single source of truth for CRUD, queries, relationships
3. **Type safety** - Typed operations instead of string manipulation
4. **Context API** - Evolves valuable context scripts into programmatic API
5. **Testable foundation** - Can test artifact operations independently
6. **Enable manual use** - Can use while building other packages

**Consequences:**
- ✅ Cleaner architecture (proper layering)
- ✅ Type-safe operations throughout stack
- ✅ Reusable by CLI, git-ops, extension, scripts
- ✅ Foundation for advanced features (caching, indexing, analytics)
- ⏳ Slightly delays CLI/git-ops development (but saves time overall)

**Alternatives Considered:**
- **CLI-first:** Would lack proper artifact foundation, repeat legacy mistakes
- **Git-ops-first:** Needs artifact operations, would duplicate CLI code
- **Build them together:** Creates coupling and makes testing harder

---

### @kodebase/artifacts Package Design

**Core Responsibilities:**

1. **Artifact CRUD Operations**
   - Load artifacts with caching
   - Save artifacts with atomic writes
   - Delete artifacts (with safety checks)
   - Clone/duplicate artifacts

2. **Artifact Tree Navigation**
   - Load entire artifact hierarchies
   - Query parent/child relationships
   - Find blocking dependencies
   - Traverse relationship graphs

3. **Artifact Mutations**
   - Safe event appending
   - Metadata updates with validation
   - Relationship management (add/remove blocks)
   - Status transitions (wrapping core's state machine)

4. **Artifact Discovery**
   - List artifacts at any level
   - Filter by status, priority, assignee
   - Search by title or ID pattern
   - Query for matching conditions

5. **Context Generation (Evolution of Scripts!)**
   - Generate context for AI agents at multiple levels
   - Aggregate relevant dependencies, parent info, sibling context
   - Format for different use cases (minimal, standard, full)
   - Provide as API (not just shell scripts)

6. **Directory Management**
   - Initialize `.kodebase/artifacts` structure
   - Maintain proper directory layout
   - Handle schema upgrades
   - Archive completed artifacts

**Key Modules:**

```typescript
// Core operations
export class ArtifactManager {
  load(id: string): Promise<Artifact>;
  save(artifact: Artifact): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

// Relationships and queries
export class ArtifactTree {
  getParent(id: string): Promise<Artifact | null>;
  getChildren(id: string): Promise<Artifact[]>;
  getBlocked(id: string): Promise<Artifact[]>;
  getBlocking(id: string): Promise<Artifact[]>;
}

export class ArtifactQuery {
  byStatus(status: ArtifactEvent): Promise<Artifact[]>;
  byPriority(priority: Priority): Promise<Artifact[]>;
  byAssignee(assignee: string): Promise<Artifact[]>;
  where(predicate: (a: Artifact) => boolean): Promise<Artifact[]>;
}

// Context generation (evolved from scripts!)
export class ContextBuilder {
  forIssue(id: string, level: 'minimal' | 'standard' | 'full'): Promise<IssueContext>;
  forMilestone(id: string): Promise<MilestoneContext>;
  forPR(id: string): Promise<PRContext>;

  // Smart aggregation
  withDependencies(artifact: Artifact): Promise<EnrichedContext>;
  withParentChain(artifact: Artifact): Promise<EnrichedContext>;
  withSiblings(artifact: Artifact): Promise<EnrichedContext>;
}

// Directory operations
export class ArtifactDirectory {
  initialize(rootPath: string): Promise<void>;
  listInitiatives(): Promise<Initiative[]>;
  listMilestones(initiativeId: string): Promise<Milestone[]>;
  listIssues(milestoneId: string): Promise<Issue[]>;
}
```

---

### Context API: Evolution from Shell Scripts

**ADR-002: Context API Over Shell Scripts**

**Context:**
Legacy system had valuable shell scripts (`pnpm ctx A.1.1`) that generated context for AI agents. These worked well but had limitations:
- Hard to maintain (bash/Python mix)
- Not consumable by extension
- No type safety
- Difficult to test
- Limited extensibility

**Decision:**
Evolve context scripts into programmatic Context API within `@kodebase/artifacts` package.

**What Made Scripts Valuable:**
1. **Structured handoff** - Agent gets artifact definition, acceptance criteria, dependencies
2. **Consistency** - Same format every time
3. **Scope control** - Agent knows exactly what to work on
4. **Audit trail** - Results go into `implementation_notes`

**Context API Improvements:**
1. **Programmatic access** - Callable from CLI, extension, scripts
2. **Type-safe** - TypeScript all the way
3. **Dynamic levels** - Minimal, standard, full context
4. **Smart aggregation** - Auto-include relevant dependencies, parent context
5. **Multiple formats** - JSON, Markdown, plain text
6. **Bidirectional** - Not just read, but update artifacts too

**Consequences:**
- ✅ CLI can call `contextBuilder.forIssue(id)` directly
- ✅ VSCode extension can generate context on button click
- ✅ Scripts can be thin wrappers around Context API
- ✅ Type-safe context structure
- ✅ Testable with unit tests
- ⏳ Need to maintain backward compatibility with existing script users

**Alternatives Considered:**
- **Keep shell scripts:** Not extensible, hard to maintain, can't use in extension
- **Remove entirely:** Lose valuable agent integration feature
- **Separate package:** Overkill, belongs with artifact operations

---

### Architecture Decision: AI Control Philosophy

**ADR-003: AI Control Not Just Assistance**

**Context:**
The market is saturated with "AI coding assistants" (Copilot, Cursor, Tabnine, etc.). They all position as "AI helps you code faster" but lack governance and structure.

**Decision:**
Position Kodebase as **"Control AI work, don't just use AI"** - a governance and execution framework, not another assistant.

**Key Differentiators:**

1. **Artifacts as Contracts**
   - Clear scope (acceptance criteria)
   - Explicit dependencies
   - Success criteria defined upfront
   - Not vague prompts

2. **Constitutional Boundaries**
   - AI must follow Constitution (simplicity, scope, YAGNI)
   - No gold-plating or feature creep
   - Local-first mandate
   - Type safety enforced

3. **Event-Sourced Audit Trail**
   - Every action tracked
   - Actor attribution (human vs. AI)
   - Immutable history
   - Compliance-ready

4. **Structured Workflows**
   - Hierarchical work breakdown
   - Automatic cascade logic
   - State machine enforcement
   - Git-driven automation

**Consequences:**
- ✅ Clear market differentiation
- ✅ Appeals to teams needing governance
- ✅ Premium features around team collaboration make sense
- ✅ Positions for enterprise adoption (audit, compliance)
- ⏳ Requires education (not just "faster coding")
- ⏳ Slightly steeper learning curve (but worth it)

**Alternatives Considered:**
- **General AI assistant:** Too commoditized, no differentiation
- **Pure PM tool:** Misses AI opportunity
- **AI-first with no governance:** Misses enterprise opportunity

---

### VSCode Extension Architecture

**Goal:** Visual interface + agent orchestration

**Core Components:**

**1. Artifact Explorer (TreeView)**
```
📁 Initiatives
  📊 A - Core Package v1 [completed]
  📊 B - Artifacts Package [in_progress]
    📋 B.1 - Artifact Manager [in_progress]
      📝 B.1.1 - CRUD Operations [ready]
      📝 B.1.2 - Caching Layer [blocked by B.1.1]
```

Features:
- Click artifact → open YAML + show context panel
- Right-click → "Start Work", "Generate Context", "Create Child"
- Status badges with color coding
- Expand/collapse hierarchies

**2. Context Panel (Webview)**
- Shows artifact details (title, status, acceptance criteria, dependencies)
- **"Generate Context for Agent"** button → copies formatted context
- Links to parent/children/blocking artifacts
- Event timeline visualization

**3. Agent Integration**
- **"Start Agent on This Issue"** - Launches with proper context
- Real-time progress tracking (agent updates artifact as it works)
- Review agent changes before committing

**4. Git Integration**
- Automatic branch creation when starting artifact
- Commit message templates with artifact ID
- PR creation with auto-generated description from artifact

**5. Command Palette**
```
> Kodebase: Create Artifact
> Kodebase: Start Work on Artifact
> Kodebase: Generate Context
> Kodebase: Validate Artifacts
> Kodebase: Show Dependency Graph
```

**Technical Stack:**

```typescript
// Extension depends on artifacts package and CLI
import { ArtifactManager, ContextBuilder } from '@kodebase/artifacts';
import { executeCommand } from '@kodebase/cli';

// Extension structure
vscode-extension/
├── src/
│   ├── providers/
│   │   ├── ArtifactTreeProvider.ts      // TreeView data
│   │   └── ContextPanelProvider.ts      // Webview content
│   ├── commands/
│   │   ├── createArtifact.ts
│   │   ├── startWork.ts
│   │   ├── generateContext.ts
│   │   └── launchAgent.ts
│   ├── integrations/
│   │   ├── gitIntegration.ts            // Git operations
│   │   └── cursorIntegration.ts         // Agent orchestration
│   └── extension.ts                      // Entry point
```

**Extension Benefits:**
1. **Visual artifact management** - No hunting for YAML files
2. **One-click agent handoff** - "Generate Context" → paste into Claude/Cursor
3. **State awareness** - See what's ready, blocked, in-progress
4. **Reduced context switching** - Everything in IDE
5. **Agent progress tracking** - See what agent is working on

---

## Monetization Strategy

### Free Tier (Target: Solo Developers)

**Scope:** Local-only, single developer

**Features:**
- Full artifact management (initiatives, milestones, issues)
- Git automation (hooks for state transitions)
- CLI commands (create, start, status, validate, complete)
- VSCode extension (basic features)
- Context generation for AI agents
- Local-only storage

**Cost to us:** ~$0 (local execution, no infrastructure)

**Goal:**
- Get developers using Kodebase
- Build community and feedback loop
- Word-of-mouth growth
- Freemium conversion funnel

**Target Users:**
- Solo indie developers
- Side project builders
- Students/learners
- Open source maintainers

---

### Premium Tier (Target: Small Teams)

**Scope:** Team collaboration + AI intelligence

**Features (TBD - to be validated):**

**Team Collaboration:**
- Team artifact repositories (shared workspaces)
- Cloud sync / remote artifact storage
- Multi-user state management
- Team activity feed
- Collaborative artifact editing
- Role-based permissions

**AI Intelligence:**
- AI-powered dependency analysis
- Automatic risk detection (blocked chains, scope creep)
- Intelligent context enrichment
- Code quality insights
- Progress predictions
- Bottleneck identification

**Advanced Features:**
- Team dashboards and analytics
- Custom workflows and automations
- Advanced reporting (burndown, velocity, etc.)
- Integration with external tools (Jira, Linear, etc.)
- Priority support
- Team training/onboarding

**Pricing:** $X/user/month (TBD - need market validation)

**Cost to us:**
- Cloud infrastructure (artifact storage, API hosting)
- AI API costs (OpenAI/Anthropic for intelligence features)
- Support overhead

**Goal:**
- Sustainable revenue from team features
- Retention through network effects (team lock-in)
- Upsell path from free → premium

**Target Users:**
- Small development teams (2-10 developers)
- Agencies managing multiple projects
- Startups with distributed teams
- Companies with AI governance needs

---

### Growth Path & Conversion Funnel

**Step 1: Solo Developer (Free)**
- Downloads CLI / VSCode extension
- Uses for personal projects
- Learns the artifact methodology
- Experiences value of AI governance

**Step 2: Team Formation**
- Developer introduces to team
- Team starts using free tier
- Hits collaboration limitations
- Needs shared artifacts, team visibility

**Step 3: Premium Upgrade**
- Team upgrades for collaboration features
- $X × team_size per month
- Retention through network effects

**Step 4: Expansion**
- Team grows, more users added
- Uses advanced intelligence features
- Becomes essential tool
- High switching cost (artifacts, workflows, integrations)

---

## Development Roadmap

### Phase 1: Artifacts Package (Next 2-4 weeks)

**Initiative B: @kodebase/artifacts v1.0**

**Milestones:**
- **B.1 - Artifact Manager** (CRUD operations)
  - B.1.1 - Load/save with caching
  - B.1.2 - Atomic writes and transactions
  - B.1.3 - Delete with safety checks
  - B.1.4 - Tests and documentation

- **B.2 - Artifact Tree** (relationships & queries)
  - B.2.1 - Parent/child navigation
  - B.2.2 - Dependency resolution
  - B.2.3 - Tree traversal utilities
  - B.2.4 - Tests and documentation

- **B.3 - Context Builder** (evolved context scripts!)
  - B.3.1 - Issue context generation
  - B.3.2 - Milestone/initiative context
  - B.3.3 - Smart aggregation (dependencies, parent chain)
  - B.3.4 - Multiple output formats
  - B.3.5 - Tests and documentation

- **B.4 - Directory Management**
  - B.4.1 - Initialize artifact directories
  - B.4.2 - Directory layout enforcement
  - B.4.3 - Archive operations
  - B.4.4 - Tests and documentation

- **B.5 - Testing & Documentation**
  - B.5.1 - Integration tests
  - B.5.2 - API documentation
  - B.5.3 - Usage examples
  - B.5.4 - Migration guide from legacy scripts

**Outcome:** Type-safe artifact operations, Context API, foundation for everything

---

### Phase 2: Automation (4-6 weeks)

**Initiative C: Git-Ops v2.0**

**Milestones:**
- **C.1 - Git Hooks System**
  - post-checkout (start work)
  - pre-commit (validate)
  - post-merge (complete work)
  - Cascade triggers

- **C.2 - Branch Management**
  - Branch creation with artifact ID
  - Branch validation
  - Branch cleanup

- **C.3 - PR Automation**
  - PR creation with artifact context
  - PR templates
  - Auto-merge coordination

- **C.4 - Cascade Automation**
  - Upward cascade (issue → milestone → initiative)
  - Dependency resolution
  - Completion propagation

**Initiative D: CLI v2.0**

**Milestones:**
- **D.1 - Command Framework**
  - Command registry
  - Flag parsing
  - Help system
  - Error handling

- **D.2 - Core Commands**
  - `create` (with wizard)
  - `start` (begin work)
  - `status` (show info)
  - `validate` (check constraints)

- **D.3 - Context Commands**
  - `ctx` (generate context)
  - `ctx --pr` (PR context)
  - `ctx --full` (extended context)

- **D.4 - Agent Handoff**
  - Agent identity management
  - Actor attribution
  - Event tracking

**Outcome:** Automated workflows, CLI for humans and tools, git-driven state management

---

### Phase 3: Extension (3-5 weeks)

**Initiative E: VSCode Extension v1.0**

**Milestones:**
- **E.1 - Artifact Explorer TreeView**
  - Hierarchical tree display
  - Status indicators
  - Expand/collapse
  - Context menu actions

- **E.2 - Context Panel Webview**
  - Artifact details display
  - "Generate Context" button
  - Event timeline
  - Dependency visualization

- **E.3 - Command Palette Integration**
  - All CLI commands available
  - Quick actions
  - Fuzzy search

- **E.4 - Git Integration**
  - Branch creation
  - Commit templates
  - PR creation
  - Status sync

- **E.5 - Agent Integration** (The innovation!)
  - Launch agent with context
  - Track agent progress
  - Review agent changes
  - Update artifacts

**Outcome:** Visual interface, agent orchestration, **MVP COMPLETE** 🎉

---

## Open Questions

### Product

- [ ] **Premium feature validation** - Which team features are most valuable?
- [ ] **Pricing model** - Per-user, per-team, or usage-based?
- [ ] **AI intelligence features** - What insights do teams need most?
- [ ] **Freemium limits** - Where to draw the line between free and premium?
- [ ] **Team collaboration model** - Shared repos? Cloud sync? Both?

### Technical

- [ ] **Cloud architecture** - If premium needs cloud, what's the stack?
- [ ] **Extension marketplace** - VSCode, Cursor, JetBrains - which first?
- [ ] **MCP integration depth** - How deep to integrate with Model Context Protocol?
- [ ] **Offline support** - How to handle offline team collaboration?
- [ ] **Scalability** - What happens with 1000+ artifacts in a repo?

### Go-to-Market

- [ ] **Target early adopters** - Indie hackers? Agencies? Startups?
- [ ] **Content strategy** - Docs, tutorials, demos, blog posts?
- [ ] **Community building** - Discord? GitHub Discussions? Forum?
- [ ] **Developer relations** - How to build advocate community?
- [ ] **Launch strategy** - Product Hunt? Hacker News? Twitter?

### Business Model

- [ ] **Free tier sustainability** - Can we afford unlimited free users?
- [ ] **Premium conversion rate** - What % of free users convert?
- [ ] **Churn prevention** - How to retain premium teams?
- [ ] **Enterprise path** - Is there an enterprise tier above premium?
- [ ] **Open source strategy** - Core open source, premium closed? Or hybrid?

---

## Success Metrics (To Be Defined)

### Free Tier (Community Growth)
- [ ] Monthly active users
- [ ] Artifacts created per user
- [ ] CLI command usage patterns
- [ ] Extension downloads/installs
- [ ] Community engagement (issues, discussions)

### Premium Tier (Revenue)
- [ ] Free → Premium conversion rate
- [ ] Monthly recurring revenue (MRR)
- [ ] Average revenue per user (ARPU)
- [ ] Churn rate
- [ ] Net promoter score (NPS)

### Product Quality
- [ ] Bug reports per release
- [ ] Test coverage %
- [ ] API documentation completeness
- [ ] User support ticket volume
- [ ] Feature request patterns

---

## References

### Internal Documentation
- [Kodebase Agent Constitution](../../AGENTIC_CONSTITUTION.mdc) - Laws for AI agents
- [Kodebase Methodology](../../AGENTIC_KODEBASE_METHODOLOGY.mdc) - Execution process
- [Agents Guide](../../AGENTS.md) - Technical implementation guide
- [Core Package Spec](./../specs/core/) - Technical specifications

### External Resources
- [Legacy Package Analysis](./LEGACY-ANALYSIS.md) *(to be created when splitting this doc)*
- [VSCode Extension Architecture](./VSCODE-EXTENSION-DESIGN.md) *(to be created when splitting this doc)*
- [Context API Design](./CONTEXT-API-DESIGN.md) *(to be created when splitting this doc)*

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-02 | 1.0 | Initial strategic vision document created | Miguel Carvalho |

---

## Next Steps

1. **Immediate (Today):**
   - ✅ Document strategic vision
   - 🎯 Rest and prepare for tomorrow's work

2. **Tomorrow:**
   - 🎯 Break down Initiative B (Artifacts Package) into detailed milestones and issues
   - 🎯 Create artifact files for Initiative B
   - 🎯 Begin B.1 (Artifact Manager) implementation

3. **This Week:**
   - Complete B.1 and B.2 (Artifact Manager + Tree)
   - Start B.3 (Context Builder)

4. **This Month:**
   - Complete Initiative B (Artifacts Package v1.0)
   - Ship to npm as @kodebase/artifacts
   - Update documentation with learnings
