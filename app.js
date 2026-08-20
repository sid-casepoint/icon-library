let iconsData = [];
let currentCategory = 'all';
let searchQuery = '';
let currentIcon = null;

// ==========================================
// CONFIGURATION (Admin must set these)
// ==========================================
const GITHUB_OWNER = 'sid-casepoint'; // e.g. 'octocat'
const GITHUB_REPO = 'icon-library'; // e.g. 'icon-library'
const GITHUB_BRANCH = 'main';

// Paste the output from scripts/encrypt-token.js here:
const ENCRYPTED_TOKEN_DATA = {
  "salt": "78a18277e1a7b6ef8092a90719f67ec8",
  "iv": "15d1093d5fcd448595da8a0e",
  "authTag": "817580232c0ce33889e31446d515bb71",
  "ciphertext": "68d790ad8fd2d004ac1f1d163712e6b3f1e4e3f8ca99a4acf8ecab665b34eddb21fefc442549675a2b690e674109a57588f0a79884c9b90350306402be3963c2db9b03c6efc0f4b72337b3473d7eb57580dc5f482c65d879459d3734cd"
};
// ==========================================

// DOM Elements
const iconGrid = document.getElementById('iconGrid');
const resultsCount = document.getElementById('resultsCount');
const searchInput = document.getElementById('searchInput');
const categoryList = document.getElementById('categoryList');
const noResults = document.getElementById('noResults');

// Customization Controls
const iconColorInput = document.getElementById('iconColor');
const iconColorHex = document.getElementById('iconColorHex');
const iconSizeInput = document.getElementById('iconSize');
const iconSizeValue = document.getElementById('iconSizeValue');
const themeToggle = document.getElementById('themeToggle');

// Modal Elements
const iconModal = document.getElementById('iconModal');
const modalIconPreview = document.getElementById('modalIconPreview');
const modalIconTitle = document.getElementById('modalIconTitle');
const modalIconTags = document.getElementById('modalIconTags');
const codeSnippet = document.getElementById('codeSnippet').querySelector('code');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const downloadSvgBtn = document.getElementById('downloadSvgBtn');
const tabBtns = document.querySelectorAll('.tab-btn');

