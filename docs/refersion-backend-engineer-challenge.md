# Refersion Backend Engineer Challenge

![](https://docs.google.com/docs-images-rt/ALKuztZr8WNP4O9CBs5sOfkA_zo63qoWKUG3127Mp3aV308CZh_fq1UCWSnPYPeUJPltiYbcZMeyZFwr8Esfp-OD9cqUkQ7f4NffIpWfwcJQDzqdo6AezNxRquMhpWQ93-yA1wque2HE8yrPDXI77tXB=s2048)

## The Challenge

Thank you for agreeing to do this assignment. AI tools are welcome. We evaluate your engineering decisions, how you verify correctness, and your ability to explain and modify the submitted solution. Spend no more than 90 minutes; document unfinished work and your next steps. You MUST deliver your code as a repository in GitHub.

## Project Objective

Build a leaderboard of the top five affiliates in a Refersion account according to their lifetime total commission.

Your task is to create a leaderboard that interacts with the Refersion API to retrieve and display information about affiliates' performance. Your leaderboard should:

1. Fetch all affiliates from the [List Affiliates endpoint](https://refersion.dev/docs/api-reference/affiliate-index/) (GET /affiliates). Read records from data and paginate with page and limit; start at page=1 and continue until a page returns fewer records than the requested limit.

2. Retrieve each affiliate's custom-field values from the [Get Affiliate Custom Fields endpoint](https://refersion.dev/docs/api-reference/affiliate-get-custom-fields/) (GET /affiliates/{affiliateId}/custom-fields), using the affiliate's id from the list response. Read the fields from data.

3. Display the top five eligible affiliates in tabular format, ranked by performance.total.commission from highest to lowest. Eligibility is determined by the "Display in leaderboard" custom field described below.

## API Access

Client ID: `<REFERSION_CLIENT_ID>`

Client Secret: `<REFERSION_CLIENT_SECRET>`

API base URL: https://api.refersion.com/v2026-08

See the [Authentication guide](https://refersion.dev/docs/api-reference/authentication/).

## Considerations

- Only include affiliates whose custom field has label "Display in leaderboard" and value equal to the string "TRUE".

- Your code should be well organized, logical, and adhere to industry standards and best practices.

- Handle API responses and errors appropriately.
