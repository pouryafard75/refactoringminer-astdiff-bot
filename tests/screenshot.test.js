const takeScreenshots = require("../src/utils/screenshot");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { PNG } = require('pngjs');
const ssim = require('ssim.js');

const outFolder = "out/";
const artifactFolder = "artifact/";
const screenshotFolder = "screenshots/";
const resourcePath = "resources/test/";



describe("Screenshot Test", () => {
    beforeAll(() => {
      workspacePath = path.join(__dirname, "../");  
      outDir = path.join(workspacePath, outFolder);
      if (fs.existsSync(outDir)) {
        fs.rmdirSync(outDir, { recursive: true });
      }
    });

    test ("Screen capture test", async () => {
      // test parameters
      const name = "alluxio9aeefcd8120bb3b89cdb437d8c32d2ed84b8a825";
      const screenshotInput = "MaxFree";
      const expectedNumberOfScreenshots = 1;



      const screenshotOutputPath = path.join(outDir, name, screenshotFolder);
      const resBasePath = path.join(workspacePath,resourcePath,name);
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
        await expect(compareImages(generatedFile, referenceFile)).toBe(true);
      }
    });

    afterAll(() => {
      if (fs.existsSync(outDir)) {
        fs.rmdirSync(outDir, { recursive: true });
      }
    });

  function areFilesIdentical(file1, file2) {
    if (!fs.existsSync(file1)) return false;
    if (!fs.existsSync(file2)) return false;
    const hash1 = crypto.createHash("sha256").update(fs.readFileSync(file1)).digest("hex");
    const hash2 = crypto.createHash("sha256").update(fs.readFileSync(file2)).digest("hex");
    console.log(`hash1: ${hash1}`);
    console.log(`hash2: ${hash2}`);
    return hash1 === hash2;
  };
  function compareImages(image1Path, image2Path) {
    const img1 = PNG.sync.read(fs.readFileSync(image1Path));
    const img2 = PNG.sync.read(fs.readFileSync(image2Path));

    const ssimResult = ssim.ssim(img1, img2);
    console.log(`SSIM Score: ${ssimResult.mssim}`);

    if (ssimResult.mssim > 0.50) {
        console.log("✅ Images are very similar with SSIM score: ", ssimResult.mssim);
        return true;
    } else {
        console.log("⚠️ Images differ with SSIM score: ", ssimResult.mssim);
        return false;
    }
  }
});