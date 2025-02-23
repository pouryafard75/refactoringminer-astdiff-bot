const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');
const artifact = require('@actions/artifact');
const artifactClient = artifact.default;


const fs = require('fs');

async function run() {
  try {
    // Get inputs
    const url = core.getInput('URL') || process.env.defaultURLValue;
    const oauthToken = core.getInput('OAuthToken') || process.env.GITHUB_TOKEN || process.env.defaultOAuthTokenValue;
    const screenshot = core.getInput('screenshot') || process.env.defaultScreenshotValue;

    console.log(`URL: ${url}`);
    console.log(`OAuthToken: ${oauthToken}`);
    console.log(`screenshot: ${screenshot}`);
    verifyInputs(url, oauthToken);

    function verifyInputs(url, oauthToken) {
        if (!url || url === undefined || url === '') {
            throw new Error('URL input is required');
        }
        if (!oauthToken || oauthToken === undefined || oauthToken === '') {
            throw new Error('OAuthToken input is required');
        }
    }


    // Step 1: Pull RefactoringMiner Docker image
    // console.log('Pulling RefactoringMiner Docker image...');
    // await exec.exec('docker', ['pull', 'tsantalis/refactoringminer:latest']);
  
    try {
      console.log("Cloning RefactoringMiner repository...");
      await exec.exec("git clone --single-branch --branch=exportInfo https://github.com/pouryafard75/RM-ASTDiff.git RM-ASTDiff")
      .catch((error) => {
        console.error("Git clone failed:", error);
      });
      
      console.log("Building RefactoringMiner Docker image...");
      await exec.exec(
        "cd RM-ASTDiff && docker build -f docker/Dockerfile -t tsantalis/refactoringminer:latest ."
      );
    
      console.log("Done.");
    }
    catch (error) {
      console.error(error);
      process.exit(1);
    }
    
    console.log('Running RefactoringMiner...');
    const workspace = process.env.GITHUB_WORKSPACE;
    console.log(workspace)
    const diffDir = path.join(workspace, 'exportedFromDocker');
    fs.mkdirSync(diffDir, { recursive: true });

    await exec.exec(`docker run \
      --env OAuthToken="${oauthToken}" \
      -v ${diffDir}:/diff/exported \
      --entrypoint "/bin/sh" \
      tsantalis/refactoringminer:latest -c "\
        refactoringminer diff --url \"${url}\" -e && \
        unzip /opt/refactoringminer/lib/RefactoringMiner-DockerBuild.jar -d /tmp/refactoringminer && \
        mkdir -p /diff/exported/web && \
        cp -r /tmp/refactoringminer/web /diff/exported/web/resources"`
      );

    // Step 4: Create a zip artifact of the diff results
    console.log('Creating zip artifact of diff results...');
    await exec.exec('zip', ['-r', 'diff_results.zip', '.'], {
      cwd: diffDir
    });

    if (process.env.GITHUB_REPOSITORY !== undefined) {
      const artifactName = 'diff_results';
      const files = [`${process.env.GITHUB_WORKSPACE}/exportedFromDocker/diff_results.zip`];
      const rootDirectory = process.env.GITHUB_WORKSPACE;
      const options = { continueOnError: false};
      const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
      const artifactId = uploadResponse.artifactId;
      const url = getArtifactUrl(artifactId);
      core.setOutput('artifact_url', url);
    }

    // Handle screenshot logic if input is provided
    if (screenshot) {
      console.log('Processing screenshot...');
      await exec.exec('npm', ['install'], { cwd: workspace });
      await exec.exec('node', [path.join(workspace, 'src/screenshot.js'), screenshot, diffDir]);

      console.log('Creating zip artifact for screenshots...');
      await exec.exec('zip', ['-r', 'screenshots.zip', '.'], { cwd: path.join(workspace, 'out') });

      console.log('Uploading screenshots as artifact...');
      if (process.env.GITHUB_REPOSITORY !== undefined) {
      const artifactName = 'screenshots';
      const files = [`${process.env.GITHUB_WORKSPACE}/out/screenshots.zip`];
      const rootDirectory = process.env.GITHUB_WORKSPACE;
      const options = { continueOnError: false};
      const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
      const artifactId = uploadResponse.artifactId;
      const url = getArtifactUrl(artifactId);
      core.setOutput('screenshots_url', url);
      }
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
function getArtifactUrl(artifactId) {
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const artifactUrl = `https://github.com/${repo}/actions/runs/${runId}/artifacts/${artifactId}`;
  return artifactUrl;
}

