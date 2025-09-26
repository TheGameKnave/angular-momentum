import { waitForAngular } from 'testcafe-angular-selectors';
import * as path from 'path';
import * as fs from 'fs';
import { Selector, test, ClientFunction } from 'testcafe';
import { getThreshold } from '../data/constants';
import { SUPPORTED_LANGUAGES } from '../../../client/src/app/helpers/constants';

const screenshotMode = process.env.TEST_MODE || 'tested';
const takeScreenshot = async (t: TestController, screenshotDir: string, element?: string) => {
    const absolutePath = path.join(process.cwd(), 'screenshots/' + screenshotDir);
    if ((screenshotMode === 'accepted' && !fs.existsSync(absolutePath)) || screenshotMode === 'tested') {
        if (element) {
            await t.takeElementScreenshot(element, screenshotDir);
        } else {
            await t.takeScreenshot(screenshotDir);
        }
    }
};

// making memory exception. Might want to move to global ts file
declare global {
    interface Performance {
        memory: {
            jsHeapSizeLimit: number;
            totalJSHeapSize: number;
            usedJSHeapSize: number;
        };
    }
}
// page load time stuff
const isPageLoaded = ClientFunction(() => {return document.readyState === 'complete';});

// helper functions for Measure Memory
const getMemory = async t => JSON.parse(
    await t.eval(() => {
    const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = window.performance.memory;
    /**/console.log({ jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize });
    return JSON.stringify({ jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize });
}));
//compare current memory against memory threshold
const validateMemory = (memoryVal: { jsHeapSizeLimit: number; usedJSHeapSize: number; totalJSHeapSize: number }, threshold: number) => {
    const usedJSHeapSize = memoryVal.usedJSHeapSize;
    const isMemoryLowerThanThreshold =  usedJSHeapSize < threshold;
    return isMemoryLowerThanThreshold;
};

fixture `App tests`
    .page('http://localhost:4200')
    .beforeEach(async () => {
        await waitForAngular();
    });
// measures page load time, fails if load time over threshold
test('Measure Page Load Time', async t => {
    const startTime = await t.eval(() => performance.now());

    await t.expect(isPageLoaded()).ok();

    const endTime = await t.eval(() => performance.now());
    const pageLoadTime = endTime - startTime;
    await t.expect(pageLoadTime).lt(getThreshold("pageLoad"));
    /**/console.log(`Page load time: ${pageLoadTime} milliseconds`);
    const savePath = `${t.browser.alias.replace(/[^a-z0-9]/gi, '_')}/${screenshotMode}.png`;
    const screenshotDir = `Page_load/${savePath}`;
    await takeScreenshot(t, screenshotDir);
});

// 9-12  Updating test to work with new app, starting with swapping to feature menu and turning on all features
test('Click featurePage', async t => {
    const featureMenu = Selector('app-features'); 
    await t
    // checks the DOM for the elements that change during the button press
        .expect(featureMenu.exists).notOk()

    // then clicks the feature menu button, checks if page changed to features
        .click('app-menu-feature i.pi.pi-list-check')
        .expect(featureMenu.exists).ok();

    // Saving Screenshot - TODO need static screenshot resolution for blink diff
    // const savePath = `${t.browser.alias.replace(/[^a-z0-9]/gi, '_')}/${screenshotMode}.png`;
    // const screenshotDir = `featureMenu/${savePath}`;
    // await takeScreenshot(t,screenshotDir,'.component-container');
});
// test('Click environment', async t => {
//     const environment = Selector('app-environment'); 
//     await t
//     // checks the DOM for the elements that change during the button press
//         .expect(environment.exists).notOk()

//     // then clicks the button, looks for changes
//         .click('button.component-environment')
//         .expect(environment.exists).ok();
//     const savePath = `${t.browser.alias.replace(/[^a-z0-9]/gi, '_')}/${screenshotMode}.png`;
//     const screenshotDir = `Click_environment/${savePath}`;
//     await takeScreenshot(t,screenshotDir,'.component-container');
// });
// test('Click api', async t => {
//     const api = Selector('app-api'); 
//     await t
//     // checks the DOM for the elements that change during the button press
//         .expect(api.exists).notOk()

//     // then clicks the button, looks for changes
        
//         .click('button.component-api')
//         .expect(api.exists).ok();
//     const savePath = `${t.browser.alias.replace(/[^a-z0-9]/gi, '_')}/${screenshotMode}.png`;
//     const screenshotDir = `Click_api/${savePath}`;
//     await takeScreenshot(t,screenshotDir,'.component-container');
// });
// test('Click Clear', async t => {
//     await t

//     // then clicks the button, looks for changes
//         .click('button.component-environment')

//         .click('button.component-clear')
//     const savePath = `${t.browser.alias.replace(/[^a-z0-9]/gi, '_')}/${screenshotMode}.png`;
//     const screenshotDir = `Click_Clear/${savePath}`;
//     await takeScreenshot(t,screenshotDir);
// });
// test('Measure Memory Usage', async t => {
//     const memoryVal = await getMemory(t);
//     await t.expect(validateMemory(memoryVal, getThreshold("memory"))).ok(`Memory usage exceeds the threshold: ${JSON.stringify(memoryVal)}`);
// });
// test('Test Language Change', async t => {
//   let buttons: {[key: string]: Selector} = {};
//   SUPPORTED_LANGUAGES.forEach((lang) => {
//     buttons[lang + 'Button'] = Selector(`.i18n-${lang}`);
//   });
  
//   for (const key of Object.keys(buttons)) {
//     if (key !== 'enButton') {
//       // Click on each language button
//       await t.click(buttons[key]);
//       // Test if the page has been translated to not-english
//       await t
//         .expect(Selector('app-root > :nth-child(2)').innerText).notEql("Hello world");
//     }
//   }

//   // Click on the English button
//   await t.click(buttons.enButton);
//   // Test if the page has been translated to English
//   await t
//     .expect(Selector('app-root > :nth-child(2)').innerText).eql("Hello world");
//   });
