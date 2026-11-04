# Personal Base

A bundled preset for my own repositories. It adds the workflow commands I use
around Spec Kit: one commit, one pull request, a tagged release, and Jira
intake/refinement.

## Commands

| Command | What it does |
| --- | --- |
| `/speckit.setup-pessoal` | Creates or updates `.specify/pessoal.yml` for Jira, release, and pull request settings. |
| `/speckit.commit` | Creates one Conventional Commits commit, scoped to the active feature or branch. Never pushes. |
| `/speckit.openpr` | Pushes the branch and opens a PR using the repository template. Never merges. |
| `/speckit.open-release` | Opens a release PR for the next semantic version, computed from tags and Conventional Commits. Never merges. |
| `/speckit.send-release` | Merges the release PR, creates the annotated version tag, and prints a ready-to-send release note. |
| `/speckit.refine` | Refines a Jira issue into an implementable card and can write it back. |
| `/speckit.open-jira-issue` | Creates one Jira issue from a client demand. |

## Install

The preset is bundled with this fork, so no download is needed.

```bash
# One-time: install the CLI from the personal fork
uv tool install --force specify-cli --from git+https://github.com/VictorMLima98/spec-kit.git

# New project: install the base during init
specify init . --integration opencode --preset pessoal

# Existing Spec Kit project: add the base later
specify preset add pessoal

# Update after pulling a new fork version
specify preset update pessoal
```

## Configuration

The commit and pull-request commands work without configuration: they read the
repository remote, the default branch, and the active Spec Kit feature. Release
and Jira commands read `.specify/pessoal.yml` when it exists.

Run `/speckit.setup-pessoal` in the agent to create or update the file
interactively. It detects the default branch, the PR template, and the last
release tag, and only asks for what it cannot infer. You can also write the file
by hand:

```yaml
jira:
  site: "https://your-domain.atlassian.net"
  cloud_id: "<Atlassian cloudId used by the MCP server>"
  project: "ABC"
  language: "pt-BR"
  default_issue_type: "Task"

release:
  source_branch: "develop"
  target_branch: "master"
  version_command: ""              # optional; must print {"current","next","type"}
  changelog_languages: ["en", "pt-BR"]

pr:
  base_branch: ""                  # empty = develop if it exists, else the remote default
  template: ".github/pull_request_template.md"
  quality_command: ""              # e.g. "composer ci:check", "npm test"
  language: "en"
```

`jira.cloud_id` and `jira.project` are required for the two Jira commands. The
Atlassian MCP server must be available in the agent session.

## Pull Request Template

The preset ships `templates/pull_request_template.md` — the santtas template,
kept as a starting point. `/speckit.setup-pessoal` copies it to
`.github/pull_request_template.md` when the repository has no template, and only
replaces an existing one after explicit confirmation. It mentions
`composer ci:check` and Laravel paths, so edit it in repositories that use
another stack.

The release commands default to `develop` → `master`. In a repository that uses
other branches, set `release.source_branch` and `release.target_branch`; the
commands stop instead of guessing when the configured branch is missing.

## Design Notes

- **No hardcoded repository, project, or version.** Everything is read from git
  or from `.specify/pessoal.yml`.
- **No AI attribution** in commits or pull requests.
- **No destructive operations.** Commands never force-push, never delete tags,
  and only merge when the command is explicitly `/speckit.send-release`.
- **Templates win.** `/speckit.openpr` uses the repository's own PR template and
  falls back to a minimal body only when the template is missing.

## Development

```bash
# Try the preset from this checkout
specify preset add --dev ./presets/pessoal

# Check that a command resolves
specify preset resolve speckit.commit

# Remove it
specify preset remove pessoal
```
