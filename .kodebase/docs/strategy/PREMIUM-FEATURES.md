# Kodebase Premium Features Strategy

> **Last Updated:** 2025-11-02
> **Status:** Living Document
> **Owner:** Miguel Carvalho
> **Related:** [PRODUCT-VISION.md](./PRODUCT-VISION.md)

---

## Core Philosophy

**Kodebase Premium is not just "more features" - it's an adaptive, intelligent platform that learns from each user and organization.**

### Key Differentiators

1. **Intelligence Layer is Premium-Only**
   - Free tier = Manual workflows with local tools
   - Premium = AI-powered assistance, automation, and insights

2. **Multi-Stakeholder Interface**
   - Different interfaces for different roles (exec, manager, developer)
   - Non-technical users can trigger AI work
   - Everyone sees the data relevant to their needs

3. **Adaptive User Experience**
   - Software learns how YOU use it
   - Power users get advanced shortcuts
   - Casual users get guided workflows
   - Interface adapts to usage patterns

4. **Custom-Made Experience**
   - No "one size fits all"
   - Even within organizations, each user gets personalized UX
   - System learns which features you rely on and optimizes for them

---

## Premium Tier Structure

### Pricing Model

**Team Plan: $49/user/month** (or $39 annual)
- 5+ users minimum
- All premium features
- Team intelligence and collaboration
- Standard support

**Enterprise Plan: Custom pricing**
- 25+ users
- Custom deployment options
- Advanced security (SSO, RBAC, audit)
- Dedicated support
- Custom integrations
- SLA guarantees

---

## Category 1: AI Governance & Compliance

**Problem:** Companies using AI have no visibility, no audit trail, no control.

**Premium Features:**

### 1.1 AI Activity Dashboard
**Who needs it:** Engineering managers, compliance officers, CTOs

**What it shows:**
- AI vs. Human contribution breakdown (by artifact, milestone, initiative)
- AI success metrics:
  - PRs approved without changes
  - Time to completion (AI vs. human)
  - Constitutional violations (when AI breaks rules)
  - Cost tracking (API usage per agent)
- Agent performance leaderboard
- Risk indicators (which artifacts need human review)

**Why it's premium:** Requires data aggregation, analytics engine, cloud storage

**Technical requirements:**
- Telemetry collection from local CLI/extension
- Cloud analytics pipeline
- Real-time dashboard (web interface)

---

### 1.2 Team AI Policies
**Who needs it:** Engineering leads, security teams

**What you can define:**
- **Autonomy levels:**
  - "AI can complete XS/S issues alone"
  - "M/L issues require human review"
  - "Critical issues = no AI"
- **Approval workflows:**
  - Single approval vs. 2+ approvals
  - Required reviewers by artifact type
  - Escalation rules (stuck agent → notify human)
- **Custom constitutional rules:**
  - Team-specific YAGNI rules
  - Security requirements (no external APIs)
  - Code quality gates (test coverage minimums)
- **Blocklists:**
  - Specific modules/files off-limits to AI
  - Security-critical artifacts
  - Legacy code that needs human expertise

**Why it's premium:** Requires policy engine, enforcement mechanisms, cloud config storage

**Technical requirements:**
- Policy definition UI (web interface)
- Policy enforcement in CLI/extension
- Audit logging of policy violations

---

### 1.3 Compliance Exports & Audit Trail
**Who needs it:** Compliance officers, auditors, legal teams

**What you can export:**
- **SOC2/ISO compliance reports:**
  - All code changes with actor attribution
  - Human review records
  - Policy enforcement logs
- **Regulatory compliance:**
  - IP/licensing tracking (who wrote what)
  - GDPR data processing records
  - Security audit trails
- **Custom reports:**
  - "Show all AI contributions in last quarter"
  - "Prove human reviewed all security-critical changes"
  - "Export dependency chain for Initiative X"

**Why it's premium:** Requires data retention, export engines, compliance templates

**Technical requirements:**
- Long-term event storage (cloud database)
- Export formatters (PDF, CSV, JSON)
- Compliance templates (SOC2, ISO, GDPR)

---

## Category 2: Intelligent Agent Orchestration

**Problem:** Teams waste time coordinating AI agents, agents conflict, no visibility.

**Premium Features:**

### 2.1 Multi-Agent Coordination
**Who needs it:** Engineering teams with 5-10+ AI agents

