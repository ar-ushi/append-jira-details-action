
# Add Jira Details to PR GitHub Action

## Overview

The "Append Jira Details to PR" GitHub Action is designed to enhance your Pull Request (PR) workflow by seamlessly integrating Jira details into your PRs. This action performs three main updates:

1. **Update PR Title:** It updates the title of the Pull Request to include the Jira ID and Summary.
2. **Append Jira Description:** It appends the Jira description to the body of the Pull Request, providing additional context.
3. **Update Label:** It updates the label on the PR based on the Jira Issue Type.

This action simplifies the collaboration between your GitHub repository and Jira project, ensuring that your PRs are enriched with relevant Jira information.

## Requirements

To ensure that Jira issues are correctly linked, the Jira Identifier must be included in one of the following:

1. **PR Title**: The Jira Identifier should be mentioned in the title of the pull request. For example: `Fix issue with login ABC-1`.

2. **Branch Name**: The Jira Identifier should be part of the branch name associated with the pull request. Examples include:
   - `ABC-1`
   - `fix/ABC-1`

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
    - name: Append Jira Details to PR
      uses: ar-ushi/append-jira-details-action@v1
       with: 
          token: ${{ secrets.GITHUB_TOKEN }}
          orgUrl: 'https://mock-jira-enterprise.atlassian.net'
          jiraToken: ${{ secrets.JIRA_TOKEN }}
          username: ${{ secrets.PR_USERNAME }}
          jiraKey: 'MOE,LOSIM'
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

### `jiraKey` (required)

The key(s) associated with the Jira project. This can be a single key or an array of keys used to identify Jira issues. For example:

- For a single key: `MOE`
- For multiple keys: `MOE, ABC`

**Note**: Ensure the keys you provide match the project identifiers used in your Jira instance.

This workflow will trigger the action when a new pull request is opened, ensuring that Jira details are appended to the PR for better traceability.