// Upload & Delete Modals
const uploadModal = document.getElementById('uploadModal');
const deleteModal = document.getElementById('deleteModal');
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const deleteStatus = document.getElementById('deleteStatus');
const openUploadModalBtn = document.getElementById('openUploadModalBtn');
const deleteIconBtn = document.getElementById('deleteIconBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

let currentCodeFormat = 'svg';
const DEFAULT_COLOR = '#3b82f6';
let currentCodeValue = '';

async function init() {
  try {
    const res = await fetch('dist/icons.json');
    if (!res.ok) throw new Error('Could not load icons.json');
    iconsData = await res.json();
    setupCategories();
    renderIcons();
    setupEventListeners();
    setupTheme();
  } catch (err) {
    resultsCount.textContent = 'Error loading icons. Did you run the build script?';
    console.error(err);
  }
}

function setupCategories() {
  const categories = ['all', ...new Set(iconsData.map(i => i.category))];
  categoryList.innerHTML = categories.map(cat => `
    <li>
      <button class="category-btn w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${cat === currentCategory ? 'bg-brand text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}" data-category="${cat}">
        ${cat.charAt(0).toUpperCase() + cat.slice(1)}
      </button>
    </li>
  `).join('');
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentCategory = e.target.dataset.category;
      document.querySelectorAll('.category-btn').forEach(b => {
        b.className = `category-btn w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${b.dataset.category === currentCategory ? 'bg-brand text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
      });
      renderIcons();
    });
  });
}

function getFilteredIcons() {
  return iconsData.filter(icon => {
    const matchesCategory = currentCategory === 'all' || icon.category === currentCategory;
    if (!searchQuery) return matchesCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch = icon.name.toLowerCase().includes(query) || icon.tags.some(t => t.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });
}

function renderIcons() {
  const filtered = getFilteredIcons();
  resultsCount.textContent = `${filtered.length} icon${filtered.length !== 1 ? 's' : ''}`;
  
  if (filtered.length === 0) {
    iconGrid.innerHTML = '';
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');
  
  const size = iconSizeInput.value + 'px';
  const color = iconColorInput.value;
  
  iconGrid.innerHTML = filtered.map(icon => `
    <button class="icon-card flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brand hover:shadow-md transition-all group" data-id="${icon.id}">
      <div class="mb-3 text-gray-800 dark:text-gray-200 group-hover:text-brand transition-colors" style="width: ${size}; height: ${size}; color: ${color};">
        ${icon.svg}
      </div>
      <span class="text-xs text-gray-500 font-medium truncate w-full text-center">${icon.name}</span>
    </button>
  `).join('');
  
  document.querySelectorAll('.icon-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
}

function openModal(id) {
  currentIcon = iconsData.find(i => i.id === id);
  if (!currentIcon) return;
  modalIconTitle.textContent = currentIcon.name;
  modalIconTags.innerHTML = currentIcon.tags.map(tag => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">${tag}</span>`).join('');
  modalIconPreview.innerHTML = currentIcon.svg;
  modalIconPreview.style.width = '80px';
  modalIconPreview.style.height = '80px';
  modalIconPreview.style.color = iconColorInput.value;
  updateCodeSnippet();
  iconModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModals() {
  iconModal.classList.add('hidden');
  uploadModal.classList.add('hidden');
  deleteModal.classList.add('hidden');
  document.body.style.overflow = '';
  uploadStatus.classList.add('hidden');
  deleteStatus.classList.add('hidden');
}

function updateCodeSnippet() {
  if (!currentIcon) return;
  const baseSvg = currentIcon.svg;
  if (currentCodeFormat === 'svg') {
    currentCodeValue = baseSvg;
  } else if (currentCodeFormat === 'react') {
    const camelName = currentIcon.name.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    let jsxSvg = baseSvg.replace(/class=/g, 'className=')
      .replace(/stroke-width/g, 'strokeWidth')
      .replace(/stroke-linecap/g, 'strokeLinecap')
      .replace(/stroke-linejoin/g, 'strokeLinejoin');
    currentCodeValue = `export const ${camelName}Icon = ({ size = 24, color = "currentColor", className = "" }) => (\n  ${jsxSvg.replace('<svg', '<svg width={size} height={size} style={{ color }} className={className}')}\n);`;
  } else if (currentCodeFormat === 'vue') {
    currentCodeValue = `<template>\n  ${baseSvg}\n</template>\n<script setup>\n</script>`;
  }
  codeSnippet.textContent = currentCodeValue;
}

// --- Crypto & GitHub API ---
function hexToBuf(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

async function decryptToken(password) {
  const enc = new TextEncoder();
  const saltBuf = hexToBuf(ENCRYPTED_TOKEN_DATA.salt);
  const ivBuf = hexToBuf(ENCRYPTED_TOKEN_DATA.iv);
  const authTagBuf = hexToBuf(ENCRYPTED_TOKEN_DATA.authTag);
  const cipherBuf = hexToBuf(ENCRYPTED_TOKEN_DATA.ciphertext);
  
  // Combine ciphertext and authTag for Web Crypto AES-GCM
  const dataBuf = new Uint8Array(cipherBuf.length + authTagBuf.length);
  dataBuf.set(cipherBuf);
  dataBuf.set(authTagBuf, cipherBuf.length);

  try {
    const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), {name: "PBKDF2"}, false, ["deriveKey"]);
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: saltBuf, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, dataBuf);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    throw new Error("Invalid password or corrupted token.");
  }
}

async function getFileSha(path, token) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.status === 404) return null;
  const data = await res.json();
  return data.sha;
}

async function pushToGitHub(path, content, message, password, sha = null) {
  const token = await decryptToken(password);
  if (!token) throw new Error("Could not decrypt token.");

  const body = {
    message,
    branch: GITHUB_BRANCH
  };
  
  if (content) body.content = btoa(unescape(encodeURIComponent(content))); // base64 encode
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: content ? 'PUT' : 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'GitHub API error');
  }
  return true;
}
// ---------------------------

