# Project Glossary

This document is the single source of truth for the terminology and concepts used within the Kodebase project.

As per the **AGENT_CONSTITUTION.mdc**, all new concepts MUST be defined here before they are implemented in code.

---

## A

### Acceptance Criteria
Testable requirements that define when a issue is considered complete. Every criterion must be mapped to one or more tests to ensure verifiable completion.

### Agent
An autonomous AI "worker" directed by your methodology and CLI to perform development issues.

### Agent Marketplace
A platform ecosystem where specialized AI agents can be discovered, deployed, and integrated into development workflows. Transforms Kodebase from a tool into a market creator.

### Agent Trainer
A developer who specializes in configuring, training, and optimizing AI agents for specific development issues within the Kodebase methodology.

### AI Governance Framework
The set of policies, sandboxes, and approval gates that ensure autonomous agents operate safely and within defined boundaries, preventing catastrophic failures.

### AI-Native Development Methodology
A development approach designed from the ground up to leverage AI capabilities. Unlike traditional methodologies adapted for AI use, this methodology assumes AI agents as first-class participants in the development process.

### Architecture Decision Record (ADR)
A document that captures a significant architectural decision, including the context, options considered, decision made, and consequences. In Kodebase, ADRs are stored in the repository and are AI-accessible.

### Artifact
A structured YAML file representing a initiative, milestone, or issue. Artifacts contain metadata, status, relationships, and an immutable event log tracking their lifecycle.

### Artifact Lifecycle
The state progression that all artifacts follow: `draft` → (`ready`|`blocked`|`cancelled`) → `in_progress` → `in_review` → `completed` → `archived`. State transitions are driven by events, not manual changes.

### Atomic Commit
A commit that represents a single, complete logical change. Essential for maintaining clear project history and enabling precise rollbacks.

## B

### Blocked
Lifecycle state indicating an artifact cannot proceed due to external dependencies or constraints. Artifacts remain blocked until dependencies are resolved.

### Blocked By
Relationship indicating which artifacts must be completed before this artifact can proceed. Part of the dependency management system.

### Blocks
Relationship indicating which artifacts this artifact prevents from proceeding. Used to establish dependency chains.

## C

### Cancelled
Lifecycle state indicating an artifact has been abandoned. Cancelled artifacts can be reactivated unless their parent is completed.

### Cascade
Automatic state propagation where changes in one artifact trigger related changes in parent/child artifacts. Ensures consistency across the project hierarchy.

### CLI (Command-Line Interface)
The terminal-based interface (kodebase … commands) through which both humans and agents interact with the code and metadata.

### Code Base vs. Knowledge Base
A "code base" is just source files. A "knowledge base" is structured, versioned project intelligence. "Kodebase" fuses both.

### Collaborative Cognition System
A platform where the collective intelligence of humans and AI agents is aggregated, shared, and leveraged in real-time for software development.

### Context Decay
The gradual loss of knowledge and understanding about a codebase over time. This includes undocumented decisions, forgotten trade-offs, and implicit rules that exist only in the minds of veteran developers. Kodebase is designed to prevent context decay by capturing all project intelligence in a version-controlled, AI-accessible format.

### Context Pollution
The risk of AI agents learning from low-quality or outdated patterns in the codebase. Mitigated through knowledge curation and the hierarchical distillation process.

### Correlation ID
A unique identifier linking related events across multiple artifacts, enabling tracking of cascade effects and maintaining causality chains.

### Completed
Final successful lifecycle state indicating all acceptance criteria have been met and the artifact's work is finished.

### Context Capture
The practice of preserving knowledge, decisions, and insights within the artifact system to prevent context decay and enable future reference.

### Conventional Commit
Structured commit message format that includes type, scope, and description. Essential for automated tooling and clear project history.

## D

### DAG (Directed Acyclic Graph)
A directed graph with no cycles. Within Kodebase, a DAG describes a set of artifact `blocked_by` relationships where dependencies never loop back to an earlier artifact. Cycle detection must confirm it stays silent when the dependency graph is a DAG.

