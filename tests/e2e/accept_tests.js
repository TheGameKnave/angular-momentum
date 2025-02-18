import fs from 'fs';
import path from 'path';

// Get the directory to traverse from the command line argument
const dirToTraverse = path.resolve('screenshots', process.argv[2] || '');

const newFileName = 'accepted.png';

async function traverseDirectory(dirPath) {
    try {
        const files = await fs.promises.readdir(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.promises.stat(filePath);
            if (stats.isDirectory()) {
                await traverseDirectory(filePath); // Recursively traverse directories
            } else if(stats.isFile() && file === 'tested.png') {
                const newFilePath = path.join(dirPath, newFileName);
                await fs.promises.copyFile(filePath, newFilePath);
                // log filepath after tests/e2e/screenshots/
                const screenshotsDir = path.resolve('tests/e2e/screenshots/');
                console.log(`Copied ${path.relative(screenshotsDir, filePath)} to ${newFileName}`);
            }
        }
    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
}

// Start traversing from the specified directory OR the root
traverseDirectory(dirToTraverse);