# Feature Specification: Affiliate Leaderboard

**Feature Branch**: `001-affiliate-leaderboard`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "docs/refersion-backend-engineer-challenge.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View the top five affiliates (Priority: P1)

A visitor opens the leaderboard page and sees the five eligible affiliates with the highest
lifetime total commission, ranked from highest to lowest, in a clear table.

**Why this priority**: This is the entire purpose of the challenge. Without it the feature
delivers no value.

**Independent Test**: Open the page with an account that has more than five eligible
affiliates and confirm that exactly the five highest-commission eligible affiliates appear, in
descending commission order.

**Acceptance Scenarios**:

1. **Given** an account with at least five eligible affiliates, **When** the visitor opens the
   leaderboard, **Then** the page shows exactly five rows ranked by lifetime total commission,
   highest first.
2. **Given** an account with two eligible affiliates, **When** the visitor opens the
   leaderboard, **Then** the page shows those two affiliates in descending commission order
   without empty filler rows.
3. **Given** an affiliate whose "Display in leaderboard" custom field value is not exactly
   "TRUE" (for example "FALSE", "true", or empty), **When** the leaderboard is displayed,
   **Then** that affiliate does not appear.

### User Story 2 - Understand loading and failures (Priority: P2)

A visitor opens the leaderboard while data is still being retrieved, or when the account data
cannot be retrieved, and receives clear feedback with a way to recover.

**Why this priority**: The data comes from an external service; slow or failed responses are
expected and must not leave the visitor staring at a blank page.

**Independent Test**: Simulate a slow response and an upstream failure and verify that a
visible loading indication appears first and that a failure message with a working retry
action appears afterwards.

**Acceptance Scenarios**:

1. **Given** the data has not arrived yet, **When** the visitor opens the page, **Then** a
   visible loading indication is shown until the leaderboard or an error appears.
2. **Given** the upstream service returns an error, **When** retrieval finishes, **Then** a
   human-readable error message is shown and no partial or misleading leaderboard is displayed.
3. **Given** the error message is visible, **When** the visitor activates the retry action and
   the upstream service has recovered, **Then** the leaderboard is displayed.

### User Story 3 - See an honest empty state (Priority: P3)

A visitor opens the leaderboard for an account where no affiliate qualifies and is told that
there is no one to show instead of seeing a broken or empty table.

**Why this priority**: Prevents confusion when the account legitimately has no eligible
affiliates.

**Independent Test**: Open the page with an account where no affiliate has the required custom
field and confirm an explicit empty message is shown.

**Acceptance Scenarios**:

1. **Given** no affiliate has the "Display in leaderboard" custom field set to exactly "TRUE",
   **When** the visitor opens the page, **Then** an explicit empty-state message is displayed
   and no ranking table is shown.

### Edge Cases

- An account has no affiliates at all: the visitor sees the same empty state as when none are
  eligible.
- Fewer than five affiliates are eligible: all eligible affiliates are shown, without padding.
- Two eligible affiliates have equal lifetime commission: they are ordered deterministically
  (alphabetically by affiliate name, then by identifier) so the order does not change between
  loads.
- An affiliate has a missing or non-numeric lifetime commission: the value is treated as zero
  for ranking and display.
- An affiliate has several custom fields: eligibility requires at least one field whose label
  is exactly "Display in leaderboard" and whose value is exactly "TRUE".
- A page of affiliate records is repeated or malformed: retrieval stops safely instead of
  looping indefinitely.
- Retrieval of any affiliate's custom fields fails: the whole leaderboard reports an error
  rather than silently omitting that affiliate.
- The upstream service is slow: the loading indication remains visible and the page does not
  appear frozen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST retrieve every affiliate from the Refersion account by requesting
  successive pages of affiliates, beginning with the first page and stopping when a page
  contains fewer records than the requested page size.
- **FR-002**: System MUST retrieve each affiliate's custom-field values, keyed by the
  affiliate identifier obtained from the affiliate listing.
- **FR-003**: System MUST consider an affiliate eligible only when at least one custom field
  has the label exactly "Display in leaderboard" and the value exactly the string "TRUE".
  Matching is case-sensitive and does not trim or normalize the value.
- **FR-004**: System MUST rank eligible affiliates by lifetime total commission
  (`performance.total.commission`) in descending order.
- **FR-005**: System MUST display the top five ranked eligible affiliates in a table that
  makes the rank, affiliate identity, and lifetime total commission readable.
- **FR-006**: System MUST show a visible loading state while data retrieval is in progress.
- **FR-007**: System MUST show a human-readable error state when retrieval fails, must not
  display partial or stale results alongside it, and MUST offer a retry action.
- **FR-008**: System MUST show an explicit empty state when no affiliate is eligible or the
  account has no affiliates.
- **FR-009**: System MUST NOT expose API credentials or raw upstream error details to the
  visitor.
- **FR-010**: System MUST guarantee that affiliate pagination terminates even if the upstream
  service returns unexpected data.
- **FR-011**: System MUST format lifetime total commission values consistently as US dollars
  with two decimal places.
- **FR-012**: System MUST present the table with accessible semantics (identifiable caption,
  column headers, and row/column associations) and remain usable on small screens.

### Key Entities *(include if feature involves data)*

- **Affiliate**: An affiliate in the Refersion account. Relevant attributes: unique identifier,
  display name, and lifetime total commission.
- **Custom Field**: A label/value pair attached to an affiliate. Eligibility depends on the
  label "Display in leaderboard" with the value "TRUE".
- **Leaderboard Entry**: A ranked row combining an affiliate's identity, its lifetime total
  commission, and its position from 1 to 5.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of displayed affiliates satisfy the eligibility rule and 100% of eligible
  affiliates with a commission higher than a displayed affiliate also appear.
- **SC-002**: The table never contains more than five rows and is always ordered from highest
  to lowest lifetime total commission, with zero ordering errors in verification.
- **SC-003**: A visitor sees either the leaderboard, an explicit empty state, or an error with
  a retry action within 10 seconds of opening the page under normal network conditions; no
  blank or ambiguous state is ever shown.
- **SC-004**: A visitor can recover from a transient upstream failure with a single retry
  action, with no page reload required.
- **SC-005**: All affiliates in the account are considered, regardless of how many pages the
  affiliate listing spans, verified against accounts with more than one page of affiliates.
- **SC-006**: Credentials and raw upstream error details are absent from everything the
  visitor can inspect.

## Assumptions

- The Refersion account and credentials provided in the challenge are valid and reachable.
- US dollars is the correct currency because the challenge does not specify one.
- Affiliate status (active/inactive) is not a filter criterion; only the leaderboard custom
  field decides eligibility, as stated in the challenge.
- A missing or non-numeric lifetime total commission is treated as zero rather than as an
  error.
- When any affiliate's custom fields cannot be retrieved, the leaderboard shows the error
  state instead of a partially populated ranking; silent omission would be misleading.
- The page is read-only; no authentication, editing, filtering, sorting controls, or
  persistence are in scope.
- Data may be cached for up to 5 minutes; no background refresh or scheduled updates are
  required.
- The feature is validated manually against the live Refersion account and with simulated
  slow, failing, and empty responses.
