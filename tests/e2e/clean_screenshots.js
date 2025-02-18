import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current directory equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the function to clean the tested screenshots
async function cleanTestedScreenshots(rootDir) {
  // Define a nested function to walk through the directory tree
  async function walkDir(dir) {
    try {
      // Read the contents of the current directory
      const files = await fs.readdir(dir);
      let hasAccepted = false; // Flag to indicate if the directory contains an accepted.png file

      // Iterate through the files and directories in the current directory
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);

        // If the file is a directory, recursively walk through it
        if (stat.isDirectory()) {
          // Ignore the thumbnails directory
          if (file === 'thumbnails') {
            continue;
          }
          await walkDir(filePath);
        } else if (file === 'accepted.png') {
          //console.log(`file exists ${path.relative(rootDir, filePath)}`);
          // If the file is an accepted.png file, set the flag to true
          hasAccepted = true;
        }
      }

      // If the directory does not contain an accepted.png file, check its subdirectories
      if (!hasAccepted) {
        // Read the contents of the current directory again
        const files = await fs.readdir(dir);
        let hasSubdirWithAccepted = false;

        // Iterate through the files and directories in the current directory
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);

          // If the file is a directory, check if it contains an accepted.png file
          if (stat.isDirectory()) {
            // Ignore the thumbnails directory
            if (file === 'thumbnails') {
              continue;
            }
            // Check if the subdirectory contains an accepted.png file
            const subdirFiles = await fs.readdir(filePath);
            if (subdirFiles.includes('accepted.png')) {
              hasSubdirWithAccepted = true;
              break;
            }
          }
        }

        // If the directory does not contain an accepted.png file and none of its subdirectories contain an accepted.png file
        // and we are at the top level, do not remove it
        if (!hasSubdirWithAccepted && dir === rootDir) {
          return;
        }

        // If the directory does not contain an accepted.png file and none of its subdirectories contain an accepted.png file, remove it
        if (!hasSubdirWithAccepted) {
          await fs.rm(dir, { recursive: true });
        }
      } else {
        // If the directory contains an accepted.png file, recursively remove empty subdirectories
        await removeEmptySubDirs(dir);
      }
    } catch (err) {
      console.error(`Error walking directory ${dir}: ${err.message}`);
    }
  }

  // Define a nested function to remove empty subdirectories
  async function removeEmptySubDirs(dir) {
    try {
      // Read the contents of the current directory
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          // Ignore the thumbnails directory
          if (file === 'thumbnails') {
            continue;
          }
          // Recursively remove empty subdirectories
          await removeEmptySubDirs(filePath);
          // If the subdirectory is empty, remove it
          if ((await fs.readdir(filePath)).length === 0) {
            await fs.rm(filePath);
          }
        }
      }
    } catch (err) {
      console.error(`Error removing empty subdirectories ${dir}: ${err.message}`);
    }
  }

  // Start walking through the directory tree from the root directory
  try {
    await walkDir(rootDir);
  } catch (err) {
    console.error(`Error cleaning screenshots: ${err.message}`);
  }
}

// Usage
const rootDir = 'screenshots';
cleanTestedScreenshots(rootDir);