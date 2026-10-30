// Explicit local import. No background vault access and no personal/private folders.
// Usage: node scripts/import-obsidian.cjs "G:\\TA_Obsidian\\MySite"
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const vault = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(vault)) throw new Error('Provide the MySite vault directory.');
const project = path.resolve(__dirname, '..');
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true })
  .filter(item => !item.name.startsWith('.'))
  .flatMap(item => item.isDirectory() ? walk(path.join(directory, item.name)) : [path.join(directory, item.name)]);
const mediaFiles = walk(path.join(vault, 'Media'));
const media = {};
const missing = [];
const assetDirectory = path.join(project, 'public', 'assets', 'portfolio');
fs.mkdirSync(assetDirectory, { recursive: true });

function importMedia(body) {
  for (const match of body.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
    const name = match[1];
    if (media[name]) continue;
    const source = mediaFiles.find(file => path.basename(file) === path.basename(name));
    if (!source) { missing.push(name); continue; }
    const hash = crypto.createHash('sha1').update(name).digest('hex').slice(0, 10);
    const fileName = `${slug(path.parse(name).name)}-${hash}${path.extname(name).toLowerCase()}`;
    fs.copyFileSync(source, path.join(assetDirectory, fileName));
    media[name] = `/assets/portfolio/${fileName}`;
  }
}

// Each category is a top-level vault folder. One that is missing or holds no notes yet is
// left out, so the site never shows an empty tab.
const skipped = [];
const categories = ['Animation', 'Technical Animation', 'Teaching'].flatMap(name => {
  const directory = path.join(vault, name);
  if (!fs.existsSync(directory)) { skipped.push(name); return []; }
  const groups = new Map();
  for (const file of walk(directory).filter(file => file.endsWith('.md')).sort()) {
    const relative = path.relative(directory, file).split(path.sep);
    const groupName = relative.length > 1 ? relative[0] : 'Downloads';
    const title = path.basename(file, '.md').replace(/\.+$/, '');
    const body = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    importMedia(body);
    const entry = {
      id: slug(relative.join('/').replace(/\.md$/, '')),
      title,
      folder: relative.slice(1, -1).join(' / '),
      body,
    };
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(entry);
  }
  if (!groups.size) { skipped.push(name); return []; }
  // Notes loose at a category's top form its Downloads topic, which comes after the others.
  const topics = [...groups].sort(([a], [b]) => (a === 'Downloads') - (b === 'Downloads'));
  return [{
    id: slug(name), label: name,
    subcategories: topics.map(([label, entries]) => ({ id: slug(label), label, entries })),
  }];
});

fs.mkdirSync(path.join(project, 'src', 'content'), { recursive: true });
fs.writeFileSync(path.join(project, 'src', 'content', 'portfolio.json'), JSON.stringify({ categories, media }, null, 2) + '\n');
console.log(JSON.stringify({ categories: categories.map(c => ({ name: c.label, groups: c.subcategories.map(s => ({ name: s.label, entries: s.entries.length })) })), mediaFiles: Object.keys(media).length, missing: [...new Set(missing)], emptyCategories: skipped }, null, 2));
