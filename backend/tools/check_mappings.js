const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const patterns = ['accountNumber','createdAt','userId','studentId','facultyId','merchantId','accountType','accountNumber','balance','fromAccount','toAccount'];

function walk(dir) {
  const res = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) res.push(...walk(p));
    else if (p.endsWith('.js')) res.push(p);
  }
  return res;
}

const files = walk(root);
const matches = [];
for (const f of files) {
  const txt = fs.readFileSync(f,'utf8');
  for (const pat of patterns) {
    if (txt.includes(pat)) matches.push({ file: path.relative(root,f), pattern: pat });
  }
}

if (matches.length === 0) {
  console.log('No matches found for patterns.');
  process.exit(0);
}

const grouped = {};
for (const m of matches) {
  grouped[m.file] = grouped[m.file] || new Set(); grouped[m.file].add(m.pattern);
}

for (const [file, set] of Object.entries(grouped)) {
  console.log(file + ': ' + Array.from(set).join(', '));
}

process.exit(0);
