// Only a disposable emulator: changes battery exemption temporarily and restores it.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { _android } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const serial = process.env.ANDROID_TEST_SERIAL;
if (!/^emulator-\d+$/.test(serial || '')) throw Error('Select a disposable Android emulator');
const root = path.resolve(__dirname, '..'), pkg = 'com.tenuwarrior.app';
const adb = (...args) => execFileSync(path.join(root, '.android-sdk/platform-tools/adb.exe'), ['-s', serial, ...args], { windowsHide: true, timeout: 30000 }).toString();
const output = path.join(root, 'test-results/android-background-native');
fs.mkdirSync(output, { recursive: true });
let device, originallyExempt;
(async () => {
  device = (await _android.devices({ omitDriverInstall: true })).find(d => d.serial() === serial);
  assert.ok(device);
  const page = await (await device.webView({ pkg })).page();
  await page.waitForFunction(() => window.Warrior?.simulationApi?.mode === 'native');
  originallyExempt = await page.evaluate(async () => (await window.Capacitor.Plugins.BackgroundSettings.getStatus()).ignoringBatteryOptimizations);
  adb('shell', 'dumpsys', 'deviceidle', 'whitelist', '-' + pkg);
  await page.evaluate(() => localStorage.removeItem('warrior-background-reminder-v1'));
  await page.reload();
  const prompt = page.locator('#android-background-prompt');
  await prompt.waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(async () => (await window.Capacitor.Plugins.BackgroundSettings.getStatus()).ignoringBatteryOptimizations), false);
  await page.screenshot({ path: path.join(output, 'background-prompt.png') });
  for (const setting of ['battery', 'app']) {
    await prompt.locator(`[data-setting=${setting}]`).click();
    const activity = adb('shell', 'dumpsys', 'activity', 'activities');
    assert.match(activity, /(?:mResumedActivity|topResumedActivity)[^\n]*com\.android\.settings/);
    adb('shell', 'am', 'start', '-n', pkg + '/.MainActivity');
    await page.waitForFunction(() => !document.hidden);
    assert.equal(await prompt.evaluate(el => el.open), true);
  }
  // A real system flag change must be read again on return, not inferred from clicking.
  adb('shell', 'input', 'keyevent', 'KEYCODE_HOME');
  adb('shell', 'dumpsys', 'deviceidle', 'whitelist', '+' + pkg);
  adb('shell', 'am', 'start', '-n', pkg + '/.MainActivity');
  await page.waitForFunction(() => document.querySelector('#android-background-prompt .android-background-dismiss').textContent === '完成');
  await prompt.locator('.android-background-dismiss').click();
  await page.reload();
  await page.waitForFunction(() => window.Warrior?.simulationApi?.mode === 'native');
  assert.equal(await prompt.evaluate(el => el.open), false);
  const result = { passed: true, serial, checks: ['first-use automatic prompt', 'real Android battery/app settings intents', 'opening settings does not grant exemption', 'system exemption refreshed on resume', 'no repeat after completion'], continuousBackgroundExecutionTested: false };
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (typeof originallyExempt === 'boolean') adb('shell', 'dumpsys', 'deviceidle', 'whitelist', (originallyExempt ? '+' : '-') + pkg);
  if (device) await device.close();
});