**What it enables:**
- **Parallel execution:**
  - Assign different agents to different issues simultaneously
  - Conflict detection (prevent two agents editing same file)
  - Load balancing (distribute work based on agent capacity)
- **Agent specialization:**
  - Tag agents as "frontend expert", "backend expert", "testing specialist"
  - Route issues to specialists automatically
  - Track specialization performance over time
- **Queue management:**
  - Priority-based queue (critical issues get agents first)
  - Fair allocation (prevent one initiative hogging all agents)
  - Manual override (assign specific agent to specific issue)

**Why it's premium:** Requires orchestration engine, conflict detection, cloud coordination

**Technical requirements:**
- Agent registry (track available agents)
- Work queue (priority scheduling)
- Conflict detection (file-level locking)
- Cloud coordination service

---

### 2.2 Agent Progress Tracking
**Who needs it:** Project managers, engineering leads

**What you can see:**
- **Real-time visibility:**
  - Which agent is working on which issue right now
  - Estimated completion time (based on historical data)
  - Progress indicators (% complete, commits made, tests passing)
- **Stuck agent detection:**
  - Agent hasn't committed in X minutes
  - Tests failing repeatedly
  - Constitutional violations detected
  - Automatic escalation to human
- **Historical performance:**
  - Agent velocity over time
  - Success rate by issue type
  - Time to completion trends

**Why it's premium:** Requires real-time telemetry, cloud storage, analytics

**Technical requirements:**
- Agent heartbeat system
- Real-time event streaming
- Progress estimation ML model
- Web dashboard for visualization

---

### 2.3 Smart Agent Assignment
**Who needs it:** Engineering leads, automation enthusiasts

**What the AI does:**
- **Performance-based matching:**
  - "Agent A has 95% success on frontend issues → assign frontend work"
  - "Agent B struggles with database migrations → avoid assigning"
- **Auto-assignment:**
  - When issue becomes ready → automatically assign to best agent
  - Respect team policies (M+ issues need human approval)
- **Skills inference:**
  - System learns which agents are good at what
  - Suggests training/improvement areas for struggling agents
- **Workload balancing:**
  - Don't overload one agent
  - Distribute work fairly across team's agent pool

**Why it's premium:** Requires ML model, historical data analysis, recommendation engine

**Technical requirements:**
- Agent performance database
- ML recommendation model
- Auto-assignment automation
- Override controls for humans

---

## Category 3: Team Intelligence & Insights

**Problem:** Teams have no visibility into bottlenecks, dependencies, risks until too late.

**Premium Features:**

### 3.1 Dependency Impact Analysis
**Who needs it:** Project managers, technical leads

**What it shows:**
- **Dependency visualization:**
  - Interactive graph of all dependencies
  - Critical path highlighting (longest chain)
  - Bottleneck detection (most-blocking artifacts)
- **Impact simulation:**
  - "If A.1.5 is delayed by 3 days, show downstream impact"
  - "If we cancel A.2, what gets unblocked?"
- **Risk scoring:**
  - Deeply coupled artifacts = higher risk
  - Long dependency chains = delivery risk
  - Suggest dependency refactoring to reduce coupling

**Why it's premium:** Requires graph analysis, simulation engine, visualization

**Technical requirements:**
- Dependency graph builder
- Critical path algorithm
- Impact simulation engine
- Interactive web visualization

---

### 3.2 Predictive Analytics
**Who needs it:** Project managers, engineering leads, execs

**What the AI predicts:**
- **Delivery forecasting:**
  - "Milestone A.2 will be late by 3 days (80% confidence)"
  - Based on: current velocity, remaining work, historical patterns
- **Scope creep detection:**
  - "Issue A.3.2 is high risk to expand (acceptance criteria complexity)"
  - "This artifact has 5 sub-tasks, avg is 2 → might be too big"
- **Agent performance warnings:**
  - "Agent X struggles with frontend (60% success rate)"
  - "Consider human review or different agent"
- **Prioritization signals:**
  - "Initiative B will unblock 15 other pieces of work when complete"
  - "Focus here for maximum throughput"

**Why it's premium:** Requires ML models, historical data, forecasting algorithms

**Technical requirements:**
- Time-series forecasting model
- Complexity analysis (NLP on acceptance criteria)
- Agent performance ML
- Prioritization ranking algorithm

