const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const client = await page.target().createCDPSession();
  
  // Simulate 3G network conditions
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 1638 * 1024 / 8, // 1638 kbps
    uploadThroughput: 1638 * 1024 / 8,
  });

  // Emulate 4x CPU slowdown
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  console.log('Starting load test on simulated 3G...');
  
  const startTime = Date.now();
  await page.goto('http://localhost:8080', { waitUntil: 'load' });
  const loadTime = Date.now() - startTime;
  
  const perfMetrics = await page.evaluate(() => JSON.stringify(window.performance.timing));
  const timing = JSON.parse(perfMetrics);
  
  const fcp = await page.evaluate(() => {
    const paint = performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint');
    return paint ? paint.startTime : 0;
  });
  
  console.log(`FCP: ${fcp.toFixed(2)}ms`);
  console.log(`Load Time: ${loadTime}ms`);
  
  if (fcp <= 3000) {
    console.log('FCP  ≤ 3000ms  ✅ PASS');
  } else {
    console.log(`FCP  ≤ 3000ms  ❌ FAIL (${fcp.toFixed(2)}ms)`);
  }
  
  await browser.close();
})();
