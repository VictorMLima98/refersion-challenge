---
description: Merge the open release PR and create the annotated version tag with an English + Portuguese changelog, plus a ready-to-send stakeholder message. Never force-pushes.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Supported overrides (all optional): `--method merge|squash|rebase` (default `merge`), `--version <x.y.z>` (force the tag name). Anything else is treated as notes.

## Pre-Execution Checks

**Check for extension hooks (before sending the release)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_send_release` key.
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

Merge the open **release PR** (source branch into target branch) and create the corresponding **annotated git tag** (`vX.Y.Z`) whose message contains the changelog in the configured languages. At the end, print a ready-to-send release note for the stakeholder. This command **never force-pushes** and **never deletes tags**.

## Configuration

Read `.specify/pessoal.yml` if it exists. Relevant keys:

```yaml
release:
  source_branch: "develop"         # branch with unreleased work
  target_branch: "master"          # branch that receives the release
  version_command: ""              # optional: prints {"current","next","type"}
  changelog_languages: ["en", "pt-BR"]
```

Missing keys fall back to the defaults shown above. If `target_branch` does not exist, STOP and ask for the correct branch.

## Non-Negotiable Rules

- **Find the release PR, do not invent one.** If there is no open `<source_branch>` → `<target_branch>` PR, STOP and suggest `/speckit.open-release`.
- **Version**: take it from the PR title (`vX.Y.Z`) or `--version`. Never guess beyond that; if the tag already exists on the remote, STOP (a version is never reused).
- **Changelog**: reproduce the changelog from the PR body (all configured languages). If the PR body has none, regenerate it from the commits between the previous tag and `<source_branch>`.
- **Merge method**: `merge` by default (matches a `Merge pull request #N` history). Honor `--method`.
- **Never** force-push; never delete or move an existing tag.
- Prefer the GitHub MCP tools (`tools.github.*`). `gh` is optional (only used for an extra GitHub Release when present).

## Execution Steps

### 1. Inspect State

- `git rev-parse --git-dir`; `git branch --show-current`; `git status --short` (warn if dirty; do not commit).
- Parse owner/repo from `git remote get-url origin`.
- `git fetch --tags --prune --quiet`.

### 2. Find the Release PR

- `tools.github.list_pull_requests({ owner, repo, base: "<target_branch>", head: "<owner>:<source_branch>", state: "open" })`.
- If none, STOP with a clear message. Take the first result's `number`, `title`, `body`, and head SHA.

### 3. Resolve the Version and Guardrails

- Parse `vX.Y.Z` from the PR title; if absent, use `--version`; if still absent, compute it the same way as `/speckit.open-release` (read `release.version_command` or the tags and commits).
- If `git ls-remote --tags origin "refs/tags/vX.Y.Z"` returns a match, STOP: the tag already exists.
- Read the PR state; if it is not mergeable (conflicts / failing required checks), STOP and report the reason.

### 4. Merge the PR

- `tools.github.merge_pull_request({ owner, repo, pullNumber, merge_method: "<method>", commit_title: "<PR title> (#<number>)" })`.
- If `gh` is available and MCP is not, fall back to `gh pr merge <number> --<method>`.

### 5. Create and Push the Tag

- `git fetch origin <target_branch> --quiet`.
- Annotated tag on the merged target head, message carrying the changelog:
  ```sh
  git tag -a "vX.Y.Z" origin/<target_branch> \
    -m "Release vX.Y.Z" \
    -m "<changelog language 1>" \
    -m "<changelog language 2>"
  git push origin "vX.Y.Z"
  ```
- Never use `--force`. Never reuse an existing tag.

### 6. Optional GitHub Release

- If the `gh` CLI is available: `gh release create "vX.Y.Z" --repo <owner>/<repo> --title "vX.Y.Z" --notes "<changelog>" --verify-tag`.
- If not (or no MCP equivalent exists), skip — the annotated tag already carries the changelog. Say so in the report.

### 7. Ready-to-Send Stakeholder Message

Print a copy-paste message in every configured language, e.g.:

```markdown
🇺🇸 Release vX.Y.Z
<English changelog>

🇧🇷 Release vX.Y.Z
<Portuguese changelog>

Released on <date>.
```

### 8. Report

Report: the merge commit SHA, the tag name and URL, whether a GitHub Release was created, and the stakeholder message.

## Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion.**

Check if `.specify/extensions.yml` exists in the project root.
- If it does not exist, or no hooks are registered under `hooks.after_send_release`, skip to the report.
- If it exists, read it and look for entries under `hooks.after_send_release`.
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

- [ ] The open release PR was found and merged (no force-push).
- [ ] Annotated tag `vX.Y.Z` created on the target branch and pushed, carrying the configured changelog.
- [ ] Ready-to-send release note printed.
- [ ] Nothing force-pushed; no tag deleted or reused; report includes the tag name/URL.
