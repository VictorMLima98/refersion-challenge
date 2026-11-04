---
description: Refine a Jira issue into a crystal-clear card (user story, business rules, acceptance criteria, scope, edge cases) and optionally write it back.
handoffs:
  - label: Write the Spec
    agent: speckit.specify
    prompt: Write the spec for the refined card
    send: true
---

## User Input

```text
$ARGUMENTS
```

First argument: the Jira issue key (e.g. `ABC-123`).

Optional flags:
- `--write` — write the refined card back to Jira without asking again.
- `--summary "<text>"` — also replace the issue summary (only with `--write`).
- `--no-questions` — do not ask anything; register every gap as an assumption and mark it as such.

## Goal

Read the issue as it is today, find what is missing or ambiguous, ask only what changes the outcome, and produce a card a developer can implement without asking back. Never invent requirements: anything not confirmed by the card, its comments, or the user's answers is an explicit **assumption**.

Language: use `jira.language` from `.specify/pessoal.yml` (default `pt-BR`).

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

## Execution Steps

### 1. Validate

- No key, or it does not match `^[A-Z][A-Z0-9]+-\d+$`: STOP and ask for the key.
- The key must belong to `jira.project`.

### 2. Read the Issue

```
tools.atlassian.getJiraIssue({
  cloudId: "<jira.cloud_id>",
  issueIdOrKey: "<KEY>",
  responseContentFormat: "markdown"
})
```

If `getJiraIssue` is unavailable, use `searchJiraIssuesUsingJql` with `key = <KEY>`.

Collect: `summary`, `description`, `issuetype`, `status`, `labels`, `components`, `parent`/epic, `issuelinks`, and **all comments** (they usually carry the real requirement). Quote the customer's original wording; do not paraphrase it away.

If the description is empty or only has a title: say so, and build the card only from what the user answers.

### 3. Gap Analysis

Check the issue against this list and keep only the gaps that would change the implementation or the acceptance tests:

- **Actor** — who does it and which role exactly.
- **Goal and value** — what changes for that person and why it matters.
- **Scope** — what is explicitly out (other pages, other roles, mobile apps).
- **Rules** — limits, formats, ordering, uniqueness, permissions, paid/free, states.
- **Flow and states** — before/after, success, empty, loading, error, retry, cancel.
- **Data** — inputs, outputs, persistence, migrations, retention.
- **Integrations** — external services, webhooks, emails, jobs.
- **Acceptance criteria** — testable statements, one behavior per criterion.
- **Edge cases** — duplicates, expired data, concurrent actions, timezones, locale.
- **Dependencies** — other issues, feature flags, rollout order.

### 4. Ask

- Ask only the gaps that change the outcome. Group related questions; do not turn this into an interview.
- Prefer concrete choices over open questions.
- With `--no-questions`, do not ask: write every gap as an **Assumption** and mark it for confirmation.

### 5. Produce the Card

Write the card in `jira.language`:

```markdown
## Contexto

<one short paragraph: what exists today and why this issue exists>

## História

Como <ator>, quero <objetivo>, para <valor>.

## Regras de negócio

- ...

## Critérios de aceite

- [ ] ...

## Escopo

**Dentro:** ...
**Fora:** ...

## Casos de borda

- ...

## Premissas

- ...

## Dúvidas em aberto

- ...
```

Rules:
- Every acceptance criterion must be testable.
- Keep the customer's original wording where it matters.
- Do not add requirements that are not in the issue, its comments, or the user's answers.
- Mark every inferred item under **Premissas**.

### 6. Write Back (only with `--write`)

- Use the Atlassian MCP edit tool available in this session to replace the description with the card.
- If `--summary` is given, replace the summary too.
- Never change status, assignee, sprint, or labels unless the user explicitly asks.
- If the edit tool is unavailable, print the final card and say it was not written.

### 7. Report

- Issue key and URL.
- What was asked and what was assumed.
- Whether the card was written back.
- The next step: `/speckit.specify` with the refined card.

## Done When

- [ ] Issue read from Jira with all comments.
- [ ] Only outcome-changing gaps were asked (or recorded as assumptions).
- [ ] Card produced in `jira.language`, with testable acceptance criteria.
- [ ] Written back only when `--write` was passed.
