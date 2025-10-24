# Branch Protection Configuration

This document outlines the recommended branch protection settings for the Kodebase repository.

## Main Branch Protection

### Required Status Checks
- `lint-and-format` - Ensures code quality
- `test` - Ensures all tests pass
- `build` - Ensures packages build successfully
- `security-audit` - Ensures no security vulnerabilities

### Branch Protection Rules
1. **Require a pull request before merging**
   - Require approvals: 1
   - Dismiss stale PR approvals when new commits are pushed
   - Require review from code owners

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Require status checks to pass before merging

3. **Require conversation resolution before merging**
   - All conversations must be resolved

4. **Restrict pushes that create files**
   - Prevent direct pushes to main branch

## Development Branch Protection

### Develop Branch
- Similar protection as main but with relaxed requirements
- Allow force pushes for development workflow
- Require status checks but allow bypass for maintainers

## Code Owners

Create `.github/CODEOWNERS` file:

```
# Global owners
* @migcarva

# Package-specific owners
packages/cli/ @migcarva
packages/core/ @migcarva
packages/ui/ @migcarva

# Apps
apps/web/ @migcarva
apps/docs/ @migcarva

# Configuration files
.github/ @migcarva
biome.json @migcarva
turbo.json @migcarva
```

## Required Checks

### CI Pipeline
- **Lint and Format**: Biome linting and formatting
- **Test**: All tests must pass
- **Build**: All packages must build
- **Security**: No security vulnerabilities

### PR Requirements
- **Changesets**: Must include changeset for package changes
- **Description**: Must include description of changes
- **Size**: Keep PRs focused and reasonably sized

## Automation

### Auto-merge
- Enable auto-merge for PRs that pass all checks
- Require at least one approval
- Require status checks to pass

### Auto-assign
- Auto-assign PRs to package owners
- Auto-assign issues to maintainers

## Security

### Secrets Required
- `NPM_TOKEN`: For publishing packages
- `GITHUB_TOKEN`: For GitHub API access
- `VERCEL_TOKEN`: For Vercel Remote Caching (if using)

### Environment Protection
- Protect main branch from direct pushes
- Require PR reviews for all changes
- Enable security alerts and Dependabot
