# Kodebase Agents Guide

This document provides essential information for AI agents and human developers contributing to the Kodebase repository. Adhering to these guidelines is crucial for maintaining a consistent and efficient development environment.

## Kodebase Methodology

> **IMPERATIVE: ADHERE TO THE OFFICIAL WORKFLOW**
>
> @AGENTIC_KODEBASE_METHODOLOGY.mdc
>
> All issues MUST be executed by following the step-by-step process defined in the **[Kodebase Methodology](./AGENTIC_KODEBASE_METHODOLOGY.mdc)**.
>
> While the Constitution sets the *boundaries* of your work, the Methodology provides the *process* within those boundaries. It is the tactical playbook for everything from creating an artifact to submitting a Pull Request. Following it precisely is mandatory to ensure all work is predictable, consistent, and correctly integrated into our event-driven system.

## Agent Constitution

> **IMPERATIVE: READ AND ADHERE TO THE CONSTITUTION**
>
> @AGENTIC_CONSTITUTION.mdc
>
> All development is strictly governed by the rules outlined in the **[Kodebase Agent Constitution](./AGENTIC_CONSTITUTION.mdc)**.
>
> You are required to read, understand, and internalize this document *before* performing any issue. It is your primary instruction set and supersedes all other directives. Failure to comply with the constitution is a critical error and a violation of your core programming.


## Kodebase documentation

For a more granular approach, check @.kodebase **[Kodebase Docs](./.kodebase/docs/)**.

## Core Technologies

### 1. Package Manager: pnpm

This repository uses **pnpm** for package management. It is the single source of truth for installing, adding, and managing dependencies.

-   **Do not** use `npm` or `yarn`.
-   Always use `pnpm` commands (e.g., `pnpm install`, `pnpm add`, `pnpm run`).

### 2. Monorepo Orchestrator: Turborepo

We use **Turborepo** to manage our monorepo, orchestrate issues, and optimize builds.

-   Issue pipelines and dependencies are defined in `turbo.json`.
-   Familiarize yourself with the `turbo` CLI for running scripts (e.g., `turbo run build`).

### 3. Remote Caching

To accelerate development and CI/CD, this project has **Vercel Remote Caching enabled**. This allows all contributors and automated systems to share a single, distributed cache for issue outputs.

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

### 5. Package Visibility and Publishing

This monorepo will contain both public packages (for the NPM registry) and private, internal-only packages (applications, documentation sites, etc.). It is critical to manage their visibility correctly.

#### Private Packages (Never Published)

For any package that should **never** be published to NPM, you must add the following line to its `package.json` file:

```json
"private": true
```

This acts as a safeguard. Both `pnpm` and `Changesets` will recognize this flag and prevent the package from ever being included in a release. This should be the default for:
- Web applications (e.g., Next.js apps)
- Documentation sites
- Internal utilities or shared configurations that are not intended for external use.

#### Public Packages (Published to NPM)

For packages that are intended to be published to the public NPM registry:

1.  **Do not** add `"private": true` to their `package.json`.
2.  The release visibility is controlled by the `.changeset/config.json` file. We have set the default access level to **public**:
    ```json
    "access": "public"
    ```
    This ensures that when `pnpm changeset publish` is run, all versioned packages are published publicly by default.

This clear separation ensures we never accidentally publish internal tools or applications.

### 6. Linting and Formatting: Biome

This repository uses **Biome** as its all-in-one tool for linting and formatting. It is the single source of truth for code style and quality.

-   **Do not** use `ESLint` or `Prettier`. These tools have been intentionally removed to favor Biome's superior performance and simplified configuration.
-   The configuration is managed in the root `biome.json` file.
-   Run `pnpm format` to automatically format all files.
-   Run `pnpm lint` to automatically fix all safe-to-fix linting issues.
-   In CI, `turbo run format:check` and `turbo run lint:check` are used to verify code quality.

### 7. Development Environment
To ensure consistency across all environments, this repository uses specific versions of our core tooling. These are enforced automatically.
-   **Node.js**: The project requires **Node.js v22.0.0** or later, as defined in the `engines` field of the root `package.json`.
-   **pnpm**: The exact version of `pnpm` is managed via the `packageManager` field in the root `package.json`. Tools like Corepack (included with Node.js) will automatically use this version, so no global installation is necessary.

### 8. Continuous Integration (CI)
This repository uses **GitHub Actions** to automatically run checks on every pull request targeting the `main` branch.
-   **Workflow File**: The configuration is located at `.github/workflows/ci.yml`.
-   **Checks**: The CI pipeline automatically runs the following verification steps:
    -   `format:check`
    -   `lint:check`
    -   `check-types`
    -   `build`
-   **Merge Policy**: All checks in the CI pipeline **must pass** before a pull request is merged. While branch protection rules are not formally enforced on private repositories on GitHub's free initiative, it is a strict project policy that developers must manually verify a green checkmark before merging.