---

### 3.3 Velocity & Burndown
**Who needs it:** Project managers, scrum masters, executives

**What you can track:**
- **Team velocity:**
  - Issues completed per week (trending)
  - Human vs. AI velocity comparison
  - Velocity by artifact type (frontend faster than backend?)
- **Burndown charts:**
  - Milestone/initiative burndown
  - Ideal vs. actual progress
  - Forecast completion date
- **Cycle time analytics:**
  - Draft → ready: how long?
  - Ready → in_progress: waiting time?
  - In_progress → completed: actual work time?
  - Identify bottlenecks (waiting too long for review?)

**Why it's premium:** Requires time-series data storage, chart generation, analytics

**Technical requirements:**
- Historical metrics database
- Chart rendering engine
- Statistical analysis (trends, averages)
- Web dashboard

---

## Category 4: Intelligence Layer (AI-Powered Assistance)

**Problem:** Creating artifacts, generating context, planning work is time-consuming.

**Premium Features:**

### 4.1 AI Wizard for Artifact Creation
**Who needs it:** All users (premium only!)

**What the AI does:**
- **Intelligent artifact generation:**
  - User: "I want to build a user authentication system"
  - AI: Generates Initiative with:
    - Milestones (OAuth setup, session management, password reset, etc.)
    - Issues per milestone (detailed breakdown)
    - Acceptance criteria suggestions
    - Estimated sizing (XS/S/M/L/XL)
    - Dependency recommendations
- **Smart dependency detection:**
  - AI suggests which issues should block which
  - Warns about circular dependencies
  - Optimizes dependency graph for parallel work
- **Template application:**
  - "This looks like a CRUD feature" → apply CRUD template
  - Team-specific templates learned from past work

**Why it's premium:** This IS the premium value - AI assistance is not free tier

**Technical requirements:**
- LLM integration (OpenAI/Anthropic API)
- Artifact generation prompts
- Dependency graph optimizer
- Template matching ML

---

### 4.2 Living Context™ (AI-Enhanced)
**Who needs it:** Developers, AI agents

**What it provides:**
- **Auto-updating context:**
  - Parent artifact changes scope → child contexts update automatically
  - Dependency completes → dependent's context refreshes
  - Codebase changes → relevant artifacts get updated context
- **Cross-artifact knowledge graph:**
  - Semantic search: "Find all issues related to authentication"
  - Related work suggestions: "You're working on A.1.5? Check A.2.3 too"
  - Pattern detection: "This is similar to work we did 2 months ago"
- **Context quality AI:**
  - Analyzes context completeness
  - Suggests improvements: "Add examples to acceptance criteria"
  - Warns about missing critical info

**Why it's premium:** Requires AI processing, knowledge graph, cloud storage

**Technical requirements:**
- Vector embedding for semantic search
- Knowledge graph database
- LLM for context analysis
- Change detection and propagation system

---

### 4.3 Team Knowledge Base
**Who needs it:** All team members, especially new hires

**What it captures:**
- **Automatic documentation:**
  - Extracts patterns from `implementation_notes`
  - Builds living documentation from completed work
  - Links artifacts to relevant code/docs
- **Pattern library:**
  - "We've solved authentication 3 times, here's the pattern"
  - "Bug X happened before, here's how we fixed it"
  - Best practices learned from team's own work
- **Onboarding acceleration:**
  - New agent/human gets relevant context automatically
  - "Here's what you need to know about Module X"
  - Codebase familiarity scores

**Why it's premium:** Requires NLP, pattern detection, knowledge extraction

**Technical requirements:**
- NLP for extracting insights from implementation_notes
- Pattern matching algorithms
- Knowledge base storage and indexing
- Recommendation engine

---

## Category 5: Multi-Stakeholder Web Interface

**Problem:** Different roles need different views, non-technical stakeholders excluded.

**Premium Features:**

### 5.1 Executive Dashboard
**Who needs it:** CTOs, VPs of Engineering, executives

**What they see:**
- **High-level progress:**
  - Initiative completion percentages
  - Milestone burndown (visual, no details)
  - Team velocity trends
  - At-risk initiatives (red/yellow/green)
- **Strategic insights:**
  - "Initiative B unblocks 3 other initiatives"
  - "Team velocity up 20% this quarter"
  - "AI completing 40% of work autonomously"
