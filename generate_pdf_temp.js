const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const htmlPath = path.resolve(__dirname, 'CV_Badreddine_Khelef.html');
  console.log('Loading HTML from:', htmlPath);
  
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  
  const pdfPath = path.resolve(__dirname, 'CV_Badreddine_Khelef.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm'
    }
  });
  
  console.log('PDF successfully generated at:', pdfPath);
  await browser.close();
}

run().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