### 9. Testing

This repository uses **Vitest** as its testing framework. It is configured for a monorepo setup and is integrated into our CI pipeline.

-   **Framework**: Vitest (`vitest.dev`)
-   **Configuration**: All configuration is handled in the root `vitest.config.ts` file. It is set up to find and run tests in all packages and applications.
-   **Environment**: Tests run in a `jsdom` environment to simulate a browser, which is necessary for testing UI components.
-   **Running Tests**:
    -   `pnpm test`: Runs all tests once. This is the command used in the CI pipeline.
    -   `pnpm test:watch`: Runs all tests in an interactive watch mode, which is useful for local development.
-   **CI Integration**: The `pnpm test` command is a required check in the GitHub Actions workflow, ensuring that no code with failing tests can be merged.

#### Test Environments

The monorepo contains different types of packages (UI components, web apps, CLI tools) which require different testing environments.

-   **Default Environment (`jsdom`)**: The root `vitest.config.ts` is configured with `jsdom` as the default test environment. This is suitable for all frontend packages (`@repo/ui`, `apps/web`, etc.).
-   **Overriding for Node.js Packages**: For packages that run in a Node.js environment, such as a CLI tool, you **must** create a local `vitest.config.ts` file inside that package's directory. This local config will extend the root config but override the environment to `'node'`.
    **Example for `packages/cli/vitest.config.ts`:**
    ```typescript
    import { defineConfig, mergeConfig } from 'vitest/config';
    import rootConfig from '../../vitest.config';
    export default mergeConfig(
      rootConfig,
      defineConfig({
        test: {
          environment: 'node',
        },
      })
    );
    ```
This approach ensures that each package is tested in the correct environment.

### 10. Git Hooks: Husky & lint-staged

- **Tools**: [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged).
- **Purpose**: To ensure code quality before it is committed to the repository.
- **Workflow**:
    - On `git commit`, a `pre-commit` hook is triggered by Husky.
    - This hook executes `pnpm lint-staged`.
    - `lint-staged` runs our Biome `format` and `lint` commands on all staged files (`*.{js,ts,jsx,tsx}`).
    - If any formatting or linting errors are found and cannot be fixed automatically, the commit is aborted.
- **Setup**: The configuration is in the `.husky/pre-commit` file and the `lint-staged` section of the root `package.json`. The `prepare` script in `package.json` ensures Husky is installed automatically after `pnpm install`.

### 11. CSS & Styling: Tailwind CSS

This repository uses **Tailwind CSS** for all styling. We leverage the modern, CSS-first approach available in Tailwind CSS v4, which simplifies configuration and improves performance.

-   **Framework**: Tailwind CSS v4 (`@tailwindcss/postcss`)
-   **Configuration**: All Tailwind configuration is centralized in the `@kodebase/tailwind-config` package, located at `packages/tailwind-config`.
-   **No `tailwind.config.js`**: We do not use a `tailwind.config.js` file. Instead, all theme customizations are defined directly within the CSS using the `@theme` at-rule in `packages/tailwind-config/shared-styles.css`. This is the single source of truth for the design system's tokens.

#### How to Use in an Application

To apply the shared styling and configuration to an application (e.g., a Next.js app), you only need to import the configuration package in your global CSS file.

**Example for `apps/web/app/globals.css`:**

```css
@import "tailwindcss";
@import "@kodebase/tailwind-config";
@import "@kodebase/ui/styles.css";

/* ... app-specific global styles ... */
```

This setup ensures that all applications share the same design tokens and base styles, creating a consistent look and feel across the entire monorepo.

### 12. Component Development & Storybook: Ladle

This repository uses **Ladle** for developing, testing, and documenting React components in an isolated environment. Ladle is configured in the `@kodebase/ui` package.

-   **Framework**: Ladle (`@ladle/react`)
-   **Purpose**: Provides a "storybook" or component gallery for the `@kodebase/ui` package. This allows for:
    -   **Faster Development**: Build and test components without running a full application.
    -   **Living Documentation**: A browsable gallery of all UI components.
    -   **Focused Testing**: Simplifies visual and accessibility testing for each component.

#### How to Use

1.  **Run the Dev Server**: To start the Ladle development environment, run the following command from the root of the repository:
    ```bash
    pnpm --filter @kodebase/ui serve
    ```
    Ladle will be available at `http://localhost:3002`.

2.  **Creating Stories**: Ladle automatically discovers files in `packages/ui/src` that end with the `.stories.tsx` extension. A story file exports one or more React components that represent different states of your UI components.

    **Example for `packages/ui/src/button.stories.tsx`:**
    ```typescript
    import type { Story } from "@ladle/react";
    import { Button } from "./button";

    export const Primary: Story = () => <Button>Hello World</Button>;
    ```

This setup provides a streamlined workflow for building and maintaining a robust and well-documented component library.
