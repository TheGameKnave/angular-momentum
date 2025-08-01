const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../assets');
const destDir = path.resolve(__dirname, '../src/assets/dev');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath); // 📁 Recurse into subfolder
    } else {
      fs.copyFileSync(srcPath, destPath); // 📄 Copy file
    }
  }
}

copyDir(srcDir, destDir);
console.log(`✅ dev asset files copied from ${srcDir} → ${destDir}`);
