# Kodebase Agents Guide

This document provides essential information for AI agents and human developers contributing to the Kodebase repository. Adhering to these guidelines is crucial for maintaining a consistent and efficient development environment.

## Core Technologies

### 1. Package Manager: pnpm

This repository uses **pnpm** for package management. It is the single source of truth for installing, adding, and managing dependencies.

-   **Do not** use `npm` or `yarn`.
-   Always use `pnpm` commands (e.g., `pnpm install`, `pnpm add`, `pnpm run`).

### 2. Monorepo Orchestrator: Turborepo

We use **Turborepo** to manage our monorepo, orchestrate tasks, and optimize builds.

-   Task pipelines and dependencies are defined in `turbo.json`.
-   Familiarize yourself with the `turbo` CLI for running scripts (e.g., `turbo run build`).

### 3. Remote Caching

To accelerate development and CI/CD, this project has **Vercel Remote Caching enabled**. This allows all contributors and automated systems to share a single, distributed cache for task outputs.

-   **Reference**: [Turborepo Remote Caching Documentation](https://turborepo.com/docs/core-concepts/remote-caching)
-   All agents and developers should authenticate with Vercel by running `pnpm dlx turbo login` to connect to the shared cache.
-   Turborepo CLI authorized for migcarva (my vercel account)
-   To disable Remote Caching, run `npx turbo unlink`

### 4. Changelogs and Versioning: Changesets

We use **Changesets** to manage versioning, create changelogs, and publish packages. This automates the release process and ensures changes are documented correctly.

#### The Developer Workflow

Follow these steps whenever you make a code change that should be included in the changelog:

1.  **Make Code Changes**: Edit the code in any package as you normally would.
2.  **Add a Changeset**: After making your changes but before committing, run the following command from the root of the repository:
    ```bash
    pnpm changeset add
    ```
3.  **Answer the Prompts**: The CLI will guide you through a few questions:
    *   **Which packages do you want to include?**: Use the arrow keys and spacebar to select all the packages that your changes have affected.
    *   **Which packages should have a major/minor/patch version bump?**: Select the appropriate semantic versioning bump for each package.
    *   **What is the summary of the changes?**: Write a clear, concise summary. This text will be added directly to the `CHANGELOG.md` file of the selected packages. Good summaries are crucial for communicating changes to users.
4.  **Commit the Changeset**: A new markdown file will be created in the `.changeset` directory. Add this file to your git commit along with your code changes.

> **Note**: The configuration is set up to automatically link to the relevant GitHub pull request and author in each changelog entry, providing excellent context for every change.

#### The Release Workflow

This process is typically handled by a maintainer or an automated CI/CD pipeline:

1.  **Version Packages**: To prepare a new release, run:
    ```bash
    pnpm changeset version
    ```
    This command consumes all changeset files, updates the `version` in the `package.json` of the affected packages, updates their `CHANGELOG.md` files, and then deletes the used changeset files.

2.  **Publish Packages**: After the versioning pull request is merged, run the following to publish the updated packages to the registry:
    ```bash
    pnpm changeset publish
    ```

### 5.  Repository Strategy: Monorepo + Public Mirrors

We use a monorepo + public mirrors strategy to balance development efficiency with public discoverability:
- Main Repository: kodebaseai/kodebase (private monorepo for development)
- Public Mirrors: Individual public repos for each package (e.g., kodebaseai/kodebase-cli, kodebaseai/kodebase-core)

Benefits:
- Development Efficiency: All packages in one repo for easy development and testing
- Public Discoverability: Each package has its own public repo for GitHub stars and community
- Granular Control: Can make individual packages public/private as needed
- Independent Versioning: Each package can have its own release cycle

Implementation:
- Public packages get mirrored to individual public repos
- Private packages remain only in the main monorepo
- Changesets handle versioning and publishing from the main repo
- CI/CD automatically syncs public packages to their mirror repos

This clear separation ensures we never accidentally publish internal tools or applications while maintaining the benefits of a monorepo for development.

### 6. Package Visibility and Publishing

#### **Public Packages (Published to NPM)**
For packages that are intended to be published to the public NPM registry:

1. **Do not** add `"private": true` to their `package.json`.
2. The release visibility is controlled by the `.changeset/config.json` file.

#### **Private Packages (Never Published)**
For any package that should **never** be published to NPM, add:
```json
"private": true
```

This should be the default for:
- Web applications (e.g., Next.js apps)
- Documentation sites
- Internal utilities or shared configurations

### 7. Code Quality: Biome

We use **Biome** for linting and formatting across the entire monorepo. Biome replaces ESLint and Prettier with a single, faster tool.

#### **Configuration**
- **Config file**: `biome.json` in the workspace root
- **Version**: Biome v2.0+
- **Line endings**: `"auto"` for cross-platform compatibility

#### **Available Commands**
```bash
# Lint all files
pnpm lint

# Format all files
pnpm format

# Check all files (lint + format)
pnpm check

# Fix issues automatically
pnpm check:fix
```

#### **Key Features**
- **Single tool** for linting and formatting
- **Faster** than ESLint + Prettier
- **Better TypeScript support**
- **Unified configuration** across the monorepo
- **Turbo integration** for caching

#### **File Patterns**
- **Includes**: TypeScript, JavaScript, JSON, Markdown files
- **Excludes**: `node_modules`, `dist`, `build`, `.turbo`, `coverage`, `*.d.ts`
- **Cross-platform**: Automatically handles line endings per OS
