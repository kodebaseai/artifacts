# Kodebase: Git as Universal Knowledge Layer

## The YC Pitch (1-Liner)

**Kodebase turns every Git repo into a self-aware knowledge brain — so AI agents code like senior devs, and new hires onboard in minutes.**

## Your YC App (Draft — 1 Paragraph)

> We’re building Kodebase, the memory layer for AI engineers.
> Every day, developers waste hours re-explaining their stack to AI. We fix that with a Git-native, schema-validated knowledge system that turns any repo into a self-aware project brain.
> AI agents read .kodebase/artifacts, write PRs, and update docs — all with full context.
> We’ve shipped 150 AI-written PRs across 4 models. Solo devs use it free. Teams pay $29/user to scale AI dev capacity.
> We’re at $0 MRR — but with 10 early adopters lined up.
Help us get to $5K MRR and 100 AI-powered repos by Demo Day.

## The Problem: Scattered Knowledge, Lost Context

Current development workflows suffer from fundamental knowledge fragmentation:

- **Siloed Tools**: Teams scatter information across Notion (docs), GitHub (code/reviews), Linear (issues), Slack (decisions), etc.
- **Context Loss**: AI assistants start each session from zero, requiring repeated explanation of project architecture, current goals, and implementation decisions
- **Knowledge Decay**: Project knowledge lives in people's heads or becomes stale in disconnected documentation
- **Onboarding Friction**: New team members (human or AI) spend excessive time understanding "why" decisions were made

- [The problem](./0.problem.md)

## The Solution: Centralized, Versioned Project Knowledge

Kodebase transforms Git repositories into comprehensive knowledge stores through two core components:

### The `.kodebase/` System
A structured folder containing versioned project artifacts:
- **Initiatives**: High-level project direction and architectural decisions
- **Milestones**: Progress tracking and delivery goals
- **Issues**: Granular work items with context and rationale
- **Docs**: Living documentation that evolves with code

### AI-Driven Methodology
A systematic approach where AI agents participate as first-class developers:
- **Artifact Lifecycle**: Every development phase generates and updates knowledge
- **Contextual Documentation**: Technical decisions documented at the module level
- **Automated Knowledge Capture**: Git commits trigger knowledge updates and event flows

This project will be developed using its own methodology - creating the `.kodebase/` system while actively using it ensures real-world validation and continuous refinement.

- [The solution](./solution.md)

## How It Works: AI-First Development Workflow

### Project Initiativening

**Initiatives**: Strategic vision and architectural decisions that guide all development work
- **Project Vision**: High-level goals, target users, and success metrics
- **Architecture Decisions**: Technology choices with rationale and trade-offs
- **Development Roadmap**: Feature priorities and implementation sequence

**Milestones**: Concrete delivery targets that organize work into achievable phases
- **Delivery Goals**: Specific features or capabilities to be completed
- **Success Criteria**: Measurable outcomes that define milestone completion
- **Progress Tracking**: Real-time visibility into completion status

**Issues**: Granular work items that implement milestone objectives
- **Context Preservation**: Each issue carries full rationale and requirements
- **Knowledge Generation**: Every issue contributes to project intelligence
- **Dependency Management**: Clear relationships between related work

This hierarchical structure ensures strategic alignment while maintaining tactical flexibility.

- [Adoption Strategy](./03.adoption-strategy.md)

### Issue Lifecycle with Git Integration
Each development cycle follows an event-driven knowledge-generating process:

**Status Progression**:
- `created` → `ready` (manual, requirements achieved)
- `ready` → `in_progress` (automatic on issue branch creation)
- `in_progress` → `in_review` (automatic on PR/MR creation)
- `in_review` → `completed` (automatic on PR/MR merge)

**Git Requirements**: Each status transition is triggered by Git actions, creating a complete audit trail where every major milestone is reflected in Git history with full context.

### MCP Integration: Three Usage Patterns

**AI as Documentation Assistant**: Developer codes, AI maintains `.kodebase/` artifacts and documentation
**AI as Development Partner**: Developer guides, AI implements through artifact lifecycle phases with human oversight
**Autonomous AI Agent**: AI handles complete development cycles independently with human approval gates
**Code Review Requirement**: All patterns require human approval - no code reaches main branch without designated reviewer approval, ensuring quality regardless of who authored the code.

## Architecture Overview

### Dual Interface Strategy
**Kodebase Web Interface**:
- GitHub OAuth authentication
- Multi-repo project management dashboard
- Visual issue boards and AI agent assignment
- Ideal for project managers and team leads

**Kodebase Local (CLI/Terminal/VSCode Extension)**:
- Inherits local Git credentials
- Single repository focus (current working directory)
- Direct IDE/terminal integration with AI assistants
- Perfect for developers in their coding workflow

### Technical Foundation
**MCP Server Auto-Discovery**: Automatically detects `.kodebase/` folder and initializes project context for AI assistants
**File-Based Storage**: All artifacts versioned with Git - no external database dependencies, inherits repository permissions
**Generic Integration**: Standard MCP server works with any compliant AI assistant (Claude Code, Cursor, etc.)

- [Technical Decisions](./04.technical-decisions.md)

## Agentic Rules

AI agents participating in Kodebase development operate under structured rules that ensure quality, context preservation, and systematic knowledge capture. These rules transform autonomous agents from unpredictable automation into reliable development partners that enhance rather than replace human oversight.

The agentic framework provides clear boundaries for AI autonomy while maintaining human control over strategic decisions. Agents follow established patterns, document all actions with full context, and operate within the proven issue lifecycle that generates valuable project knowledge. This approach enables confident delegation of routine development work while preserving the decision quality and knowledge accumulation that makes projects successful.

- [Agentic Rules](../agentic-rules/)


## Business Opportunity

**Target Market**: Solo founders and small development teams experiencing daily context loss with AI coding tools

**Monetization Strategy**:
- **Free**: Local CLI and basic MCP server for individual developers
- **Team Initiatives**: Web interface, collaboration features, premium MCP capabilities
- **Enterprise**: Advanced security, SSO, on-premise deployment, AI agent marketplace

**Go-to-Market**: Free tier drives developer adoption → team collaboration drives conversion → enterprise features drive expansion

**Value Proposition**: Transforms the context persistence bottleneck into competitive advantage as AI coding tools become ubiquitous

- [Monetization Strategy](./monetization-strategy.md)

**End Vision**: AI agents developing projects with minimal human intervention, under human oversight and guidance, with complete project context preservation
