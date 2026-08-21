import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
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

function getFilesRecursively(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.svg')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getGitTimestamps() {
  const timestampMap = new Map();
  try {
    const output = execSync('git log --name-only --format="COMMIT_TIME:%ct"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    let currentTimestamp = null;
    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('COMMIT_TIME:')) {
        currentTimestamp = parseInt(trimmed.replace('COMMIT_TIME:', ''), 10) * 1000;
      } else if (currentTimestamp && !timestampMap.has(path.resolve(trimmed))) {
        timestampMap.set(path.resolve(trimmed), currentTimestamp);
      }
    }
  } catch {
    // Fallback if not in a git repository or shallow checkout
  }
  return timestampMap;
}

console.log('📦 Optimizing SVGs and building Icon Library Index...');

const svgFiles = getFilesRecursively(ICONS_DIR);
const gitTimestamps = getGitTimestamps();
const icons = [];
const symbols = [];

for (const file of svgFiles) {
  const relativePath = path.relative(ICONS_DIR, file);
  const pathParts = relativePath.split(path.sep);

  let category = 'general';
  let filename = pathParts[0];

  if (pathParts.length > 1) {
    category = pathParts[0];
    filename = pathParts[pathParts.length - 1];
  }

  const name = path.basename(filename, '.svg');
  const id = `${category}-${name}`;
  const rawSvg = fs.readFileSync(file, 'utf8');

  // SVGO optimization
  const result = optimize(rawSvg, { path: file, ...svgoConfig });
  const optimizedSvg = result.data;

  // Tag extraction
  const nameParts = name.toLowerCase().split(/[-_]/);
  const extraTags = TAG_SYNONYMS[name] || [];
  const tags = Array.from(new Set([...nameParts, ...extraTags]));

  // Inner content & ViewBox extraction
  const innerContent = optimizedSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const viewBoxMatch = optimizedSvg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  const lastModified = gitTimestamps.get(path.resolve(file)) || fs.statSync(file).mtimeMs;

  icons.push({
    id,
    name,
    category,
    tags,
    lastModified,
    svg: optimizedSvg,
    viewBox
  });

  symbols.push(`<symbol id="${id}" viewBox="${viewBox}">${innerContent}</symbol>`);
}

// Write artifacts
fs.writeFileSync(path.join(DIST_DIR, 'icons.json'), JSON.stringify(icons, null, 2));
console.log(`✅ Built search index with ${icons.length} icons at dist/icons.json`);

const spriteContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n${symbols.join('\n')}\n</svg>`;
fs.writeFileSync(path.join(DIST_DIR, 'sprite.svg'), spriteContent);
console.log(`✅ Generated SVG Sprite at dist/sprite.svg`);

const cssLines = icons.map(icon => `.icon-${icon.id} { width: 1em; height: 1em; fill: currentColor; }`);
fs.writeFileSync(path.join(DIST_DIR, 'icons.css'), cssLines.join('\n'));
console.log(`✅ Generated helper CSS at dist/icons.css`);

console.log('🎉 Icon Library Build Complete!');
