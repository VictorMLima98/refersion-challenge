---
description: Open a pull request from the current branch using the repository's pull request template. Pushes the branch and creates the PR via the GitHub MCP tools or gh; never merges.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Supported overrides (all optional): `--base <branch>`, `--title "<title>"`, `--draft`, `--reviewers a,b`. Anything else is treated as title guidance.

## Pre-Execution Checks

**Check for extension hooks (before opening the PR)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_openpr` key.
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** interpret or evaluate `condition`; a non-empty `condition` means skip the hook and leave evaluation to the HookExecutor.
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

Create a GitHub pull request for the current branch. Use the repository's pull request template when it exists; otherwise use the minimal default body in Step 6. Push the branch if needed, then create the PR through the GitHub MCP tools (fall back to `gh`). This command **never merges** and **never force-pushes**.

## Configuration

Read `.specify/pessoal.yml` if it exists. Relevant keys:

```yaml
pr:
  base_branch: ""             # empty = auto (develop if it exists, else the remote default)
  template: ".github/pull_request_template.md"
  quality_command: ""         # e.g. "composer ci:check", "npm test", "make test"
  language: "en"
```

Missing keys fall back to the defaults shown above.

## Non-Negotiable Rules

- **Use the template when present**: read `pr.template` (default `.github/pull_request_template.md`) and fill every section. Keep the section headings and order; remove the HTML comment placeholders.
- **Language**: write the PR body and title in `pr.language` (default **English**).
- **Accuracy**: tick a checkbox only when it is actually true. Never tick the quality gate unless it was run and passed. Use `- [ ]` for unknown/not-applicable.
- **Target repo**: parse `owner`/`repo` from `git remote get-url origin`.
- **Never** merge, close, or force-push. Never push directly to the base branch.
- Prefer the GitHub MCP tools (`tools.github.*`). If they are unavailable and the `gh` CLI exists, fall back to `gh pr create`; if neither is available, stop and report.

## Execution Steps

### 1. Inspect State

- `git rev-parse --git-dir`; `git branch --show-current`; `git status --short`.
- If the working tree is **dirty**, STOP: ask the user to commit first (e.g., via `/speckit.commit`). Do not create a PR from uncommitted work.
- Parse owner/repo: from `git remote get-url origin` (e.g., `git@github.com:owner/repo.git` → `owner` / `repo`). If origin is missing, STOP and report.

### 2. Resolve Base Branch

In order: `$ARGUMENTS` `--base` → `pr.base_branch` → `develop` if it exists on the remote (`git ls-remote --heads origin develop`) → the remote default branch (`git rev-parse --abbrev-ref origin/HEAD`, e.g., `origin/main` → `main`).

### 3. Push the Branch

- If the branch has no upstream or has unpushed commits, push it: `git push -u origin HEAD`.
- Never force-push.

### 4. Avoid Duplicates

- List open PRs for this head branch (`tools.github.list_pull_requests` with `head: "<owner>:<branch>"`, or `gh pr list --head <branch>`).
- If one already exists, report its number/URL and STOP (do not open a second one).

### 5. Gather Context

- Commits: `git log --oneline <base>..HEAD`.
- Diff: `git diff <base>...HEAD --stat`.
- Feature/spec: basename of `feature_directory` in `.specify/feature.json` (e.g., `specs/ABC-123` → `ABC-123`); link `specs/<KEY>/spec.md` when present.
- Issue key: from the branch or spec (`[A-Z][A-Z0-9]+-\d+`).
- Detect only what exists in this repository:
  - migrations changed (`database/migrations/`, `migrations/`, `db/migrate/`),
  - env vars changed (`.env.example`, `config/`),
  - Spec Kit artifacts changed (`specs/`),
  - whether `pr.quality_command` was run in this session (tick only if it passed).

### 6. Compose the Body

- If `pr.template` exists, read it and reproduce its sections, filled. Remove all `<!-- ... -->` placeholders. Keep the headings.
- If it does not exist, use this minimal body:

  ```markdown
  ## What & why

  <one short paragraph from the commits/diff>

  ## How it was tested

  <commands and results, or "Not run">

  ## Checklist

  - [ ] Tests added or updated
  - [ ] Documentation updated
  - [ ] No secrets or credentials included
  ```

- Put the feature/spec link and issue key in the body when available.
- Tick a checkbox only when it is true.

### 7. Title

- `pr.language` (default English), Conventional-Commits style, ≤ 72 chars, e.g. `feat(abc-123): add offline sync`.
- `$ARGUMENTS` `--title` overrides. Keep the issue key in the scope when one exists.

### 8. Create the Pull Request

- Preferred (`tools.github.create_pull_request`):
  ```js
  {
    owner: "<owner>",
    repo: "<repo>",
    title: "<title>",
    head: "<current-branch>",
    base: "<base>",
    body: "<filled template>",
    draft: <true|false>
  }
  ```
- Fallback: `gh pr create --repo <owner>/<repo> --base <base> --head <branch> --title "<title>" --body-file <file>` (write the body to a temp file to preserve newlines).

### 9. Report

Report: the PR number and URL, the base branch, and the PR title.

## Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion.**

Check if `.specify/extensions.yml` exists in the project root.
- If it does not exist, or no hooks are registered under `hooks.after_openpr`, skip to the report.
- If it exists, read it and look for entries under `hooks.after_openpr`.
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

- [ ] Branch pushed; no working-tree changes left uncommitted.
- [ ] PR created (or an existing PR reported) with the body filled from the repository template or the minimal default.
- [ ] Title in the configured language, Conventional-Commits style, scoped to the feature.
- [ ] Nothing merged; no force-push; PR number and URL reported.
