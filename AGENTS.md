# AGENTS

## Typescript

This package uses Typescript and is managed via Bun.

## Bun

We use bun to control our build and other scripts like tests and linting.

## GitHub Actions

We have GitHub actions for

- Closing stale PRs
- Running PR Checks
- Performing a Release

with each of those actions using re-usable action steps related to

- Reusable CI (Unit and Integration Tests)
- Reusable Lint and Format (Ensures we aren't missing any generated files, formatting, or linting pre-reqs)

## Mise

We use mise as our tool to manage the developer environment and our task runner. It allows for dependency management
with small caveats that everything runs in parallel, so sequential dependency management should be done via the `run`
portion of the toml for the task.

## Extra LLM Contexts

Any LLM contexts that we pull from repos/tools will be housed in the [llms](llms) directory. Extra context can be found
in the [docs](docs) directory.