- **Executive summaries:**
  - One-paragraph summaries of each initiative
  - Key risks and mitigation plans
  - Resource allocation recommendations

**Technical requirements:**
- Web dashboard (executive-optimized UI)
- Data aggregation for high-level metrics
- Executive summary generation (AI-powered)

---

### 5.2 Manager Dashboard
**Who needs it:** Engineering managers, project managers, scrum masters

**What they see:**
- **Milestone-level granularity:**
  - Which milestones are on track / at risk
  - Dependency bottlenecks
  - Team workload distribution
- **Team performance:**
  - Individual velocity (human + agents)
  - Agent utilization (are we using our agent pool efficiently?)
  - Blocker identification
- **Workflow management:**
  - Approval queue (issues waiting for review)
  - Escalations (stuck agents needing help)
  - Policy violations requiring attention

**Technical requirements:**
- Web dashboard (manager-optimized UI)
- Granular metrics (milestone/issue level)
- Real-time updates (WebSocket or polling)

---

### 5.3 Developer Interface (VSCode Extension + Web)
**Who needs it:** Developers, AI agents

**What they use:**
- **VSCode extension:**
  - Artifact tree view
  - Context generation
  - Start work, generate PR
  - Agent coordination
- **Web interface (when needed):**
  - Artifact editing (YAML)
  - Dependency graph visualization
  - Review queue (PRs to approve)
  - Knowledge base search

**Technical requirements:**
- VSCode extension (already planned)
- Web interface for complex tasks
- Bidirectional sync (VSCode ↔ Web)

---

### 5.4 Non-Technical Stakeholder Interface
**Who needs it:** Product managers, designers, QA, executives

**What they can do:**
- **Trigger AI work:**
  - "Create issue for 'Add dark mode'"
  - AI generates artifact, assigns to agent
  - No need to write YAML or understand git
- **Track progress:**
  - See status of their requested work
  - Get notifications when completed
  - Review results (even if non-technical)
- **Approve/reject work:**
  - Simple "approve" or "request changes" buttons
  - Comment on artifacts without touching code
  - Escalate to engineering if needed

**Why this is revolutionary:** Non-technical users can control AI work!

**Technical requirements:**
- Simplified web interface (no technical jargon)
- AI-powered artifact generation from natural language
- Approval workflow system
- Notification system (email, Slack, etc.)

---

## Category 6: Adaptive User Experience

**Problem:** Software treats all users the same - power users wait for animations, beginners drown in complexity.

**Premium Features:**

### 6.1 Usage Pattern Detection
**How it works:**
- **System tracks:**
  - Which features each user uses most
  - Frequency of commands (CLI, extension, web)
  - Time spent in different views
  - Keyboard shortcuts vs. mouse usage
- **System learns:**
  - "User X is a power user (uses CLI 90% of time)"
  - "User Y is casual (only checks dashboard weekly)"
  - "User Z focuses on milestones (never looks at issues)"

**Technical requirements:**
- Telemetry collection (privacy-respecting)
- User behavior analytics
- ML for pattern classification

---

### 6.2 Personalized Interface
**What adapts:**
- **For power users:**
  - Advanced features surface to top
  - Keyboard shortcuts emphasized
  - Minimal UI (hide beginner guidance)
  - Command palette front and center
- **For casual users:**
  - Guided workflows (step-by-step)
  - More explanatory text
  - Visual aids and tutorials
  - Fewer options shown at once
- **For role-specific users:**
  - Exec sees executive dashboard by default
  - Manager sees team metrics
  - Developer sees artifact tree

**Technical requirements:**
- User profile system
- Dynamic UI rendering based on profile
- A/B testing framework (test adaptations)

---

### 6.3 Feature Boosting
**How it works:**
- **System identifies:**
  - "User relies on dependency graph 80% of time"
  - "User never uses velocity charts"
- **System optimizes:**
  - Dependency graph loads faster for this user
  - Pre-computes dependency data in background
  - Hides velocity chart from main view (less clutter)
  - Suggests keyboard shortcut for dependency graph

**Technical requirements:**
- Per-user feature usage tracking
- Dynamic resource allocation (cache what user needs)
- UI customization engine

---

### 6.4 Intelligent Onboarding
**How it works:**
- **For new users:**
  - Start with minimal interface
  - Progressive disclosure (reveal features as needed)
  - Contextual tutorials (when user tries something new)
