import createTestCafe from 'testcafe';
import { exec } from 'child_process';
import { promisify } from 'util';

// Create a promisified version of exec
const execPromise = promisify(exec);

process.env.TEST_MODE = process.argv[2] || process.env.TEST_MODE || 'tested';

(async () => {
  const serverProcess = await exec("npm run dev");
  const testcafe = await createTestCafe();

  try {
    const runner = testcafe.createRunner();

    const failedCount = await runner
      .browsers([
        "chrome:headless --window-size=1280,1024",
        // "firefox --window-size=1280,1024",
        // "safari --window-size=1280,1024",
        "edge --window-size=1280,1024",
        // "opera --window-size=1280,1024",
        "chrome:emulation:device=iphone X",
      ])
      .src(["run/test.ts"]) // Specify the test files or directories
      .screenshots({
        path: 'screenshots/',
        takeOnFails: false,
      })
      .run({
      });

    /**/console.log("Tests failed: " + failedCount);
  } finally {
    await testcafe.close();
    serverProcess.kill();

    // Kill processes on ports 4200 and 4201
    try {
      await execPromise('lsof -ti :4200 | xargs kill -9');
      await execPromise('lsof -ti :4201 | xargs kill -9');
    } catch (err) {
      /**/console.error("Error killing processes:", err);
    }
  }
})();