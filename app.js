let iconsData = [];
let searchQuery = '';
let currentIcon = null;

// ==========================================
// CONFIGURATION (Admin must set these)
// ==========================================
const GITHUB_OWNER = 'sid-casepoint';
const GITHUB_REPO = 'icon-library';
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
const clearSearchBtn = document.getElementById('clearSearchBtn');
const noResults = document.getElementById('noResults');
const themeToggle = document.getElementById('themeToggle');
// Modal Elements
const iconModal = document.getElementById('iconModal');
const modalIconPreview = document.getElementById('modalIconPreview');
const modalIconTitle = document.getElementById('modalIconTitle');
const modalIconTags = document.getElementById('modalIconTags');
const codeSnippet = document.getElementById('codeSnippet');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const downloadSvgBtn = document.getElementById('downloadSvgBtn');

// Upload & Delete Modals
const uploadModal = document.getElementById('uploadModal');
const deleteModal = document.getElementById('deleteModal');
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const deleteStatus = document.getElementById('deleteStatus');
const openUploadModalBtn = document.getElementById('openUploadModalBtn');
const deleteIconBtn = document.getElementById('deleteIconBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

const DEFAULT_COLOR = '#3b82f6';
let currentCodeValue = '';

async function init() {
  try {
    const res = await fetch('dist/icons.json');
    if (!res.ok) throw new Error('Could not load icons.json');
    iconsData = await res.json();
    renderIcons();
    setupEventListeners();
    setupTheme();
  } catch (err) {
    resultsCount.textContent = 'Error loading icons. Did you run the build script?';
    console.error(err);
  }
}

function getFilteredIcons() {
  return iconsData.filter(icon => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return icon.name.toLowerCase().includes(query) || icon.tags.some(t => t.toLowerCase().includes(query));
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
  
  iconGrid.innerHTML = filtered.map(icon => `
    <button class="icon-card flex flex-col items-center justify-center p-8 bg-surfaceLight dark:bg-surfaceDark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-brand dark:hover:border-accent hover:shadow-lux hover:-translate-y-1 transition-all duration-300 group" data-id="${icon.id}">
      <div class="mb-4 text-gray-800 dark:text-gray-200 group-hover:text-brand dark:group-hover:text-accent transition-colors w-10 h-10">
        ${icon.svg}
      </div>
      <span class="text-sm text-gray-500 dark:text-gray-400 font-medium truncate w-full text-center group-hover:text-gray-900 dark:group-hover:text-white transition-colors">${icon.name}</span>
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
  modalIconTags.innerHTML = currentIcon.tags.map(tag => `<button type="button" class="tag-btn inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-brand hover:text-white dark:bg-darkBg dark:text-gray-300 dark:hover:bg-accent dark:hover:text-gray-900 dark:border-gray-700 dark:border transition-colors shadow-sm" data-tag="${tag}">${tag}</button>`).join('');
  
  modalIconTags.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      closeModals();
      updateSearch(e.target.dataset.tag);
    });
  });
  
  // Setup Edit Tags UI
  document.getElementById('editTagsForm').classList.add('hidden');
  document.getElementById('editTagsStatus').classList.add('hidden');
  document.getElementById('editTagsInput').value = (currentIcon.customTags || []).join(', ');
  
  modalIconPreview.innerHTML = currentIcon.svg;
  modalIconPreview.style.width = '80px';
  modalIconPreview.style.height = '80px';
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
  currentCodeValue = currentIcon.svg;
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

async function pushToGitHub(path, content, message, sha = null) {
  const token = sessionStorage.getItem('githubToken');
  if (!token) throw new Error("Not authenticated.");

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

function updateSearch(query) {
  searchQuery = query;
  searchInput.value = query;
  if (query) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }
  renderIcons();
}

function setupEventListeners() {
  searchInput.addEventListener('input', (e) => updateSearch(e.target.value));
  clearSearchBtn.addEventListener('click', () => updateSearch(''));
  
  document.querySelectorAll('.closeModalBtn, .closeUploadModalBtn, .closeDeleteModalBtn').forEach(btn => {
    btn.addEventListener('click', closeModals);
  });
  document.querySelectorAll('.backdrop-modal').forEach(bd => {
    bd.addEventListener('click', closeModals);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });
  

  
  copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentCodeValue);
    const originalHtml = copyCodeBtn.innerHTML;
    copyCodeBtn.innerHTML = 'Copied!';
    setTimeout(() => copyCodeBtn.innerHTML = originalHtml, 2000);
  });
  
  const downloadPngBtn = document.getElementById('downloadPngBtn');
  const downloadJpgBtn = document.getElementById('downloadJpgBtn');
  const exportSizeInput = document.getElementById('exportSizeInput');
  
  function downloadImage(format) {
    if (!currentIcon) return;
    const size = parseInt(exportSizeInput.value, 10) || 512;
    const color = '#000000';
    
    // Create a canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // If JPG, fill with white background first (since JPG doesn't support transparency)
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
    }
    
    // Convert SVG to an image
    const svgData = currentIcon.svg
      .replace('<svg', `<svg width="${size}" height="${size}" style="color: ${color}"`)
      .replace(/currentColor/g, color);
      
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      
      const imgUrl = canvas.toDataURL(`image/${format}`, 1.0);
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `${currentIcon.name}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = url;
  }
  
  downloadPngBtn.addEventListener('click', () => downloadImage('png'));
  downloadJpgBtn.addEventListener('click', () => downloadImage('jpeg'));

  downloadSvgBtn.addEventListener('click', () => {
    if (!currentIcon) return;
    const size = parseInt(exportSizeInput.value, 10) || 512;
    
    const svgData = currentIcon.svg
      .replace('<svg', `<svg width="${size}" height="${size}" style="color: #000000"`)
      .replace(/currentColor/g, '#000000');
      
    const blob = new Blob([svgData], {type: 'image/svg+xml'});
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
    let name = document.getElementById('uploadName').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (!file || !name) return;
    if (!name.endsWith('.svg')) name += '.svg';

    const btn = document.getElementById('submitUploadBtn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    uploadStatus.classList.remove('hidden', 'text-red-500', 'text-green-500');
    uploadStatus.classList.add('text-brand');
    uploadStatus.textContent = 'Uploading to GitHub...';

    try {
      let text = await file.text();
      const customTags = document.getElementById('uploadTags').value.trim();
      
      if (customTags) {
        // Inject data-tags attribute into the opening <svg> tag
        text = text.replace(/<svg\s/, `<svg data-tags="${customTags}" `);
      }
      
      const filePath = `icons/${name}`; // Directly in icons folder
      const token = sessionStorage.getItem('githubToken');
      
      // Check if file exists to get SHA for overwriting
      const existingSha = await getFileSha(filePath, token).catch(()=>null);
      
      await pushToGitHub(filePath, text, `Add icon: ${name}`, existingSha);
      
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
    if (!currentIcon) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting...';
    deleteStatus.classList.remove('hidden', 'text-red-500', 'text-green-500');
    deleteStatus.classList.add('text-brand');
    deleteStatus.textContent = 'Deleting from GitHub...';

    try {
      const filePath = `icons/${currentIcon.name}.svg`; // Directly in icons folder
      const token = sessionStorage.getItem('githubToken');
      const sha = await getFileSha(filePath, token);
      
      if (!sha) throw new Error("File not found on GitHub.");
      
      await pushToGitHub(filePath, null, `Delete icon: ${currentIcon.name}`, sha);
      
      deleteStatus.classList.replace('text-brand', 'text-green-500');
      deleteStatus.textContent = 'Success! Rebuilding site...';
      setTimeout(() => {
        closeModals();
      }, 3000);
    } catch (err) {
      deleteStatus.classList.replace('text-brand', 'text-red-500');
      deleteStatus.textContent = err.message;
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Delete';
    }
  });

  const editTagsBtn = document.getElementById('editTagsBtn');
  const editTagsForm = document.getElementById('editTagsForm');
  const saveTagsBtn = document.getElementById('saveTagsBtn');
  const editTagsInput = document.getElementById('editTagsInput');
  const editTagsStatus = document.getElementById('editTagsStatus');

  editTagsBtn.addEventListener('click', () => {
    editTagsForm.classList.toggle('hidden');
  });

  saveTagsBtn.addEventListener('click', async () => {
    if (!currentIcon) return;
    
    saveTagsBtn.disabled = true;
    saveTagsBtn.textContent = 'Saving...';
    editTagsStatus.classList.remove('hidden', 'text-red-500', 'text-green-500');
    editTagsStatus.classList.add('text-brand');
    editTagsStatus.textContent = 'Updating tags on GitHub...';
    
    try {
      const customTags = editTagsInput.value.trim();
      let text = currentIcon.svg;
      
      // Remove existing data-tags if any
      text = text.replace(/\sdata-tags="[^"]*"/g, '');
      
      if (customTags) {
        text = text.replace(/<svg\s/, `<svg data-tags="${customTags}" `);
      }
      
      const filePath = `icons/${currentIcon.name}.svg`;
      const token = sessionStorage.getItem('githubToken');
      const sha = await getFileSha(filePath, token);
      
      if (!sha) throw new Error("File not found on GitHub.");
      
      await pushToGitHub(filePath, text, `Update tags: ${currentIcon.name}`, sha);
      
      editTagsStatus.classList.replace('text-brand', 'text-green-500');
      editTagsStatus.textContent = 'Success! Rebuilding site...';
      
      setTimeout(() => {
        editTagsForm.classList.add('hidden');
      }, 2000);
    } catch (err) {
      editTagsStatus.classList.replace('text-brand', 'text-red-500');
      editTagsStatus.textContent = err.message;
    } finally {
      saveTagsBtn.disabled = false;
      saveTagsBtn.textContent = 'Save';
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

// Authentication Logic
const loginScreen = document.getElementById('loginScreen');
const appContent = document.getElementById('appContent');
const loginForm = document.getElementById('loginForm');
const sitePassword = document.getElementById('sitePassword');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

async function checkAuth() {
  const token = sessionStorage.getItem('githubToken');
  if (token) {
    loginScreen.classList.add('hidden');
    appContent.classList.remove('hidden');
    init();
  } else {
    loginScreen.classList.remove('hidden');
    appContent.classList.add('hidden');
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = 'Verifying...';
  loginError.classList.add('hidden');
  
  try {
    const token = await decryptToken(sitePassword.value);
    sessionStorage.setItem('githubToken', token);
    checkAuth();
  } catch (err) {
    loginError.textContent = "Invalid password. Access denied.";
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Unlock Icon Library';
  }
});

checkAuth();