- **For growing users:**
  - System detects when user is ready for advanced features
  - Suggests: "You're using X a lot, try feature Y (more powerful)"
  - Graduation from beginner → intermediate → power user
- **For team members:**
  - Learn from team patterns
  - "Your team mostly uses features A, B, C - here's a tour"

**Technical requirements:**
- Onboarding flow engine
- Progressive disclosure system
- Team-level pattern aggregation

---

## Category 7: Collaboration & Workflow

**Problem:** Distributed teams lose context, async work is hard, handoffs are messy.

**Premium Features:**

### 7.1 Artifact Subscriptions & Notifications
**Who needs it:** Everyone

**What you can do:**
- **Subscribe to:**
  - Specific artifacts (A.1.5)
  - Entire milestones (A.1)
  - All work by specific agent
  - All work in specific state (ready, blocked)
- **Get notified when:**
  - Status changes (ready → in_progress)
  - Dependencies resolve (blocker completes)
  - Agent completes work (PR ready for review)
  - Policy violations occur
- **Delivery channels:**
  - Email
  - Slack
  - Discord
  - VSCode notification
  - Web dashboard badge

**Technical requirements:**
- Subscription management system
- Event-driven notification engine
- Integration with Slack/Discord/email APIs

---

### 7.2 Review Workflows
**Who needs it:** Engineering managers, quality-focused teams

**What you can configure:**
- **Review requirements:**
  - AI completions always need human review
  - M/L issues need 2+ approvals
  - Critical artifacts need lead engineer approval
- **Approval routing:**
  - Auto-assign reviewers based on expertise
  - Round-robin review distribution
  - Escalation if review not done in X hours
- **Code review integration:**
  - Link artifact to GitHub PR reviews
  - Artifact status updates when PR approved
  - Block merge if artifact not updated

**Technical requirements:**
- Workflow engine
- Reviewer assignment algorithm
- GitHub API integration

---

### 7.3 Team Templates & Standards
**Who needs it:** Engineering leads, teams with processes

**What you can create:**
- **Artifact templates:**
  - Standard acceptance criteria formats
  - Required fields for different artifact types
  - Validation rules (e.g., "All issues must have tests")
- **Constitutional presets:**
  - Frontend team = different rules than backend team
  - Security team = stricter AI policies
- **Context libraries:**
  - Reusable context snippets
  - Common patterns (CRUD, authentication, etc.)
  - Team-specific examples

**Technical requirements:**
- Template storage and management
- Validation engine
- Template application system

---

## Category 8: Integrations & Ecosystem

**Problem:** Teams use many tools - need integration, not another silo.

**Premium Features:**

### 8.1 Two-Way Sync
**What integrates:**
- **Project management:**
  - Jira: Artifacts ↔ Issues
  - Linear: Artifacts ↔ Issues
  - Asana: Artifacts ↔ Tasks
- **Documentation:**
  - Notion: Export artifacts as pages
  - Confluence: Sync documentation
- **Communication:**
  - Slack: Status updates, notifications
  - Discord: Same
  - Microsoft Teams: Enterprise

**Technical requirements:**
- OAuth integration with each platform
- Bidirectional sync engines
- Conflict resolution (what if artifact changes in both places?)
- Webhook handlers

---

### 8.2 Webhook & API Access
**What it enables:**
- **Custom automation:**
  - Trigger external systems on artifact events
  - "When milestone completes → deploy to staging"
  - "When agent stuck → page on-call engineer"
- **Custom dashboards:**
  - Build internal tools using Kodebase API
  - Embed metrics in company dashboard
  - Custom reporting for executives
- **Zapier/Make/n8n:**
  - No-code integrations
  - Connect to 1000+ tools

**Technical requirements:**
- REST API (full CRUD on artifacts)
- Webhook system (event subscriptions)
- API documentation and SDKs
- Rate limiting and auth

---

### 8.3 SSO & Enterprise Auth
**Who needs it:** Enterprise customers

**What's supported:**
- **SSO providers:**
  - SAML (Okta, OneLogin)
  - Azure AD
  - Google Workspace
- **RBAC (Role-Based Access Control):**
  - Roles: Admin, Manager, Developer, Viewer
  - Permissions per role
  - Fine-grained (per-initiative, per-milestone)
