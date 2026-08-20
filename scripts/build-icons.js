import fs from 'fs';
import path from 'path';
import { optimize } from 'svgo';

const ICONS_DIR = path.resolve('icons');
const DIST_DIR = path.resolve('dist');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Synonyms map to auto-enrich search tags
const TAG_SYNONYMS = {
  home: ['house', 'dashboard', 'main', 'start', 'index'],
  search: ['find', 'lookup', 'magnifier', 'query', 'filter'],
  menu: ['hamburger', 'navigation', 'options', 'list', 'drawer'],
  'arrow-right': ['forward', 'next', 'direction', 'pointer'],
  download: ['save', 'export', 'get', 'file'],
  settings: ['cog', 'gear', 'preferences', 'configuration', 'options'],
  trash: ['delete', 'remove', 'bin', 'garbage', 'clear'],
  edit: ['pencil', 'modify', 'write', 'update'],
  share: ['export', 'link', 'send', 'social'],
  heart: ['like', 'favorite', 'love', 'bookmark'],
  user: ['profile', 'account', 'person', 'avatar', 'member'],
  folder: ['directory', 'files', 'storage', 'archive'],
  document: ['file', 'paper', 'text', 'page', 'doc'],
  image: ['photo', 'picture', 'media', 'gallery', 'graphic']
};

function getFilesRecursively(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else if (file.endsWith('.svg')) {
      results.push(filePath);
    }
  });
  return results;
}

console.log('📦 Optimizing SVGs and building Icon Library Index...');

const svgFiles = getFilesRecursively(ICONS_DIR);
const icons = [];
const symbols = [];

// SVGO config
const svgoConfig = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          cleanupIds: false
        }
      }
    },
    'removeDimensions'
  ]
};

svgFiles.forEach(file => {
  const name = path.basename(file, '.svg');
  const id = name; // Removed category prefix
  const rawSvg = fs.readFileSync(file, 'utf8');

  // Optimize SVG
  const result = optimize(rawSvg, { path: file, ...svgoConfig });
  const optimizedSvg = result.data;

  // Extract custom tags embedded in the SVG
  const tagsMatch = rawSvg.match(/data-tags="([^"]+)"/i);
  const customTags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().toLowerCase()) : [];

  // Extract tags
  const nameParts = name.toLowerCase().split(/[-_]/);
  const extraTags = TAG_SYNONYMS[name] || [];
  const tags = Array.from(new Set([...nameParts, ...extraTags, ...customTags])).filter(Boolean);

  // Extract SVG inner content for symbol generation
  const innerContent = optimizedSvg
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');

  // Extract viewBox if present
  const viewBoxMatch = optimizedSvg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  icons.push({
    id,
    name,
    tags,
    customTags, // Added this line
    svg: optimizedSvg,
    viewBox
  });

  symbols.push(`<symbol id="${id}" viewBox="${viewBox}">${innerContent}</symbol>`);
});

// Sort alphabetically by name
icons.sort((a, b) => a.name.localeCompare(b.name));

// Write icons.json
const indexPath = path.join(DIST_DIR, 'icons.json');
fs.writeFileSync(indexPath, JSON.stringify(icons, null, 2));
console.log(`✅ Built search index with ${icons.length} icons at dist/icons.json`);

// Write sprite.svg
const spriteContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n${symbols.join('\n')}\n</svg>`;
const spritePath = path.join(DIST_DIR, 'sprite.svg');
fs.writeFileSync(spritePath, spriteContent);
console.log(`✅ Generated SVG Sprite at dist/sprite.svg`);

// Generate helper CSS classes
const cssLines = icons.map(icon => `.icon-${icon.id} { width: 1em; height: 1em; fill: currentColor; }`);
fs.writeFileSync(path.join(DIST_DIR, 'icons.css'), cssLines.join('\n'));
console.log(`✅ Generated helper CSS at dist/icons.css`);

console.log('🎉 Icon Library Build Complete!');
