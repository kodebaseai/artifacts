# Spike: AI Agent Git Identity Pattern

## Problem Statement

As AI agents become autonomous contributors to the Kodebase repository, we need a standardized Git identity pattern that enables programmatic distinction between human and AI commits. This is critical for audit trails, automated workflows, and ensuring proper attribution in the Git history.

The current challenge is that Git's `user.name` and `user.email` fields are free-form text, making it impossible to reliably identify AI-generated commits without parsing commit messages or maintaining external mappings.

### Decision Criteria

1. **Programmatic Detection**: Must enable automated tools to distinguish AI vs human commits
2. **Human Readability**: Git logs should clearly show when AI made changes
3. **Audit Compliance**: Must support security and compliance requirements
4. **Scalability**: Pattern must work for multiple AI agents and agent types
5. **Git Compatibility**: Must work with standard Git tools and hosting platforms
6. **Future Extensibility**: Should accommodate future AI agent evolution

## Options Investigated

### Duration: 1 day (July 6, 2025)

### Research Activities
1. Analyzed Git identity patterns in open source projects
2. Reviewed GitHub/GitLab bot identity conventions
3. Tested Git tooling compatibility with various email formats
4. Investigated CI/CD pipeline implications
5. Consulted Git RFC standards for email format requirements

### Option A: Prefix-Based Human Email

```
user.name = "Claude AI Agent"
user.email = "ai-claude-migcarva@kodebase.ai"
```

**Pros:**
- ✅ Uses existing domain infrastructure
- ✅ Human-readable in Git logs
- ✅ Simple to implement

**Cons:**
- ❌ Requires individual email setup for each agent
- ❌ May conflict with email validation systems
- ❌ No clear programmatic detection pattern
- ❌ Scales poorly with many agents

### Option B: Bot Subdomain Pattern

```
user.name = "Claude AI Agent (Session: abc123)"
user.email = "claude.abc123@bots.kodebase.ai"
```

**Pros:**
- ✅ Clear separation via subdomain
- ✅ Session tracking capability
- ✅ Industry-standard pattern

**Cons:**
- ❌ Requires additional DNS/email infrastructure
- ❌ Complex setup for temporary sessions
- ❌ May trigger spam filters
- ❌ Overhead for session management

### Option C: Special TLD Convention

```
user.name = "Agent.Claude.Session.abc123"
user.email = "agent.claude.abc123@tenant.kodebase.ai"
```

**Pros:**
- ✅ Highly structured and parseable
- ✅ Encodes agent type and session
- ✅ Programmatically detectable

**Cons:**
- ❌ Unusual email format may break tools
- ❌ Overly complex for simple use cases
- ❌ May not validate with standard email regex

### Option D: GitHub-Style Bot Pattern

```
user.name = "claude[bot]"
user.email = "claude[bot]@users.noreply.github.com"
```

**Pros:**
- ✅ Follows GitHub's established pattern
- ✅ Clearly identifies as automated
- ✅ Compatible with most Git tools

**Cons:**
- ❌ Ties identity to external platform
- ❌ No session or tenant information
- ❌ Generic noreply domain
- ❌ Limited extensibility

### Option E: Structured Agent Email Pattern

```
user.name = "Claude Agent (migcarva session)"
user.email = "agent.claude.session123@migcarva.kodebase.ai"
```

**Pros:**
- ✅ Clear programmatic pattern (`agent.*@*.kodebase.ai`)
- ✅ Encodes agent type, session, and tenant
- ✅ Human-readable in logs
- ✅ Extensible for future agent types
- ✅ Uses existing domain infrastructure
- ✅ Session-scoped for security

**Cons:**
- ⚠️ Requires tenant-based email routing (minor)
- ⚠️ Slightly longer email addresses

## Analysis

### Programmatic Detection Test

Tested regex patterns for automated detection:

```javascript
// Option E pattern
const AI_AGENT_PATTERN = /^agent\.([^.]+)\.([^@]+)@([^.]+)\.kodebase\.ai$/;

// Example matches
"agent.claude.session123@migcarva.kodebase.ai" // ✅ Matches
"human.user@kodebase.ai" // ❌ Doesn't match
"agent.gpt.abc@acme.kodebase.ai" // ✅ Matches

// Extraction
const match = email.match(AI_AGENT_PATTERN);
if (match) {
  const [, agentType, sessionId, tenant] = match;
  // agentType: "claude", sessionId: "session123", tenant: "migcarva"
}
```

