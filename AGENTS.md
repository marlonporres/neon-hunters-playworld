# Repository Guidelines

## Project Structure & Module Organization

This workspace currently contains only `AGENTS.md`. There are no source files, tests, assets, dependency manifests, or Git metadata yet.

When adding the initial implementation, organize application code under `src/`, automated tests under `tests/`, and static resources under `assets/` where appropriate. Keep configuration files at the root. Update this guide to describe the actual layout once the project structure is established.

## Build, Test, and Development Commands

No build, test, or local development commands are configured. Do not assume that commands such as `npm test` or `make build` are available.

Use `rg --files --hidden` to inspect workspace files. When introducing tooling, document the exact dependency installation, development, build, and test commands here, including any required runtime versions.

## Coding Style & Naming Conventions

Primary gameplay target is touch on landscape tablets, with phones supported responsively. Keyboard/mouse remain development and fallback inputs. Preserve the existing characters, music, hub and shared controller. Normalize input across devices, use forgiving targets, and keep one authoritative animation loop. Minigames must have clean enter/exit lifecycles, bounded effects, no fail states and no precision requirement. Cap pixel ratio at 1.25–1.5 and verify pointer cancellation, multi-touch, tablet layouts and repeated transitions.

Use spaces for indentation and follow the selected language's standard formatter. In Markdown, use descriptive headings, fenced code blocks for command examples, and two spaces for nested list indentation.

Choose descriptive filenames and identifiers. Keep naming consistent within each module. Add formatter and linter configuration alongside the first source files, and document their invocation here.

## Testing Guidelines

No test framework or coverage threshold is established. Select a framework appropriate to the implementation language and provide a reproducible test command.

Name tests after the behavior they verify and follow the framework's discovery conventions. Cover new functionality, failure cases, and regressions from bug fixes.

## Commit & Pull Request Guidelines

There is no Git history from which to infer commit conventions. Once Git is initialized, use concise, imperative subjects such as `Add configuration loader`.

Pull requests should describe the change, explain its purpose, link relevant issues, and report validation performed. Include screenshots for visible interface changes and identify any setup changes.

## Security & Configuration

Keep credentials and local secrets out of version control. Provide sanitized configuration examples and document required environment variables when configuration is introduced.