- **Audit logging:**
  - Who accessed what, when
  - Export for compliance

**Technical requirements:**
- SAML/OAuth integration
- RBAC engine
- Audit log storage and export

---

## Implementation Roadmap

### Phase 1: MVP Premium (With Free Tier Launch)
**Timeline:** 3-4 months

**Must-have for first premium launch:**
1. **AI Wizard** (artifact generation) - THE killer feature
2. **Multi-stakeholder web interface** (exec, manager, developer views)
3. **Basic agent orchestration** (assign, track, notify)
4. **Simple analytics** (velocity, burndown)

**Goal:** Prove premium value, get first paying customers

---

### Phase 2: Team Intelligence
**Timeline:** 2-3 months after Phase 1

**Add:**
1. **Dependency impact analysis**
2. **Predictive analytics** (delivery forecasting)
3. **Living Context™** (auto-updating)
4. **Team knowledge base**

**Goal:** Make teams more efficient with data-driven insights

---

### Phase 3: Adaptive UX
**Timeline:** 3-4 months after Phase 2

**Add:**
1. **Usage pattern detection**
2. **Personalized interfaces**
3. **Feature boosting**
4. **Intelligent onboarding**

**Goal:** Differentiate from all other tools - this adapts to YOU

---

### Phase 4: Enterprise Features
**Timeline:** 2-3 months after Phase 3

**Add:**
1. **SSO & RBAC**
2. **Advanced integrations** (Jira, Linear, etc.)
3. **Compliance exports**
4. **Custom deployment options**

**Goal:** Enterprise ready, high-ticket contracts

---

## Success Metrics

### Free → Premium Conversion
- **Target:** 10% conversion rate (industry standard: 2-5%)
- **Drivers:** AI Wizard, multi-stakeholder interface, agent orchestration

### Premium Retention
- **Target:** 90% annual retention (SaaS benchmark: 85%)
- **Drivers:** Adaptive UX, team knowledge accumulation, integrations

### Average Revenue Per User (ARPU)
- **Target:** $49/user/month on Team plan
- **Expansion:** Upsell to Enterprise at $99+/user/month

### Time to Value (TTV)
- **Target:** User sees value in first week
- **How:** AI Wizard generates first artifacts in minutes

---

## Competitive Advantages (Defensible Moats)

1. **Event-sourced audit trail** - No one else has this
2. **Constitutional AI governance** - Unique to Kodebase
3. **Adaptive UX** - No other tool personalizes this way
4. **Multi-agent orchestration** - Only tool built for this
5. **Artifact structure** - Proprietary work breakdown approach
6. **Team knowledge accumulation** - Data moat (more usage = better insights)

---

## Open Questions

### Pricing
- [ ] Is $49/user/month right? Or $39? Or $59?
- [ ] Should there be usage-based pricing (per-agent, per-artifact)?
- [ ] Free trial length (14 days? 30 days?)

### Features
- [ ] Which features from Phase 2-4 should move to Phase 1 (MVP)?
- [ ] Any features that should be free tier (to drive adoption)?
- [ ] Enterprise-only features vs. available on Team plan?

### Technical
- [ ] Cloud architecture (AWS? Vercel? Cloudflare?)
- [ ] Data residency (EU, US, Asia regions?)
- [ ] Offline support (what works without internet?)

### Go-to-Market
- [ ] Launch premium simultaneously with free tier? Or free first?
- [ ] Target early adopters (startups? agencies? enterprises?)
- [ ] Pricing page messaging (what resonates?)

---

## Next Steps

1. **Validate premium features** with potential customers
   - Interview 10-20 engineering teams
   - Show mockups of AI Wizard, multi-stakeholder interface
   - Ask: "Would you pay $49/user/month for this?"

2. **Prioritize Phase 1 features**
   - Must-have vs. nice-to-have
   - Smallest set that proves premium value

3. **Build pricing page**
   - Free vs. Team vs. Enterprise comparison
   - Feature matrix
   - ROI calculator

4. **Technical architecture for premium**
   - Cloud infrastructure
   - Data pipeline (local → cloud)
   - Security and compliance

---

## References

- [PRODUCT-VISION.md](./PRODUCT-VISION.md) - Overall product strategy
- [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) *(to be created)*
- Market research on SaaS pricing and conversion rates *(to be added)*
