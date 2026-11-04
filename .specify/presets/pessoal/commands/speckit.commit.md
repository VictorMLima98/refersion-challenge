---
description: Create a standardized git commit (Conventional Commits, English) scoped to the active Spec Kit feature or current branch. Stages and commits the current changes; never pushes.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). If it provides text, honor it as the desired subject (or a full `type(scope): subject`), still written in **English**.

## Pre-Execution Checks

**Check for extension hooks (before commit)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_commit` key.
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable.
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation.
- For each executable hook, output the following based on its `optional` flag:
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

Create **exactly one** git commit for the current working changes, with a **standardized message written in English**, following the Conventional Commits specification and scoped to the active Spec Kit feature or current branch. This command stages and commits; it **never pushes** and **never amends** unless the user explicitly asks.

## Non-Negotiable Rules

- **Language: always English**, regardless of the language used in the conversation or in the change.
- **Format**: `type(scope): description`
  - `description`: imperative mood ("add", "fix", "remove"), lowercase, no trailing period, ≤ 72 characters.
- **Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`.
- **Scope**: derived from the active feature (see Step 2), normalized to lowercase `[a-z0-9._-]`.
- **Body** (optional): short English bullets describing what and why, wrapped at 72 columns; add a `Refs: <KEY>` line when an issue key is known (e.g., `ABC-123`).
- **Never** add assistant/AI attribution, `Co-Authored-By` tags, or "Generated with ..." footers.
- **Never** commit secrets (`.env`, credentials, keys) or files that are git-ignored.
- If `$ARGUMENTS` supplies a full `type(scope): subject`, use it as-is (it must be English). If it supplies only a subject, infer `type(scope)` as below and use the given subject.

## Execution Steps

### 1. Inspect State

- Confirm a git repo: `git rev-parse --git-dir`.
- Read: `git branch --show-current`, `git status --short`, `git diff --stat`.
- If there are **no changes** (neither staged nor unstaged, excluding ignored files), report "nothing to commit" and stop.
- Note any staged changes already present (do not silently discard them).

### 2. Resolve Scope

Resolve the feature scope, in this order:
1. `.specify/feature.json` → basename of `feature_directory` (e.g., `specs/ABC-123` → `ABC-123`).
2. Current git branch name, stripping a leading `feature/`, `feat/`, `fix/`, `hotfix/`, `chore/`.
3. Repository directory name.

Normalize to lowercase `[a-z0-9._-]` (e.g., `feature/ABC-123` → `abc-123`).

### 3. Choose Type

Infer the type from the change set (`git diff --stat` + file paths):
- `docs`: only documentation/spec artifacts (`*.md`, `specs/`, README).
- `test`: only test files (`tests/`, `test/`, `__tests__/`, `*.test.*`, `*.spec.*`).
- `chore`: only dependencies, lockfiles, config, tooling.
- `refactor`: source changed without new behavior.
- `fix`: corrects a defect (bug fix), including flag/regression fixes.
- `feat`: adds capability (default when new source files are introduced).

`$ARGUMENTS` overrides the inference.

### 4. Compose the Message

- Header: `type(scope): subject` (English, imperative, ≤ 72 chars).
- Optional body: concise English bullets; include `Refs: <KEY>` when an issue key like `ABC-123` is available.
- Build it with a heredoc so the body preserves newlines.

### 5. Stage and Commit

- Stage everything unless the user named specific paths: `git add -A`.
- Re-check `git status --short` and abort if a secret or ignored file would be committed.
- Commit:
  ```sh
  git commit -m "$(cat <<'EOF'
  <header>

  <optional body>
  EOF
  )"
  ```
- Confirm with `git log --oneline -1`.

### 6. Report

Report:
- Commit hash and branch.
- Number of files committed.
- The full commit message.

## Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion.**

Check if `.specify/extensions.yml` exists in the project root.
- If it does not exist, or no hooks are registered under `hooks.after_commit`, skip to the report.
- If it exists, read it and look for entries under `hooks.after_commit`.
- If the YAML cannot be parsed or is invalid, skip hook checking silently.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** interpret or evaluate `condition`; a non-empty `condition` means skip.
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

- [ ] Exactly one commit created with an English, Conventional Commits message (`type(scope): subject`).
- [ ] Scope derived from the active feature; type inferred (or overridden by `$ARGUMENTS`).
- [ ] No secrets, no ignored files, no AI attribution; nothing pushed.
- [ ] Commit hash, branch, file count, and full message reported.
