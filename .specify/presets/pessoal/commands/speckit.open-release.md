---
description: Open a release PR from the release branch into the target branch for the next semantic version, computed from Conventional Commits since the last tag, with an English + Portuguese changelog. Never merges.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Supported overrides (all optional): `--version <x.y.z>` (force the version), `--title "<title>"`, `--draft`. Anything else is treated as title guidance.

## Pre-Execution Checks

**Check for extension hooks (before opening the release PR)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_release` key.
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** evaluate `condition`; a non-empty `condition` means skip and leave evaluation to the HookExecutor.
- For each executable hook, output based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding.
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently.

## Goal

Open a **release pull request** from the release branch into the target branch for the **next semantic version**, computed automatically from the Conventional Commits since the last release tag. The PR title carries the version and the body carries the changelog in the configured languages. This command **never merges** and **never pushes** (both branches already exist).

## Configuration

Read `.specify/pessoal.yml` if it exists. Relevant keys:

```yaml
release:
  source_branch: "develop"         # branch with unreleased work
  target_branch: "master"          # branch that receives the release
  version_command: ""              # optional: prints {"current","next","type"}
  changelog_languages: ["en", "pt-BR"]
```

Missing keys fall back to the defaults shown above. If `source_branch` does not exist on the remote, fall back to the remote default branch and say so. If `target_branch` does not exist, STOP and ask for the correct branch.

## Version Source of Truth

- The version lives **only in git tags** (`vX.Y.Z`). Do not read or write a `VERSION` file unless `release.version_command` explicitly does so.
- `owner`/`repo`: parse from `git remote get-url origin`.
- If `release.version_command` is set, run it. It must print JSON like `{"current":"v1.38.0","next":"v1.39.0","type":"minor"}`. If it fails or prints invalid JSON, fall back to the git-tag computation below and say so.
- Otherwise compute from the tags and commits as described in Step 2.

## Non-Negotiable Rules

- **No hardcoded version.** Compute it from the tags and commits (unless `--version` is given).
- **Languages**: produce every language listed in `release.changelog_languages` (default English and Portuguese).
- **Accuracy**: only list merged work (`<last-tag>..origin/<source_branch>`); never invent items.
- Never merge, never force-push, never open a duplicate release PR.

## Execution Steps

### 1. Inspect State

- `git rev-parse --git-dir`; `git branch --show-current`; `git status --short` (a dirty tree is fine here, but warn).
- Parse owner/repo from the remote.
- `git fetch --tags --quiet && git fetch origin <source_branch> <target_branch> --quiet`.

### 2. Resolve the Versions

- If `--version` is provided, use it as the next version and skip the bump (but still build the changelog).
- Else, if `release.version_command` is set, run it and parse `current`, `next`, and `type`.
- Else:
  - Last tag: `git describe --tags --abbrev=0 --match 'v*'`; if none, use `v0.0.0`.
  - Unreleased commits: `git log --no-merges --pretty=format:'%s' "<current>..origin/<source_branch>"`.
  - Bump: **major** for a breaking change (`type!:`, `type(scope)!:`, or `BREAKING CHANGE` in the body), **minor** for `feat`, **patch** otherwise. Example: `v1.38.0` + `feat` → `v1.39.0`.
  - If there are no unreleased commits, STOP: there is nothing to release.

### 3. Build the Changelog

Group the commits by Conventional Commit type and render one section per configured language, from the same data:
- English: Features, Fixes, Performance, Refactor, Documentation, Chores.
- Portuguese: Novidades, Correções, Desempenho, Refatoração, Documentação, Manutenção.
- Keep the issue key when present (e.g., `ABC-123`); strip the `type(scope):` prefix from the item text but keep the scope/issue.

### 4. Avoid Duplicates

- List open PRs `base=<target_branch>` `head=<source_branch>` (`tools.github.list_pull_requests`).
- If one already exists, report it and STOP.

### 5. Create the Release PR

- Title: `chore(release): vX.Y.Z` (`--title` overrides).
- Head: `<source_branch>`; Base: `<target_branch>`; `draft` from `$ARGUMENTS`.
- Body (Markdown):

  ```markdown
  ## What & why

  Release **vX.Y.Z**. Bumps the released version of `<source_branch>` into `<target_branch>`.

  **Previous**: vX.Y.Z(-1) · **Next**: vX.Y.Z · **Type**: minor|patch|major

  ## Changelog (English)

  ### Features
  - ...

  ### Fixes
  - ...

  ## Changelog (Português)

  ### Novidades
  - ...

  ### Correções
  - ...

  ## Notes
  - ...
  ```

- Create via `tools.github.create_pull_request({ owner, repo, title, head: "<source_branch>", base: "<target_branch>", body, draft })`.

### 6. Report

Report: the PR number/URL, the previous and next versions, and the full changelog.

## Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion.**

Check if `.specify/extensions.yml` exists in the project root.
- If it does not exist, or no hooks are registered under `hooks.after_release`, skip to the report.
- If it exists, read it and look for entries under `hooks.after_release`.
- If the YAML cannot be parsed or is invalid, skip hook checking silently.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** evaluate `condition`; a non-empty `condition` means skip.
- For each executable hook, output based on its `optional` flag:
  - **Mandatory hook** (`optional: false`) — emit `EXECUTE_COMMAND:`:
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```

## Done When

- [ ] Current version read from tags (or `release.version_command`); next version computed (or taken from `--version`).
- [ ] Release PR created (or an existing one reported) with the configured changelog languages.
- [ ] Nothing merged; no force-push; PR number/URL and changelog reported.
