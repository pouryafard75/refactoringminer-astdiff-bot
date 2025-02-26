const takeScreenshots = require("../src/utils/screenshot");
const path = require("path");
const fs = require("fs");
// const run = require("../src/index"); This is problematic as it executes the run() on the fly, since run() is invoked in the index.js
// We need to extract the run into separate function and call it in the index.js to prevent the run() from being executed on the require
// Test in this file will be skipped at the moment.

const outFolder = "out2/";
const artifactFolder = "artifact/";
const screenshotFolder = "screenshots/";
const resourcePath = "resources/test/";



describe("Integration Test", () => {
    beforeAll(() => {
      workspacePath = path.join(__dirname, "../");  
      outDir = path.join(workspacePath, outFolder);
      if (fs.existsSync(outDir)) {
        fs.rmdirSync(outDir, { recursive: true });
      }
    });

    test.skip ("Test Integration", async () => {
      //Has been skipped due to the comment on the top of the file.
      // Also the jest is complaining on importing puppee after the setup, which I dont know how to resolve.
      
      

      // test parameters

      process.env.GITHUB_WORKSPACE = process.cwd();
      process.env.defaultURLValue = "https://github.com/Alluxio/alluxio/commit/9aeefcd8120bb3b89cdb437d8c32d2ed84b8a825";
      process.env.defaultOAuthTokenValue = process.env.OAuthToken;
      process.env.defaultScreenshotValue = "MaxFreeAllocator";
      const name = "alluxio9aeefcd8120bb3b89cdb437d8c32d2ed84b8a825";
      const screenshotInput = "MaxFree";
      const expectedNumberOfScreenshots = 1;

      run(outFolder);

      const screenshotOutputPath = path.join(outDir, name, screenshotFolder);
      const resBasePath = path.join(workspacePath,resourcePath,name);
      console.log(`Calling takeScreenshots`);
      const numberOfScreenshots = await takeScreenshots(
          screenshotInput,
          path.join(resBasePath, artifactFolder),
          screenshotOutputPath
      );

      expect(numberOfScreenshots).toBe(expectedNumberOfScreenshots);
      for (let i = 1; i <= expectedNumberOfScreenshots; i++) {
        const generatedFile = path.join(screenshotOutputPath, `${i}.png`);
        const referenceFile = path.join(resBasePath, screenshotFolder , `${i}.png`);
        await expect(fs.existsSync(generatedFile)).toBe(true);
      }
    },20000);

    afterAll(() => {
      if (fs.existsSync(outDir)) {
        fs.rmdirSync(outDir, { recursive: true });
      }
    });
});