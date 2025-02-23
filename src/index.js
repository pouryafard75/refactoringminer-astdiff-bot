const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');
const artifact = require('@actions/artifact');
const puppeteer = require('puppeteer');
const artifactClient = artifact.default;
const glob = require('glob');

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
      console.log('Processing screenshot...');
      await takeScreenshots(screenshot, diffDir);
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

async function takeScreenshots(inputFilePath, exportDir, outputDir = 'out', infoFilePath = 'info.json') {
  if (!inputFilePath || !exportDir) {
      console.error('Error: Both input file path and export directory must be provided.');
      return;
  }

  const pageNumbers = getMatchingIds(inputFilePath, exportDir, infoFilePath);

  if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
  }

  const getExportedMonacoUrl = (id) => `file://${exportDir}/web/monaco-page/${id}/index.html`;

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
      args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });
  
  index = 0;
  for (const num of pageNumbers) {
      index++;
      const url = getExportedMonacoUrl(num);
      console.log(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      const screenshotPath = path.join(outputDir, `${index}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot: ${screenshotPath}`);
  }

  await browser.close();
}


function getMatchingIds(inputString, exportDir, infoFilePath) {
  console.log('Reading info.json...');
  const data = fs.readFileSync(path.join(exportDir, "web", infoFilePath), 'utf8');
  const jsonData = JSON.parse(data);
  const matchingIds = [];
  jsonData.diffInfos.forEach(item => {
      if (item.srcPath.includes(inputString) || item.dstPath.includes(inputString)) {
          matchingIds.push(item.id);
      }
  });
  console.log('Matching IDs:', matchingIds);
  return matchingIds;
}