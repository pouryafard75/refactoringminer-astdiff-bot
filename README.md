# Refactoringminer-ASTDiff-Exporter


**Refactoringminer-ASTDiff-Exporter** is a GitHub Action that runs RefactoringMiner to generate AST Diff and provides screenshot from the diff. This tool can be used for analyzing code changes and refactoring between versions in a GitHub repository.

## Features

- Executes RefactoringMiner to generate an AST Diff for any commit or pull request.
- Generates the webdiff artifact.
- Generates AST Diff screenshots.
- Easy to integrate into your GitHub workflows.

## Usage

### Inputs

| Name       | Description                           | Required |
|------------|---------------------------------------|----------|
| `OAuthToken` | Github OAuthToken for authentication        | Yes (Only for private repos)|
| `URL`       | URL of the commit for the diff | Yes      |
| `Screenshot`       | Name of the file to take the screenshot of  | No      |

### Outputs

| Name         | Description                                     |
|--------------|-------------------------------------------------|
| `artifact_path` | Path to the generated diff artifact (Exported webdiff) |
| `screenshots_path` | Path to the taken screenshots   |


Please visit https://api.imgbb.com/ to get your API key. You are supposed to have this secret in your repo/org as `secrets.IMGBB_API_KEY.`

Note: You can generate an OAuth token in GitHub Settings -> Developer settings -> Personal access tokens.

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
      - name: Run ASTDiff Bot
        uses: pouryafard75/refactoringminer-astdiff-exporter@v0.4
        with:
          OAuthToken: ${{ secrets.GITHUB_TOKEN }}
          URL: https://github.com/Alluxio/alluxio/commit/9aeefcd8120bb3b89cdb437d8c32d2ed84b8a825
          Screenshot: MaxFreeAllocator

```

## Interesting Use Cases
- Creating a diff-bot that monitors issues (or even PRs) and generates the AST Diff as an artifact/screenshot

Below is an example of a bot that listens for the `@diff` keyword in issue comments and generates the screenshot for the file. 

```yaml
name: AST diff Bot

on:
  issue_comment:
    types: [created]

jobs:
  diff:
    runs-on: ubuntu-latest
    permissions:
      issues: write

    steps:
      # Step 0: Check for @diff trigger and get the URL command
      - name: Check for @diff trigger
        id: trigger
        uses: actions/github-script@v6
        with:
          script: |
            const commentBody = context.payload.comment.body;
            const regexScreenshot = /@diff\s+(\S+)\s+(\S+)/;  // Match URL + screenshot flag
            const regexArtifact = /@diff\s+(\S+)/;  // Match only URL
    
            let match = commentBody.match(regexScreenshot);
            if (match) {
              core.setOutput('triggered', 'true');
              core.setOutput('url', match[1].trim()); 
              core.setOutput('screenshot', match[2].trim());
              core.setOutput('mode', 'screenshot');
            } else {
              match = commentBody.match(regexArtifact);
              if (match) {
                core.setOutput('triggered', 'true');
                core.setOutput('url', match[1].trim()); 
                core.setOutput('screenshot', '');
                core.setOutput('mode', 'artifact');
              } else {
                core.setOutput('triggered', 'false');
              }
            }



      # Step 1: Run the exporter
      - name: Running the RM action exporter
        if : ${{ steps.trigger.outputs.triggered == 'true'}}
        uses: pouryafard75/refactoringminer-astdiff-exporter@v1.0
        id: run_rm_exporter
        with:
          OAuthToken: ${{ secrets.OAUTHTOKEN }}
          URL: ${{ steps.trigger.outputs.url }}
          screenshot: ${{ steps.trigger.outputs.screenshot }}


      # Step 2: Reply to the user with artifact url
      - name: Reply Artifact zip
        if: ${{ steps.trigger.outputs.triggered == 'true' && steps.trigger.outputs.screenshot == '' }}
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.trigger.outputs.url }}';
            const artifact_url = '${{ steps.run_rm_exporter.outputs.artifact_url }}'; // Add artifact_url output
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `👋 You triggered the bot with the URL: \`${url}\`. You can download it here: [Download Artifact](${artifact_url}).`
            })


      - name: Generate image list
        id: generate-paths
        run: |
          # Ensure the output from the previous step is evaluated properly
          number_of_screenshots="${{ steps.run_rm_exporter.outputs.numberOfScreenshots }}"
          screenshots_path="${{ steps.run_rm_exporter.outputs.screenshots_path }}"

          # Initialize an empty string to store paths
          paths=""

          # Loop through the screenshots and append to the paths variable
          for i in $(seq 1 $((number_of_screenshots))); do
            paths+=$'\n'"${screenshots_path}$i.png"
          done
          # Set paths as an environment variable for later steps
          echo "paths<<EOF" >> $GITHUB_ENV
          echo "$paths" >> $GITHUB_ENV
          echo "EOF" >> $GITHUB_ENV

      - name: Upload image
        if: ${{ steps.trigger.outputs.screenshot != null }}
        id: upload-image-all
        uses: McCzarny/upload-image@v1.5.0
        with:
          path: ${{ env.paths }}
          uploadMethod: imgbb
          apiKey: '${{ secrets.IMGBB_API_KEY }}'


      - name: 'Comment Screenshots'
        uses: actions/github-script@v7
        if: ${{ steps.trigger.outputs.screenshot != null }}
        with:
          script: |
            let commentBody = 'Image(s):\n';
            console.log('Initializing comment body...');
            const varValue = ${{ steps.run_rm_exporter.outputs.numberOfScreenshots }}
            console.log(`Number of screenshots (varValue): ${varValue}`);

            if (isNaN(varValue)) {
              console.log('Error: The number of screenshots is not a valid number.');
              return;
            }

            for (let i = 1; i <= varValue; i++) {
              console.log(`Processing image ${i}...`);
              index = i-1;
              // Access the image URL from the output

              const urls = JSON.parse('${{ steps.upload-image-all.outputs.urls }}');
              const imageUrl = urls[index]; // Access the specific image URL

              // Append the image URL to the comment body
              commentBody += `![${i}](${imageUrl})\n`;
            }

            console.log('Comment body constructed:\n' + commentBody);

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: commentBody
            });
            console.log('Comment posted to the issue!');
```

For instance, you can trigger it in your issue's discussion with the following comment: 
@diff Alluxio/alluxio@9aeefcd MaxFree
<img width="943" alt="Screenshot 2025-02-24 at 11 59 04 AM" src="https://github.com/user-attachments/assets/8db83014-bf68-47f6-90c5-7d7e63ff64b3" />



