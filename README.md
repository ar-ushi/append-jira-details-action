
# Append Jira Details to PR GitHub Action

## Overview

The "Append Jira Details to PR" GitHub Action is designed to enhance your Pull Request (PR) workflow by seamlessly integrating Jira details into your PRs. This action performs three main updates:

1. **Update PR Title:** It updates the title of the Pull Request to include the Jira ID and Summary.
2. **Append Jira Description:** It appends the Jira description to the body of the Pull Request, providing additional context.
3. **Update Label:** It updates the label on the PR based on the Jira Issue Type.

This action simplifies the collaboration between your GitHub repository and Jira project, ensuring that your PRs are enriched with relevant Jira information.

## Usage

To use this GitHub Action, you can add the following workflow file (e.g., `.github/workflows/append_jira_details.yml`) to your repository:

```yaml
name: Append Jira Details to PR

on:
  pull_request:
    types:
      - opened
jobs:
  append_jira_details:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4
    - name: Extract Ticket ID from Branch Name
      id: get_jid
      run: |
        branch_name=${{ github.event.pull_request.head.ref }}
        jiraId=$( echo "$branch_name" | cut -d'/' -f1)
        echo "jira_id=${jiraId}" >> "$GITHUB_OUTPUT"
    - name: Append Jira Details to PR
      uses: ar-ushi/append-jira-details-action@v1
      with:
          token: ${{ secrets.GITHUB_TOKEN }}
          jiraId: ${{ steps.get_jid.outputs.jira_id }}
          orgUrl: '{Your Enterprise URL}'
          jiraToken: ${{ secrets.JIRA_TOKEN }}
          username: ${{ secrets.PR_USERNAME }}
```


## Inputs

### `jiraToken` (required)

The Jira API token used for authentication.

### `orgUrl` (required)

The base URL of your Jira Enterprise instance.

### `token` (required)

The GitHub token used to authenticate API requests.

### `username` (required)

The email address to authenticate Jira Rest API Request.

## Example

Here is an example of how the action can be used:

```yaml
on:
  pull_request:
    types:
      - opened

jobs:
  append_jira_details:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4
    - name: Extract Ticket ID from Branch Name
      id: get_jid
      run: |
        branch_name=${{ github.event.pull_request.head.ref }}
        jiraId=$( echo "$branch_name" | cut -d'/' -f1)
        echo "jira_id=${jiraId}" >> "$GITHUB_OUTPUT"
    - name: Append Jira Details to PR
      uses: ar-ushi/append-jira-details-action@v1
      with:
          token: ${{ secrets.GITHUB_TOKEN }}
          jiraId: ${{ steps.get_jid.outputs.jira_id }}
          orgUrl: '{Your Enterprise URL}'
          jiraToken: ${{ secrets.JIRA_TOKEN }}
          username: ${{ secrets.PR_USERNAME }}
```

This workflow will trigger the action when a new pull request is opened, ensuring that Jira details are appended to the PR for better traceability.
