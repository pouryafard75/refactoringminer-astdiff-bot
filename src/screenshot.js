const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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

module.exports = { takeScreenshots };
