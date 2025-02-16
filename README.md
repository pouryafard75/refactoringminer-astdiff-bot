# Refactoringminer-ASTDiff-Exporter


**Refactoringminer-ASTDiff-Exporter** is a GitHub Action that runs RefactoringMiner to generate and upload a diff of refactoring results as a .zip file. This tool can be used for analyzing code changes and refactoring between versions in a GitHub repository.

## Features

- Runs RefactoringMiner to generate a diff of the repository.
- Uploads the diff results as a `.zip` artifact.
- Easy to integrate into your GitHub workflows.

## Usage

### Inputs

| Name       | Description                           | Required |
|------------|---------------------------------------|----------|
| `OAuthToken` | OAuth Token for authentication        | Yes      |
| `URL`       | URL of the commit for the diff operation | Yes      |

### Outputs

| Name         | Description                                     |
|--------------|-------------------------------------------------|
| `artifact_url` | URL to download the generated diff artifact   |

### Example Workflow

```yaml
name: Generate AST Diff

on:
  push:
    branches:
      - main

jobs:
  generate-diff:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run ASTDiff Bot
        uses: pouryafard75/astdiff-bot@v1
        with:
          OAuthToken: ${{ secrets.GITHUB_TOKEN }}
          URL: https://github.com/your-username/your-repository/commit/SHA
