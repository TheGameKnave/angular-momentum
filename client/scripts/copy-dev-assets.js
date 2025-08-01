const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV !== 'development') {
  console.log(`⏭️ Skipping dev asset copy (NODE_ENV=${process.env.NODE_ENV})`);
  process.exit(0);
}

console.log(`📁 Copying dev assets...`);

const srcDir = path.resolve(__dirname, '../../assets');
const destDir = path.resolve(__dirname, '../src/assets/dev');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(srcDir, destDir);
console.log(`✅ Dev assets copied to ${destDir}`);