### Definition of a Issue → Milestone → Initiative
The core methodology:
- Issue: A single, atomic unit of work with metadata and events
- Milestone: A group of related issues with synthesized outcomes
- Initiative: A sequence of milestones with strategic context

### DFS-Based Detection
Depth-first search traversal used to uncover cycles in the dependency graph. The algorithm follows one `blocked_by` chain as far as possible; if it encounters an artifact already on the current stack, it reports the ordered loop of IDs for debugging.

### Digital Brutalism
A design philosophy emphasizing honest, structural, grid-based layouts that reveal raw "materials" of the interface.

### Docs-as-Code
The practice of treating documentation with the same rigor as code: version-controlled, reviewed, tested, and maintained alongside the codebase. Essential for maintaining AI-accessible context.

### Draft
Initial lifecycle state for newly created artifacts. Represents work that is being specified but not yet ready for implementation.

### Draft PR
A pull request marked as draft to provide immediate team visibility of in-progress work without being ready for review.

### DRY (Don't Repeat Yourself)
A principle advocating elimination of duplication by abstracting shared logic or types.

## E

### Event
A record of a state change in an artifact's lifecycle. Events include timestamp, actor, event type, and optional metadata. Events form an immutable log.

### Event Type
The specific type of state transition: `draft`, `ready`, `blocked`, `cancelled`, `in_progress`, `in_review`, `completed`, or `archived`.

### Event-Driven Cascade Model
A system where status changes in artifacts automatically trigger related changes in parent/child artifacts through correlated events. Ensures consistency across the entire project hierarchy.

## F

### Feature Branch
A Git branch created for a specific artifact, named with the artifact ID (e.g., `A.1.5`). Enables isolated development work.

## G

### Git Hook
Automated scripts triggered by Git actions. Used in Kodebase to translate Git operations into artifact events and maintain system consistency.

### Git as a Database
The core philosophy of treating the Git repository as a structured, event-driven database containing both code and project intelligence.

### Golden Context
High-quality, curated knowledge that has been validated and promoted as a reliable pattern or decision for future reference by both humans and AI agents.

## H

### Hierarchy Filter
An intelligent filtering system that scores and ranks artifacts based on hierarchical relationships, dependencies, and relevance to a target context. Used in the MCP server for context assembly optimization.

### Human-Agent Collaboration
The workflow in which human intent guides AI agents, and agents execute high-speed operations under human oversight.

## I

### In Progress
Lifecycle state indicating active work is being performed on an artifact. Triggered when the artifact's feature branch is checked out.

### In Review
Lifecycle state indicating the artifact's work is complete and ready for review. Triggered when a draft PR is marked ready for review.

### Initiative
High-level strategic goal representing a sequence of milestones. The top level of the artifact hierarchy.

### Issue
Specific work item within a milestone. The atomic unit of work containing acceptance criteria and an event log.

## K

### Knowledge Distillation
The hierarchical process of synthesizing raw implementation details into progressively higher-level insights:
- **Issue Level**: Raw implementation details and technical decisions
- **Milestone Level**: Synthesized tactical learnings and patterns
- **Initiative Level**: Strategic wisdom and business outcomes

### Knowledge Gardener
A team member responsible for curating the team's collective knowledge, promoting high-quality patterns to golden context, and maintaining the integrity of the shared brain.

### Kodebase CLI
The command-line interface that serves as the write API for the Kodebase system. Handles artifact creation, state transitions, and automation.

## M

### Meta-Orchestrator
A human who orchestrates not just AI agents, but the entire methodology and system that enables autonomous development. They define the rules, structure, and processes that allow agents to work effectively.

### Methodology Shepherd
A role focused on ensuring teams properly implement and maintain the Kodebase methodology, similar to a Scrum Master but for AI-native development.

### Milestone
Major deliverable within an initiative, composed of related issues. Represents tactical progress toward strategic goals.

