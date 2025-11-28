# Contributing to FarmHand

Thank you for your interest in contributing to FarmHand! This document outlines the process for contributing to the project.

## Branch Strategy

FarmHand uses a structured branching strategy to keep development organized and maintainable.

### Branch Naming Convention

All feature branches must be created under one of the following subfolder prefixes:

- **`feat/`** - New features or functionality
- **`ui/`** - User interface changes and improvements
- **`bugfix/`** - Bug fixes
- **`docs/`** - Documentation updates
- **`refactor/`** - Code refactoring without changing functionality

### Branch Creation

1. **Start from the correct branch:**
   - Always branch from `dev` (the main development branch), OR
   - Branch from another currently active branch that was originally created from `dev`

2. **Create your branch:**
   ```bash
   # Make sure you're on the dev branch and up to date
   git checkout dev
   git pull origin dev
   
   # Create your feature branch with the appropriate prefix
   git checkout -b feat/your-feature-name
   # or
   git checkout -b ui/your-ui-change
   # or
   git checkout -b bugfix/your-bugfix
   # or
   git checkout -b docs/your-docs-update
   # or
   git checkout -b refactor/your-refactor
   ```

### Example Branch Names

- `feat/qr-code-export`
- `ui/dark-mode-toggle`
- `bugfix/schema-validation-error`
- `docs/api-documentation`
- `refactor/schema-context-cleanup`

## Development Workflow

1. **Create your branch** following the naming convention above
2. **Make your changes** and commit them with clear, descriptive messages
3. **Test your changes** locally to ensure everything works
4. **Push your branch** to the remote repository:
   ```bash
   git push origin feat/your-feature-name
   ```

## Pull Request Process

1. **Create a Pull Request** from your branch to `dev`
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots if your changes affect the UI

2. **Wait for review** - Maintainers will review your PR

3. **Address feedback** - Make any requested changes and push updates to your branch

4. **Merge to dev** - Once approved, your PR will be merged into `dev`

## Release Process

Releases are managed by project maintainers:

- `dev` branch contains the latest development work
- When ready for release, maintainers merge `dev` into `main`
- `main` branch represents stable, released versions
- Only authorized maintainers can merge `dev` → `main`

## Code Style

- Follow the existing code style in the project
- Use TypeScript for type safety
- Write clear, descriptive commit messages
- Keep functions focused and modular

## Questions?

If you have questions about contributing, please open an issue or reach out to the maintainers.

Thank you for contributing to FarmHand!

