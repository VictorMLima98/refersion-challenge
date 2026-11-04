---
description: Create or update .specify/pessoal.yml with the Jira, release, and pull request settings used by the personal base commands.
---

## User Input

```text
$ARGUMENTS
```

Optional flags:
- `--jira` / `--no-jira`, `--release` / `--no-release`, `--pr` / `--no-pr` — choose which sections to configure. Default: configure all three.
- `--jira-site <url>`, `--jira-cloud-id <id>`, `--jira-project <KEY>`
- `--release-source <branch>`, `--release-target <branch>`

Anything else is ignored; mention it in the report.

## Goal

Create or update `.specify/pessoal.yml` in the current project with the settings used by `/speckit.refine`, `/speckit.open-jira-issue`, `/speckit.open-release`, `/speckit.send-release`, and `/speckit.openpr`.

This command is idempotent: running it again shows the current values and only changes what the user asks to change. It **never writes tokens or passwords**.

## Non-Negotiable Rules

- **Never write secrets.** The Atlassian MCP holds the credentials; this file only stores site, cloudId, project key, branches, and command names.
- **Do not destroy unrelated configuration.** When the file already exists, edit only the keys for the sections being configured; preserve the other sections, keys, and comments.
- **Do not overwrite a non-empty value silently.** Show the current value and ask before changing it, unless the new value came from an explicit flag.
- **Validate before writing.** If the final YAML does not parse, STOP without writing.
- **Do not commit.** This command only writes the file.

## Execution Steps

### 1. Read the Current Config

- If `.specify/pessoal.yml` exists, parse it as YAML. If parsing fails, STOP and show the parser error; do not overwrite the file.
- If it does not exist, start from an empty mapping.
- Show the current values (or "not configured") for the sections being configured.

### 2. Resolve Jira (unless `--no-jira`)

Values, in order: explicit flags → existing file → user answer.

Ask for:

- **Site**: `https://<your-domain>.atlassian.net`. Validate `https://`.
- **Cloud ID**: the Atlassian `cloudId` used by the MCP server. If the Atlassian MCP exposes an accessible-resources tool, list the available sites and let the user pick instead of asking for a UUID. Never invent a cloudId.
- **Project key**: Jira project key, uppercase, 2–10 characters, letters and digits only (`^[A-Z][A-Z0-9]{1,9}$`). If the user types lowercase, uppercase it.
- **Language**: issue language tag (default `pt-BR`).
- **Default issue type**: `Task`, `Story`, `Bug`, or `Enhancement` (default `Task`).

If the user chooses to skip Jira, leave any existing `jira` block untouched and say the two Jira commands will stay unavailable until it is configured.

### 3. Resolve Release (unless `--no-release`)

Detect sensible defaults before asking:

- Remote default branch: `git symbolic-ref --short refs/remotes/origin/HEAD` (strip `origin/`).
- Source default: `develop` if `git ls-remote --heads origin develop` returns a match, else the remote default branch.
- Target default: `master` if it exists on the remote, else the remote default branch.
- Progress so far: `git describe --tags --abbrev=0 --match 'v*'` (report the last tag; do not write it).

Ask for:

- **Source branch** (`release.source_branch`): branch with unreleased work.
- **Target branch** (`release.target_branch`): branch that receives the release.
- **Version command** (`release.version_command`): optional. Leave empty to compute the version from git tags. If set, explain that it must print JSON like `{"current":"v1.2.3","next":"v1.3.0","type":"minor"}`.
- **Changelog languages** (`release.changelog_languages`): default `["en", "pt-BR"]`.

If a chosen branch does not exist on the remote, warn that the release commands will stop, then ask whether to keep it. Do not silently create or rename branches.

### 4. Resolve Pull Requests (unless `--no-pr`)

The preset ships a starter template at
`.specify/presets/pessoal/templates/pull_request_template.md`. It is the santtas
template and uses Laravel/`composer ci:check` wording, so it is a starting point,
not a universal default.

1. Resolve the target path: `pr.template` from the existing config, else
   `.github/pull_request_template.md`.
2. If the target exists, show a short summary and ask whether to keep it
   (default) or replace it with the bundled starter. Never overwrite without an
   explicit confirmation.
3. If the target does not exist, ask whether to copy the bundled starter to it
   (default yes). On yes, create the parent directory (for example `.github/`)
   and copy the file verbatim. If the bundled starter is missing, leave the
   target unset; `/speckit.openpr` will use its minimal default body.
4. Set `pr.template` to the target path, and mention that the copied template
   should be edited when the repository is not Laravel.

Detect defaults:

- **Base branch** (`pr.base_branch`): empty means auto (`develop` if it exists, else the remote default).
- **Quality command** (`pr.quality_command`): if the existing config has one, keep it. Otherwise leave empty unless the repository clearly has one (`composer.json` scripts `ci:check`, `package.json` scripts `test`, or a `Makefile` `test` target) — in that case propose it and ask for confirmation.
- **Language** (`pr.language`): default `en`.

### 5. Write the File

- Create `.specify/` if it is missing (it normally exists after `specify init`).
- Write `.specify/pessoal.yml` with only the configured sections. Keep the keys in this order:

  ```yaml
  jira:
    site: "https://your-domain.atlassian.net"
    cloud_id: "<cloudId>"
    project: "ABC"
    language: "pt-BR"
    default_issue_type: "Task"

  release:
    source_branch: "develop"
    target_branch: "master"
    version_command: ""
    changelog_languages: ["en", "pt-BR"]

  pr:
    base_branch: ""
    template: ".github/pull_request_template.md"
    quality_command: ""
    language: "en"
  ```

- For a skipped section: keep the existing block unchanged; omit it only when it did not exist. Keep any unrelated keys that already existed.
- Re-read the file and parse it. If it does not parse, STOP and report the error.
- Show a short diff (keys created/changed/kept).

### 6. Optional MCP Check

If Jira was configured and the Atlassian MCP is available, make **one read-only call** to confirm the cloudId and project, for example a one-result JQL search:

```
project = <KEY> ORDER BY created DESC
```

- If it succeeds, say the connection works.
- If it fails, report the error and keep the file. Do not guess a fix or delete the config.

### 7. Report

- The path written: `.specify/pessoal.yml`.
- Sections created, changed, kept, or skipped.
- Current values for each configured section.
- The next step: `/speckit.open-jira-issue`, `/speckit.refine`, `/speckit.open-release`, or `/speckit.openpr`.
- Anything that still needs attention (missing MCP, branch that does not exist, empty quality command).

## Done When

- [ ] `.specify/pessoal.yml` exists and parses as YAML.
- [ ] Only the requested sections were changed; unrelated keys and comments were preserved.
- [ ] No token, password, or other secret was written.
- [ ] The final values and next step were reported.