function setupEventListeners() {
  searchInput.addEventListener('input', (e) => { searchQuery = e.target.value; renderIcons(); });
  iconSizeInput.addEventListener('input', (e) => { iconSizeValue.textContent = e.target.value + 'px'; renderIcons(); });
  iconColorInput.addEventListener('input', (e) => { iconColorHex.textContent = e.target.value; renderIcons(); if (currentIcon) modalIconPreview.style.color = e.target.value; });
  
  document.querySelectorAll('.closeModalBtn, .closeUploadModalBtn, .closeDeleteModalBtn').forEach(btn => {
    btn.addEventListener('click', closeModals);
  });
  document.querySelectorAll('.backdrop-modal').forEach(bd => {
    bd.addEventListener('click', closeModals);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => { b.classList.remove('border-brand', 'text-brand'); b.classList.add('border-transparent', 'text-gray-500'); });
      e.target.classList.remove('border-transparent', 'text-gray-500');
      e.target.classList.add('border-brand', 'text-brand');
      currentCodeFormat = e.target.dataset.tab;
      updateCodeSnippet();
    });
  });
  
  copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentCodeValue);
    const originalHtml = copyCodeBtn.innerHTML;
    copyCodeBtn.innerHTML = 'Copied!';
    setTimeout(() => copyCodeBtn.innerHTML = originalHtml, 2000);
  });
  
  downloadSvgBtn.addEventListener('click', () => {
    if (!currentIcon) return;
    const blob = new Blob([currentIcon.svg], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${currentIcon.name}.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });

  // Upload Logic
  openUploadModalBtn.addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  });

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('uploadFile').files[0];
    const name = document.getElementById('uploadName').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const category = document.getElementById('uploadCategory').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const password = document.getElementById('uploadPassword').value;

    if (!file || !name || !category || !password) return;
    if (!name.endsWith('.svg')) name += '.svg';

    const btn = document.getElementById('submitUploadBtn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    uploadStatus.classList.remove('hidden', 'text-red-500', 'text-green-500');
    uploadStatus.classList.add('text-brand');
    uploadStatus.textContent = 'Decrypting token & uploading...';

    try {
      const text = await file.text();
      const filePath = `icons/${category}/${name}`;
      
      // Check if file exists to get SHA for overwriting
      const existingSha = await getFileSha(filePath, await decryptToken(password)).catch(()=>null);
      
      await pushToGitHub(filePath, text, `Add icon: ${name}`, password, existingSha);
      
      uploadStatus.classList.replace('text-brand', 'text-green-500');
      uploadStatus.textContent = 'Success! GitHub Actions is rebuilding the site. Changes will appear in ~1 minute.';
      uploadForm.reset();
      setTimeout(closeModals, 4000);
    } catch (err) {
      uploadStatus.classList.replace('text-brand', 'text-red-500');
      uploadStatus.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload Icon';
    }
  });

  // Delete Logic
  deleteIconBtn.addEventListener('click', () => {
    if (!currentIcon) return;
    document.getElementById('deleteIconNameDisplay').textContent = currentIcon.name;
    iconModal.classList.add('hidden');
    deleteModal.classList.remove('hidden');
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    const password = document.getElementById('deletePassword').value;
    if (!password || !currentIcon) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting...';
    deleteStatus.classList.remove('hidden', 'text-red-500', 'text-green-500');
    deleteStatus.classList.add('text-brand');
    deleteStatus.textContent = 'Deleting from GitHub...';

    try {
      const filePath = `icons/${currentIcon.category}/${currentIcon.name}.svg`;
      const token = await decryptToken(password);
      const sha = await getFileSha(filePath, token);
      
      if (!sha) throw new Error("File not found on GitHub.");
      
      await pushToGitHub(filePath, null, `Delete icon: ${currentIcon.name}`, password, sha);
      
      deleteStatus.classList.replace('text-brand', 'text-green-500');
      deleteStatus.textContent = 'Success! Rebuilding site...';
      setTimeout(() => {
        closeModals();
        document.getElementById('deletePassword').value = '';
      }, 3000);
    } catch (err) {
      deleteStatus.classList.replace('text-brand', 'text-red-500');
      deleteStatus.textContent = err.message;
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Delete';
    }
  });
}

function setupTheme() {
  const iconDark = document.getElementById('themeIconDark');
  const iconLight = document.getElementById('themeIconLight');
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    iconLight.classList.remove('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    iconDark.classList.remove('hidden');
  }
  themeToggle.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      iconLight.classList.add('hidden');
      iconDark.classList.remove('hidden');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      iconDark.classList.add('hidden');
      iconLight.classList.remove('hidden');
    }
  });
}

init();
