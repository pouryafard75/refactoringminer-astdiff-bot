const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');
const artifact = require('@actions/artifact');
const artifactClient = artifact.default;
const glob = require('glob');



const fs = require('fs');

async function run() {
  try {
    // Get inputs
    const url = core.getInput('URL') || process.env.defaultURLValue;
    const oauthToken = core.getInput('OAuthToken') || process.env.GITHUB_TOKEN || process.env.defaultOAuthTokenValue;
    const screenshot = core.getInput('screenshot') || process.env.defaultScreenshotValue;

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
        "docker build -f RM-ASTDiff/docker/Dockerfile -t tsantalis/refactoringminer:latest RM-ASTDiff"
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

    if (process.env.GITHUB_REPOSITORY !== undefined) {
      const artifactName = 'diff_results';
      
      const rootDirectory = `${process.env.GITHUB_WORKSPACE}/exportedFromDocker/`
      const files = glob.sync(`${rootDirectory}/**/*`);
    
      const options = { continueOnError: false};
      const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
      const artifactId = uploadResponse.artifactId;
      const url = getArtifactUrl(artifactId);
      core.setOutput('artifact_url', url);
    }

    // Handle screenshot logic if input is provided
    if (screenshot !== undefined && screenshot !== '') {
      console.log('Processing screenshot...');
      await exec.exec('npm', ['install'], { cwd: workspace });
      await exec.exec('node', [path.join(workspace, 'src/screenshot.js'), screenshot, diffDir]);


      console.log('Uploading screenshots as artifact...');
      if (process.env.GITHUB_REPOSITORY !== undefined) {
      const artifactName = 'screenshots';
      const rootDirectory = `${process.env.GITHUB_WORKSPACE}/out/`
      const files = glob.sync(`${rootDirectory}/**/*`);
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

