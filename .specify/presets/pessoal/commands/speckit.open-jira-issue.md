---
description: Create a Jira issue from the client demand passed as input, and report the issue key so /speckit.specify can run next.
---

## User Input

```text
$ARGUMENTS
```

The input is the client's demand, pasted as-is. Supported override (optional): `--type <Task|Story|Bug|Enhancement>` (default from `jira.default_issue_type`). Everything else is the demand text.

## Goal

Open **one** Jira issue in the configured project that captures the client's demand, then report the issue key. This command does **not** write the spec, does **not** create branches, and does **not** invent requirements.

## Configuration

Read `.specify/pessoal.yml`. The Jira section is required:

```yaml
jira:
  site: "https://your-domain.atlassian.net"
  cloud_id: "<Atlassian cloudId used by the MCP server>"
  project: "ABC"
  language: "pt-BR"
  default_issue_type: "Task"
```

If `jira.cloud_id` or `jira.project` is missing, STOP and show the snippet above. Do not guess the board.

## Non-Negotiable Rules

- The demand text is the source of truth. Never add requirements, acceptance criteria, or scope the client did not state. Gaps are left for `/speckit.specify` to clarify.
- Keep the client's original wording in the description; do not paraphrase it away.
- Create at most one issue. Never create a duplicate of an existing open issue.
- Summary and description in `jira.language` (default `pt-BR`).

## Execution Steps

### 1. Validate the Input

- If `$ARGUMENTS` is empty, STOP and ask for the client demand text.
- Parse `--type` if present; otherwise use `jira.default_issue_type` (default `Task`).

### 2. Avoid Duplicates

Search open issues with a few distinctive keywords from the demand:

```
tools.atlassian.executeRead({
  cloudId: "<jira.cloud_id>",
  name: "searchJiraIssuesUsingJql",
  inputs: { jql: 'project = <jira.project> AND statusCategory != Done AND summary ~ "<distinctive keywords>" ORDER BY created DESC', maxResults: 5 }
})
```

- If an open issue clearly covers the same demand, report its key and URL and STOP. Do not create anything.
- Weaker matches: mention them in the report, then continue.

### 3. Create the Issue

```
tools.atlassian.createJiraIssue({
  cloudId: "<jira.cloud_id>",
  projectKey: "<jira.project>",
  issueType: "<type>",
  summary: "<short, specific title in jira.language, max ~80 chars, no prefix like 'feat:'>",
  description: "<markdown, shape below>"
})
```

Description shape:

```markdown
## Demanda do cliente

<original wording, quoted>

## Contexto

<only what the demand states or what is directly observable>

## O que precisa ser feito

- ...

## Fora de escopo

- <only when the client said so>

## Observações

- ...
```

Keep it short. Do not invent acceptance criteria; `/speckit.specify` will clarify them.

### 4. Report

- Issue key and URL.
- The project, type, and summary used.
- Any duplicate or weak match found.
- The next step: `/speckit.refine <KEY>` or `/speckit.specify`.

## Done When

- [ ] Demand validated and not empty.
- [ ] Duplicate search done.
- [ ] Exactly one issue created (or an existing duplicate reported).
- [ ] Key and URL reported.