### Git Tooling Compatibility

Tested with standard Git tools:
- ✅ `git log --author` filtering works
- ✅ GitHub/GitLab display correctly
- ✅ Git hooks can parse reliably
- ✅ Standard email validation passes

### Security Implications

- **Audit Trail**: Clear attribution enables compliance
- **Session Isolation**: Session ID enables tracking specific AI instances
- **Tenant Separation**: Multi-tenant support built-in
- **Revocation**: Sessions can be invalidated without affecting other agents

## Decision & Rationale

**Selected: Option E (Structured Agent Email Pattern)**

```
Pattern: agent.[TYPE].[SESSION]@[TENANT].kodebase.ai
Example: agent.claude.session123@migcarva.kodebase.ai
```

### Rationale

1. **Best Programmatic Detection**: Regex pattern reliably identifies AI commits
2. **Future-Proof**: Accommodates multiple agent types and tenants
3. **Security-First**: Session-scoped identities enable fine-grained control
4. **Industry Alignment**: Similar to established bot patterns but more structured
5. **Implementation Simplicity**: Uses existing domain without new infrastructure
6. **Clear Attribution**: Git logs clearly show agent type and session context

### Key Insight

The structured email pattern provides the best balance of human readability and programmatic parsing while remaining compatible with standard Git tooling. The session-based approach also enables security features like agent revocation.

## Implementation Plan

### Immediate Actions
1. Document the pattern in AGENTIC_KODEBASE_METHODOLOGY.mdc
2. Update Git identity setup instructions for AI agents
3. Create helper utilities for generating agent identities
4. Update existing AI agent configurations

### Future Considerations
1. Implement session management for agent identity lifecycle
2. Add Git hook validation for agent identity format
3. Create tooling to analyze AI vs human contribution metrics
4. Consider integration with authentication systems

## Validation Approach

### Success Metrics
- [ ] All AI commits clearly identifiable in Git logs
- [ ] Automated tools can reliably filter AI vs human commits
- [ ] Git tooling remains fully functional
- [ ] Security audit requirements satisfied
- [ ] Pattern scales to multiple agents and tenants

### Validation Steps
1. Deploy pattern to test AI agent
2. Verify Git log clarity and tool compatibility
3. Test programmatic filtering and analysis
4. Validate security and audit capabilities
5. Gather feedback from development team

## Related Issues

### Triggering Issues
- A.1.4: Create Technical Decision (Spike) Framework (this spike demonstrates the pattern)

### Generated Issues
- Future: Update AI agent configuration tooling
- Future: Implement Git hook validation for agent identities
- Future: Create agent session management system

## Lessons Learned

1. **Standard Patterns Work**: Adapting established conventions (like GitHub bots) provides better compatibility
2. **Structure Enables Automation**: Structured data in Git identities unlocks powerful tooling
3. **Security by Design**: Session-scoped identities provide security benefits without complexity
4. **Test Early**: Validating with real Git tools prevents integration issues

## References

### Research Artifacts
- Git email format testing scripts
- Compatibility analysis with GitHub/GitLab
- Regex pattern validation tests

### External References
- [GitHub Bot Identity Patterns](https://docs.github.com/en/developers/apps/identifying-and-authorizing-users-for-github-apps)
- [Git Commit Identity Standards](https://git-scm.com/docs/git-commit)
- [RFC 5322: Internet Message Format](https://tools.ietf.org/html/rfc5322)

---

## Metadata

**Author(s):** Miguel Carvalho
**Created:** 2025-07-07
**Last Updated:** 2025-07-07
**Originating Issue/Milestone:** A.1.4
**Decision Status:** accepted
**Stakeholders Consulted:** Development team, Security review
**Review/Approval:** Self-approved (demonstration spike)
**Tags:** [git, identity, ai-agents, security, audit]

*Spike completed: July 7, 2025*
*Decision implemented in: AGENTIC_KODEBASE_METHODOLOGY.mdc v1.0*