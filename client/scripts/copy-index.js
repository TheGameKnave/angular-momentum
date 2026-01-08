const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'dist', 'angular-momentum', 'browser', 'index.csr.html');
const dest = path.join(__dirname, '..', 'dist', 'angular-momentum', 'browser', 'index.html');

fs.copyFileSync(src, dest);
console.log('Copied index.csr.html to index.html');
