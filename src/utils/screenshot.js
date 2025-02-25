const puppeteer = require('puppeteer');
const getMatchingIds = require('./diffFinder');
const fs = require('fs');
const path = require('path');
async function takeScreenshots(inputFilePath, exportDir, outputDir = 'out', infoFilePath = 'info.json') {
    if (!inputFilePath || !exportDir) {
        console.error('Error: Both input file path and export directory must be provided.');
        return;
    }
  
    const pageNumbers = getMatchingIds(inputFilePath, exportDir, infoFilePath);
    if (pageNumbers.length === 0) {
        console.log('No matching IDs found.');
        return;
    }
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
  
    const getExportedMonacoUrl = (id) => `file://${exportDir}/web/monaco-page/${id}/index.html`;
  
    console.log('Launching browser...');
    let browser;
    try {
        browser = await puppeteer.launch({
          timeout: 3000,
          args: ['--no-sandbox']
        });
        console.log('Browser launched.');
    } catch (error) {
        console.error('Error launching browser:', error);
    }
    
    const page = await browser.newPage();
  
    await page.setViewport({ width: 1920, height: 1080 });
    
    index = 0;
    for (const num of pageNumbers) {
        index++;
        const url = getExportedMonacoUrl(num);
        console.log(`Navigating to: ${url}`);
        await page.goto(url, { waitUntil: ['networkidle2', 'domcontentloaded', 'networkidle0']});
        const screenshotPath = path.join(outputDir, `${index}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved screenshot: ${screenshotPath}`);
    }
    await browser.close();
    return pageNumbers.length;
}

module.exports = takeScreenshots;