### Model Context Protocol (MCP)
The read-only API and intelligence layer that provides context to AI agents. MCP aggregates information from artifacts, code, documentation, and historical patterns to create comprehensive context for autonomous development.

## O

### Orchestrator
The evolved role of a developer in an AI-native environment. Rather than writing code directly, an orchestrator directs AI agents by providing context, defining requirements, and reviewing outputs. Similar to a conductor directing a symphony rather than playing individual instruments.

## P

### Parent Event
An event that triggers cascade events in related artifacts. Used to maintain causality chains across the artifact hierarchy.

### Parent-Child Relationship
The hierarchical structure where initiatives contain milestones, and milestones contain issues. Changes cascade from parent to child and vice versa.

### Prescriptive Methodology
An opinionated approach that enforces specific workflows and practices. While creating initial friction, it ensures consistency and enables powerful automation and AI assistance.

### Progressive Enhancement
The strategy of evolving the platform from read-only (Alpha) to full read-write (Beta) to collaborative real-time (Launch), allowing gradual adoption and risk mitigation.

## Q

### Quality Gates
Transition checkpoints that must be satisfied before an artifact can move to the next lifecycle state. Ensures work meets standards before progression.

## R

### Ready
Lifecycle state indicating an artifact is fully specified and ready for implementation work to begin.

### RAG (Retrieval-Augmented Generation)
A technique for feeding an LLM only the relevant slices of project context (from the repo) to improve prompt precision.

### Relevance Score
A numerical value (0-1) calculated by the Hierarchy Filter indicating how relevant an artifact is to a given context or target. Higher scores indicate greater relevance based on hierarchical proximity, relationships, priority, and recency.

### Real-time Synchronization
The capability for multiple users and agents to see live updates of artifact changes, status transitions, and new events without page refreshes.

### Red-Green-Refactor
The TDD cycle: write a failing test (Red), make it pass (Green), then improve the code (Refactor) while keeping tests passing.

## S

### Semantic Merge Agent
An AI agent capable of resolving conflicts not just at the text level, but by understanding the semantic intent of changes and proposing intelligent resolutions based on project context.

### Single Responsibility Principle (SRP)
A design principle stating that every module, class, or function should have one, and only one, reason to change.

### Surgical Context Provision
The practice of providing only relevant project context to AI agents, reducing token usage while maintaining precision.

### System of Record for Development Intelligence
A single, version-controlled, durable repository containing all project context, decisions, and rules. Unlike traditional approaches that scatter information across multiple tools (Jira, Confluence, Slack), Kodebase consolidates everything into the Git repository alongside the code.

## T

### TDD (Test-Driven Development)
Development cycle where tests are written before implementation code. Essential for ensuring acceptance criteria are verifiably met.

### Tidy First
The practice of performing structural changes (refactoring) before behavioral changes, keeping commits focused and atomic.

### Time-to-Context (TTC)
The time required for a developer or AI agent to load the necessary project history, rules, and current state into working memory to perform a issue effectively. Kodebase aims to reduce TTC to near-zero.

### Tactical vs. Strategic Context
- Tactical (Issue-level): Implementation details, edge cases, metrics
- Strategic (Initiative-level): Business impact, architecture evolution, organizational learning

### Terraforming the Environment
The practice of structuring a codebase and its surrounding context to make it optimally suited for AI agents to work effectively. Rather than building smarter agents, we make the problem space more legible.

### The Kodebase Method
The comprehensive methodology encompassing all practices, principles, and tools that enable autonomous AI-driven development. Aims to become as fundamental as Agile or DevOps.

### "Trust the Data"
A mindset shift from self-doubt to relying on objective signals—velocity metrics, user feedback—to guide product decisions.

## W

### Workspace
A multi-tenant isolation unit containing one or more repositories, team members, and shared configuration. Provides logical separation for different organizations or projects.

## Y

### YAGNI (You Ain't Gonna Need It)
Constitutional principle stating that features not in the current issue's requirements should not be built. Prevents over-engineering and scope creep.
