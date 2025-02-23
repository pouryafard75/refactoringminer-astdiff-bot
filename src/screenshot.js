const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const inputFilePath = process.argv[2];
const exportDir = process.argv[3];

if (!inputFilePath || !exportDir) {
    console.error('Error: Both input file path and export directory must be provided.');
    process.exit(1);
}

function getExportedMonacoUrl(id) {
    return `file://${exportDir}/web/monaco-page/${id}/index.html`;
}
  

const outputDir = 'out';
const infoPath = "info.json";
const pageNumbers = getMatchingIds(inputFilePath);

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    for (const num of pageNumbers) {
        const url = getExportedMonacoUrl(num);
        console.log(`Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
        const screenshotPath = path.join(outputDir, `screenshot_${num}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved screenshot: ${screenshotPath}`);
    }

    await browser.close();
})();

function getMatchingIds(inputString) {
    const data = fs.readFileSync(path.join(exportDir, "web", infoPath), 'utf8');
    const jsonData = JSON.parse(data);
    const matchingIds = [];
    jsonData.diffInfos.forEach(item => {
        if (item.srcPath.includes(inputString) || item.dstPath.includes(inputString)) {
            matchingIds.push(item.id);
        }
    });
    return matchingIds;
}