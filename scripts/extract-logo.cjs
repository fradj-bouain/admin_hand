const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', 'assets', 'icons', 'logo.svg');
const outDir = path.join(__dirname, '..', 'public');
const outFile = path.join(outDir, 'logo.png');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const svg = fs.readFileSync(root, 'utf8');
const m = svg.match(/data:image\/png;base64,([^"]+)/);
if (!m) {
  console.error('No embedded PNG in logo.svg');
  process.exit(1);
}
const buf = Buffer.from(m[1], 'base64');
fs.writeFileSync(outFile, buf);
console.log('Wrote', outFile, buf.length, 'bytes');
