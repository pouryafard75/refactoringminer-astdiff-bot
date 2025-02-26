const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');
const takeScreenshots = require('./utils/screenshot');
const fs = require('fs');
run();
async function run(outdir = "out") { 
  try {
    // Get inputs
    const url = core.getInput('URL') || process.env.defaultURLValue;
    const oauthToken = core.getInput('OAuthToken') || process.env.GITHUB_TOKEN || process.env.defaultOAuthTokenValue;
    const screenshot = core.getInput('screenshot') || process.env.defaultScreenshotValue;

    console.log(`URL: ${url}`);
    console.log(`OAuthToken: ${oauthToken}`);
    console.log(`screenshot: ${screenshot}`);
    verifyInputs(url, oauthToken);
    console.log('Inputs verified');

    function verifyInputs(url, oauthToken) {
        if (!url || url === undefined || url === '') {
            throw new Error('URL input is required');
        }
        if (!oauthToken || oauthToken === undefined || oauthToken === '') {
            throw new Error('OAuthToken input is required');
        }
    }


    // Step 1: Pull RefactoringMiner Docker image
    console.log('Pulling RefactoringMiner Docker image...');
    await exec.exec('docker', ['pull', 'tsantalis/refactoringminer:latest']);
    
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
    console.log('RefactoringMiner finished running');

    if (process.env.GITHUB_REPOSITORY !== undefined) {
      core.setOutput('artifact_path', `${process.env.GITHUB_WORKSPACE}/exportedFromDocker/`);
    }

    if (screenshot !== undefined && screenshot !== '') {
      // RUN npx puppeteer browsers install chrome --install-deps
      console.log('Installing puppeteer browsers...');
      await exec.exec('npx', ['puppeteer', 'browsers', 'install', 'chrome@stable', "--install-deps=false"]);

      console.log('Taking screenshots...');
      const numberOfScreenshots = await takeScreenshots(screenshot, diffDir, outdir);
      core.setOutput('numberOfScreenshots', numberOfScreenshots);
      if (process.env.GITHUB_REPOSITORY !== undefined) {
      core.setOutput('screenshots_path', `${process.env.GITHUB_WORKSPACE}/out/`);
      }
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}
module.exports = run;