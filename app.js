/**
 * Icon Library - Production Architecture
 * 099 Styleguide Compliant, 5-Theme Engine, Session Auth, WCAG Compliant
 */

// ── Application State ─────────────────────────────────────────────────────────
let iconsData = [];
let searchQuery = '';
let currentIcon = null;
const selectedIcons = new Set();
let _lastFocusedElement = null;
let _searchDebounceTimer = null;
let _eventsInitialized = false;

// ── Theme Engine ──────────────────────────────────────────────────────────────
const Theme = {
  current: 'light',
  init() {
    const saved = localStorage.getItem('themePref') || 'light';
    this.set(saved);
  },
  set(themeName) {
    const validThemes = ['light', 'dark', 'beige', 'yellow', 'blue'];
    const theme = validThemes.includes(themeName) ? themeName : 'light';
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('themePref', theme);

    // Update switcher active state
    document.querySelectorAll('.theme-btn').forEach(btn => {
      if (btn.dataset.theme === theme) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-checked', 'false');
      }
    });
  }
};

// ── Secure Session Authentication ─────────────────────────────────────────────
const Auth = (() => {
  let _token = null;
  return {
    set(token) {
      _token = token;
      try {
        if (token) sessionStorage.setItem('icon_lib_auth_token', token);
        else sessionStorage.removeItem('icon_lib_auth_token');
      } catch {}
    },
    get() {
      if (_token) return _token;
      try {
        const stored = sessionStorage.getItem('icon_lib_auth_token');
        if (stored) {
          _token = stored;
          return stored;
        }
      } catch {}
      return null;
    },
    clear() {
      _token = null;
      try { sessionStorage.removeItem('icon_lib_auth_token'); } catch {}
    },
    isAuthenticated() {
      return typeof this.get() === 'string' && this.get().length > 0;
    }
  };
})();

// ── Configuration ────────────────────────────────────────────────────────────
const GITHUB_CONFIG = Object.freeze({
  owner: 'sid-casepoint',
  repo: 'icon-library',
  branch: 'main'
});

const ENCRYPTED_TOKEN_DATA = Object.freeze({
  salt: '78a18277e1a7b6ef8092a90719f67ec8',
  iv: '15d1093d5fcd448595da8a0e',
  authTag: '817580232c0ce33889e31446d515bb71',
  ciphertext: '68d790ad8fd2d004ac1f1d163712e6b3f1e4e3f8ca99a4acf8ecab665b34eddb21fefc442549675a2b690e674109a57588f0a79884c9b90350306402be3963c2db9b03c6efc0f4b72337b3473d7eb57580dc5f482c65d879459d3734cd'
});

// ── DOM References ───────────────────────────────────────────────────────────
const DOM = {
  loginScreen: document.getElementById('loginScreen'),
  loginForm: document.getElementById('loginForm'),
  sitePassword: document.getElementById('sitePassword'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  appContent: document.getElementById('appContent'),
  siteLogo: document.getElementById('siteLogo'),
  iconGrid: document.getElementById('iconGrid'),
  iconCount: document.getElementById('iconCount'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  sortSelect: document.getElementById('sortSelect'),
  gridSizeSelect: document.getElementById('gridSizeSelect'),
  noResults: document.getElementById('noResults'),
  multiselectBar: document.getElementById('multiselectBar'),
  multiselectCount: document.getElementById('multiselectCount'),
  multiselectDeleteBtn: document.getElementById('multiselectDeleteBtn'),
  // Icon Detail Modal
  iconModal: document.getElementById('iconModal'),
  iconDrawer: document.getElementById('iconDrawer'),
  modalIconTitle: document.getElementById('modalIconTitle'),
  modalIconPreview: document.getElementById('modalIconPreview'),
  modalIconTags: document.getElementById('modalIconTags'),
  renameIconBtn: document.getElementById('renameIconBtn'),
  renameIconInput: document.getElementById('renameIconInput'),
  saveRenameBtn: document.getElementById('saveRenameBtn'),
  cancelRenameBtn: document.getElementById('cancelRenameBtn'),
  renameStatus: document.getElementById('renameStatus'),
  deleteIconBtn: document.getElementById('deleteIconBtn'),
  replaceIconInput: document.getElementById('replaceIconInput'),
  replaceSvgBtn: document.getElementById('replaceSvgBtn'),
  replaceStatus: document.getElementById('replaceStatus'),
  editTagsBtn: document.getElementById('editTagsBtn'),
  editTagsForm: document.getElementById('editTagsForm'),
  editTagsInput: document.getElementById('editTagsInput'),
  editTagsStatus: document.getElementById('editTagsStatus'),
  saveTagsBtn: document.getElementById('saveTagsBtn'),
  exportSizeInput: document.getElementById('exportSizeInput'),
  downloadSvgBtn: document.getElementById('downloadSvgBtn'),
  downloadPngBtn: document.getElementById('downloadPngBtn'),
  downloadJpgBtn: document.getElementById('downloadJpgBtn'),
  codeSnippet: document.getElementById('codeSnippet'),
  copyCodeBtn: document.getElementById('copyCodeBtn'),
  copyPngBtn: document.getElementById('copyPngBtn'),
  copyJpgBtn: document.getElementById('copyJpgBtn'),
  // Upload Modal
  uploadModal: document.getElementById('uploadModal'),
  openUploadModalBtn: document.getElementById('openUploadModalBtn'),
  uploadFile: document.getElementById('uploadFile'),
  uploadItemsContainer: document.getElementById('uploadItemsContainer'),
  uploadFooter: document.getElementById('uploadFooter'),
  submitUploadBtn: document.getElementById('submitUploadBtn'),
  uploadStatus: document.getElementById('uploadStatus'),
  // Delete Modal
  deleteModal: document.getElementById('deleteModal'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  deleteStatus: document.getElementById('deleteStatus')
};

// ── Helper Utilities ──────────────────────────────────────────────────────────

// Convert raw SVG string to a data: URI for pixel-perfect <img> rendering.
// This provides complete sandboxing — no CSS leaks, no DOM interference.
function svgToImgSrc(svgString) {
  if (!svgString) return '';
  const encoded = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${encoded}`;
}

function minifySVG(svgString) {
  if (!svgString) return '';
  return svgString
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;\s*}/g, '}')
    .trim();
}

function bytesToBase64(bytes) {
  const CHUNK_SIZE = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

function resolveIconPath(icon) {
  const catPrefix = icon?.category && icon.category !== 'general' ? `${icon.category}/` : '';
  return `icons/${catPrefix}${icon?.name || 'icon'}.svg`;
}

function escapeAttribute(str) {
  return String(str || '').replace(/["&<>]/g, char => ({
    '"': '&quot;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  }[char]));
}

// ── State Synchronization (Optimistic UI Layer) ──────────────────────────────
function reconcileLocalState(serverIcons) {
  if (!Array.isArray(serverIcons)) return [];
  let reconciled = serverIcons.filter(Boolean);

  // 1. Apply local edits (renames, replacements, updated tags)
  try {
    const localEdits = JSON.parse(localStorage.getItem('localEdits') || '{}');
    if (localEdits && typeof localEdits === 'object') {
      for (const [id, edit] of Object.entries(localEdits)) {
        if (!edit) continue;
        const matchIndex = reconciled.findIndex(i => i && (i.id === id || i.name === id));
        if (matchIndex !== -1) {
          if (reconciled[matchIndex].lastModified && edit.editTime && reconciled[matchIndex].lastModified > edit.editTime) {
            delete localEdits[id];
          } else {
            reconciled[matchIndex] = {
              ...reconciled[matchIndex],
              id: edit.newId || reconciled[matchIndex].id,
              name: edit.newName || reconciled[matchIndex].name,
              svg: edit.newSvg || reconciled[matchIndex].svg,
              tags: Array.isArray(edit.newTags) ? edit.newTags : reconciled[matchIndex].tags
            };
          }
        }
      }
      localStorage.setItem('localEdits', JSON.stringify(localEdits));
    }
  } catch (e) {
    console.warn('Failed to reconcile localEdits', e);
  }

  // 2. Filter out locally deleted icons
  try {
    const deletedCache = JSON.parse(localStorage.getItem('deletedIcons') || '[]');
    if (Array.isArray(deletedCache) && deletedCache.length > 0) {
      const activeDeletions = deletedCache.filter(deletedId => {
        return reconciled.some(icon => icon && (icon.id === deletedId || icon.name === deletedId));
      });
      reconciled = reconciled.filter(icon => icon && !deletedCache.includes(icon.id) && !deletedCache.includes(icon.name));
      localStorage.setItem('deletedIcons', JSON.stringify(activeDeletions));
    }
  } catch (e) {
    console.warn('Failed to reconcile deletedIcons', e);
  }

  // 3. Prepend optimistically uploaded icons
  try {
    const pendingCache = JSON.parse(localStorage.getItem('pendingIcons') || '[]');
    if (Array.isArray(pendingCache) && pendingCache.length > 0) {
      const stillPending = [];
      for (const pendingIcon of pendingCache) {
        if (!pendingIcon) continue;
        const alreadyOnServer = reconciled.some(i => i && i.name === pendingIcon.name);
        if (!alreadyOnServer) {
          stillPending.push(pendingIcon);
          reconciled.unshift(pendingIcon);
        }
      }
      localStorage.setItem('pendingIcons', JSON.stringify(stillPending));
    }
  } catch (e) {
    console.warn('Failed to reconcile pendingIcons', e);
  }

  return reconciled;
}

// ── Robust Index Fetcher ──────────────────────────────────────────────────────
async function fetchIconIndex() {
  const candidates = ['dist/icons.json', './dist/icons.json', '../dist/icons.json', '/dist/icons.json'];
  for (const path of candidates) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Try next candidate
    }
  }
  throw new Error('Could not load icons.json');
}

// ── Application Initialization ───────────────────────────────────────────────
async function init() {
  Theme.init();
  try {
    const serverIcons = await fetchIconIndex();
    iconsData = reconcileLocalState(serverIcons);
    renderIcons();
    setupEventListeners();
  } catch (err) {
    console.error('Initialization error:', err);
    if (DOM.noResults) {
      DOM.noResults.classList.remove('hidden');
      const p = DOM.noResults.querySelector('p');
      if (p) p.textContent = 'NO ICONS FOUND';
    }
  }
}

// ── Rendering & Filtering ─────────────────────────────────────────────────────
function getFilteredIcons() {
  const query = (DOM.searchInput ? DOM.searchInput.value : searchQuery).trim().toLowerCase();
  if (!query) return iconsData;

  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return iconsData;

  return iconsData.filter(icon => {
    if (!icon) return false;
    const name = String(icon.name || '').toLowerCase();
    const tags = (Array.isArray(icon.tags) ? icon.tags : []).map(t => String(t || '').toLowerCase());
    
    return terms.every(term => {
      return name.includes(term) || tags.some(t => t.includes(term));
    });
  });
}

function renderIcons() {
  const filtered = getFilteredIcons();

  if (DOM.iconCount) {
    DOM.iconCount.textContent = filtered.length;
  }

  const sortMode = localStorage.getItem('sortPref') || (DOM.sortSelect ? DOM.sortSelect.value : 'newest');
  filtered.sort((a, b) => {
    const nameA = String(a?.name || '');
    const nameB = String(b?.name || '');
    if (sortMode === 'az') return nameA.localeCompare(nameB);
    if (sortMode === 'za') return nameB.localeCompare(nameA);
    const timeA = Number(a?.lastModified) || 0;
    const timeB = Number(b?.lastModified) || 0;
    if (sortMode === 'newest') return timeB - timeA;
    if (sortMode === 'oldest') return timeA - timeB;
    return 0;
  });

  if (filtered.length === 0) {
    DOM.iconGrid.innerHTML = '';
    DOM.noResults.classList.remove('hidden');
    return;
  }
  DOM.noResults.classList.add('hidden');

  const iconSize = parseInt(localStorage.getItem('gridSizePref') || (DOM.gridSizeSelect ? DOM.gridSizeSelect.value : '75'), 10);

  DOM.iconGrid.className = 'grid gap-6 w-full ' + (
    iconSize === 100 ? 'grid-cols-[repeat(auto-fill,minmax(220px,1fr))]' :
    iconSize === 50  ? 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]' :
    'grid-cols-[repeat(auto-fill,minmax(190px,1fr))]'
  );

  DOM.iconGrid.innerHTML = filtered.map(icon => {
    if (!icon) return '';
    const iconId = icon.id || icon.name || 'icon';
    const iconName = icon.name || iconId;
    const isSelected = selectedIcons.has(iconId);
    const imgSrc = svgToImgSrc(icon.svg || '');

    return `
      <div class="relative group" data-icon-id="${escapeAttribute(iconId)}">
        <button type="button" 
                class="multiselect-cb absolute top-3 left-3 opacity-0 group-hover:opacity-100 z-10 ${isSelected ? 'is-checked' : ''}" 
                data-action="select"
                data-id="${escapeAttribute(iconId)}" 
                role="checkbox"
                aria-checked="${isSelected}"
                aria-label="Select icon ${escapeAttribute(iconName)}">
          <svg class="w-2.5 h-2.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
        </button>

        <button type="button" 
                class="icon-card-099 aspect-square w-full flex flex-col p-0 cursor-pointer shadow-xs" 
                data-action="open"
                data-id="${escapeAttribute(iconId)}" 
                aria-label="View details for ${escapeAttribute(iconName)}">
          <div class="w-full flex-1 flex items-center justify-center relative pointer-events-none p-4">
            <img src="${imgSrc}" alt="${escapeAttribute(iconName)}" style="width: ${iconSize}px; height: ${iconSize}px; object-fit: contain;" class="pointer-events-none" />
          </div>
          <div class="icon-card-footer pointer-events-none">
            <span class="truncate w-full text-center">${escapeAttribute(iconName)}</span>
          </div>
        </button>
      </div>
    `;
  }).join('');
}

function updateMultiselectUI() {
  if (DOM.multiselectCount) {
    DOM.multiselectCount.textContent = `${selectedIcons.size} SELECTED`;
  }
  if (DOM.multiselectBar) {
    if (selectedIcons.size > 0) {
      DOM.multiselectBar.classList.remove('translate-y-32');
    } else {
      DOM.multiselectBar.classList.add('translate-y-32');
    }
  }
}

// ── Modal Interactions ────────────────────────────────────────────────────────
function renderModalTags() {
  if (!currentIcon) return;
  const tags = Array.isArray(currentIcon.tags) ? currentIcon.tags : [];
  
  if (tags.length === 0) {
    DOM.modalIconTags.innerHTML = `
      <button type="button" id="addTagsPlaceholderBtn" class="btn-099-secondary !py-1.5 !px-2.5 !text-[11px] !rounded-[6px] flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        ADD TAGS
      </button>
    `;
    if (DOM.editTagsBtn) {
      DOM.editTagsBtn.parentElement.classList.add('hidden');
    }
  } else {
    DOM.modalIconTags.innerHTML = tags.map(tag => `
      <button type="button" class="tag-btn btn-099-secondary !py-1.5 !px-2.5 !text-[11px] !rounded-[6px]" data-tag="${escapeAttribute(tag)}">${escapeAttribute(tag)}</button>
    `).join('');
    if (DOM.editTagsBtn) {
      DOM.editTagsBtn.parentElement.classList.remove('hidden');
    }
  }
}

function openModal(id) {
  currentIcon = iconsData.find(i => i && (i.id === id || i.name === id));
  if (!currentIcon) return;

  DOM.modalIconTitle.textContent = currentIcon.name;
  renderModalTags();

  if (DOM.editTagsForm) DOM.editTagsForm.classList.add('hidden', 'opacity-0');
  if (DOM.editTagsStatus) DOM.editTagsStatus.classList.add('hidden');
  if (DOM.editTagsInput) DOM.editTagsInput.value = (currentIcon.tags || []).join(', ');
  if (DOM.replaceStatus) DOM.replaceStatus.classList.add('hidden');

  const imgSrc = svgToImgSrc(currentIcon.svg || '');
  DOM.modalIconPreview.innerHTML = `<img src="${imgSrc}" alt="${escapeAttribute(currentIcon.name)}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;

  document.querySelectorAll('.preset-icon-container').forEach(container => {
    container.innerHTML = `<img src="${imgSrc}" alt="${escapeAttribute(currentIcon.name)}" style="width: 100%; height: 100%; object-fit: contain;" />`;
  });

  updateCodeSnippet();

  _lastFocusedElement = document.activeElement;
  if (DOM.iconModal) DOM.iconModal.showModal();
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    DOM.iconDrawer.classList.remove('scale-95', 'opacity-0');
    DOM.iconDrawer.classList.add('scale-100', 'opacity-100');
    const firstFocusable = DOM.iconDrawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
  }, 50);
}

function closeModals() {
  if (DOM.iconDrawer && !DOM.iconDrawer.classList.contains('scale-95')) {
    DOM.iconDrawer.classList.remove('scale-100', 'opacity-100');
    DOM.iconDrawer.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      if (DOM.iconModal && DOM.iconModal.open) DOM.iconModal.close();
    }, 250);
  } else {
    if (DOM.iconModal && DOM.iconModal.open) DOM.iconModal.close();
  }

  if (DOM.uploadModal && DOM.uploadModal.open) DOM.uploadModal.close();
  if (DOM.deleteModal && DOM.deleteModal.open) DOM.deleteModal.close();
  document.body.style.overflow = '';
  if (DOM.uploadStatus) DOM.uploadStatus.classList.add('hidden');
  if (DOM.deleteStatus) DOM.deleteStatus.classList.add('hidden');

  _lastFocusedElement?.focus();
  _lastFocusedElement = null;
}

function updateCodeSnippet() {
  if (!currentIcon) return;
  DOM.codeSnippet.textContent = minifySVG(currentIcon.svg || '');
}

function toggleEditTags() {
  if (!DOM.editTagsForm) return;
  const isHidden = DOM.editTagsForm.classList.contains('hidden');
  if (isHidden) {
    DOM.editTagsForm.classList.remove('hidden');
    if (DOM.editTagsInput) {
      DOM.editTagsInput.value = (currentIcon?.tags || []).join(', ');
    }
    setTimeout(() => {
      DOM.editTagsForm.classList.remove('opacity-0');
      DOM.editTagsInput?.focus();
    }, 20);
  } else {
    DOM.editTagsForm.classList.add('opacity-0');
    setTimeout(() => {
      DOM.editTagsForm.classList.add('hidden');
    }, 200);
  }
}

// ── Cryptography & GitHub API Layer ──────────────────────────────────────────
function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
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
    const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuf, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, dataBuf);
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error('Invalid credentials or corrupted key payload.');
  }
}

async function getFileSha(filePath, token) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${encodedPath}?ref=${GITHUB_CONFIG.branch}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub API error (${res.status})`);
  }
  const data = await res.json();
  return data.sha ?? null;
}

async function pushToGitHub(path, content, message, sha = null) {
  const token = Auth.get();
  if (!token) throw new Error('Authentication required.');

  const body = {
    message,
    branch: GITHUB_CONFIG.branch
  };

  if (content !== null && content !== undefined) {
    body.content = bytesToBase64(new TextEncoder().encode(content));
  }
  if (sha) body.sha = sha;

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${encodedPath}`, {
    method: content !== null && content !== undefined ? 'PUT' : 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error (${res.status})`);
  }
  return true;
}

// Helper to prepare SVG for sharp canvas rasterization by forcing width/height to match target size
function prepareSvgForRasterization(svgString, targetSize) {
  if (!svgString) return '';
  return svgString.replace(/<svg\b([^>]*)/i, (match, attrs) => {
    const cleanedAttrs = attrs
      .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '');
    return `<svg${cleanedAttrs} width="${targetSize}" height="${targetSize}"`;
  });
}

// ── Export / Download Engine ──────────────────────────────────────────────────
function downloadImage(format) {
  if (!currentIcon) return;
  const size = parseInt(DOM.exportSizeInput.value, 10) || 512;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
  }

  const svgData = prepareSvgForRasterization(currentIcon.svg || '', size);
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
    setTimeout(() => document.body.removeChild(a), 100);
  };
  img.src = url;
}

function copyImageToClipboard(format) {
  if (!currentIcon) return;
  const size = parseInt(DOM.exportSizeInput.value, 10) || 512;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
  }

  const svgData = prepareSvgForRasterization(currentIcon.svg || '', size);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();

  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(async (imageBlob) => {
      if (!imageBlob) {
        console.error('Blob generation failed');
        return;
      }
      try {
        const item = new ClipboardItem({ [imageBlob.type]: imageBlob });
        await navigator.clipboard.write([item]);
        
        const btn = format === 'jpeg' ? DOM.copyJpgBtn : DOM.copyPngBtn;
        if (btn) {
          const originalText = btn.innerHTML;
          btn.innerHTML = `
            <svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
            COPIED!
          `;
          setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        }
      } catch (err) {
        console.error('Clipboard write failed:', err);
      }
    }, mimeType);
  };
  img.src = url;
}

function updateSearch(query, isProgrammatic = false) {
  searchQuery = query;
  if ((isProgrammatic || document.activeElement !== DOM.searchInput) && DOM.searchInput && DOM.searchInput.value !== query) {
    DOM.searchInput.value = query;
  }
  if (DOM.clearSearchBtn) {
    if (query && query.trim()) {
      DOM.clearSearchBtn.classList.remove('hidden');
    } else {
      DOM.clearSearchBtn.classList.add('hidden');
    }
  }
  renderIcons();
}

// ── File Upload Handler ───────────────────────────────────────────────────────
let selectedUploadFiles = [];

function renderUploadItems() {
  DOM.uploadItemsContainer.innerHTML = '';

  if (selectedUploadFiles.length === 0) {
    DOM.uploadFooter.classList.add('hidden');
    return;
  }

  DOM.uploadFooter.classList.remove('hidden');
  DOM.submitUploadBtn.innerHTML = `
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
    Upload ${selectedUploadFiles.length} Icon${selectedUploadFiles.length > 1 ? 's' : ''}
  `;

  selectedUploadFiles.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-4 p-3.5 border rounded-[8px]';
    row.style.backgroundColor = 'var(--sub-bg)';
    row.style.borderColor = 'var(--border-subtle)';

    const previewBox = document.createElement('div');
    previewBox.className = 'w-12 h-12 shrink-0 p-2 flex items-center justify-center border rounded-[6px] overflow-hidden';
    previewBox.style.backgroundColor = 'var(--card-bg)';
    previewBox.style.borderColor = 'var(--border-subtle)';
    previewBox.innerHTML = `<img src="${svgToImgSrc(item.svgContent)}" alt="preview" style="width: 100%; height: 100%; object-fit: contain;" />`;

    const inputsCol = document.createElement('div');
    inputsCol.className = 'flex-1 flex gap-3';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = item.name;
    nameInput.placeholder = 'Icon Name';
    nameInput.className = 'flex-1 px-3 py-2 text-xs border rounded-[6px] outline-none';
    nameInput.style.backgroundColor = 'var(--card-bg)';
    nameInput.style.borderColor = 'var(--border-subtle)';
    nameInput.style.color = 'var(--fg)';

    nameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      selectedUploadFiles[index].name = val;

      const isClash = iconsData.some(icon => icon && icon.name === val) ||
                      selectedUploadFiles.filter((_, i) => i !== index).some(it => it.name === val);

      if (isClash) {
        nameInput.style.borderColor = '#ef4444';
      } else {
        nameInput.style.borderColor = 'var(--border-subtle)';
      }
    });

    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.value = item.tags;
    tagsInput.placeholder = 'Tags (comma separated)';
    tagsInput.className = 'flex-1 px-3 py-2 text-xs border rounded-[6px] outline-none';
    tagsInput.style.backgroundColor = 'var(--card-bg)';
    tagsInput.style.borderColor = 'var(--border-subtle)';
    tagsInput.style.color = 'var(--fg)';
    tagsInput.addEventListener('input', (e) => {
      selectedUploadFiles[index].tags = e.target.value;
    });

    inputsCol.appendChild(nameInput);
    inputsCol.appendChild(tagsInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'shrink-0 p-2 text-red-500 hover:text-red-600 transition-colors cursor-pointer';
    removeBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    removeBtn.addEventListener('click', () => {
      selectedUploadFiles.splice(index, 1);
      renderUploadItems();
    });

    row.appendChild(previewBox);
    row.appendChild(inputsCol);
    row.appendChild(removeBtn);

    DOM.uploadItemsContainer.appendChild(row);
  });
}

function updatePresetSelectionUI(size) {
  const presetSizeBtns = document.querySelectorAll('.preset-size-btn');
  presetSizeBtns.forEach(b => {
    const box = b.querySelector('.preset-box');
    const span = b.querySelector('span');
    if (b.dataset.size === String(size)) {
      b.style.color = 'var(--fg)';
      box.style.borderWidth = '2px';
      box.style.borderColor = 'var(--fg)';
      span?.classList.add('font-medium');
    } else {
      b.style.color = 'var(--muted-soft)';
      box.style.borderWidth = '1px';
      box.style.borderColor = 'var(--border-subtle)';
      span?.classList.remove('font-medium');
    }
  });
}

// ── Global Event Delegation & Setup ──────────────────────────────────────────
function setupEventListeners() {
  if (_eventsInitialized) return;
  _eventsInitialized = true;

  // Site Logo Reset click handler
  DOM.siteLogo?.addEventListener('click', () => {
    updateSearch('', true);
    
    if (DOM.sortSelect) {
      DOM.sortSelect.value = 'newest';
      localStorage.setItem('sortPref', 'newest');
    }
    
    if (DOM.gridSizeSelect) {
      DOM.gridSizeSelect.value = '75';
      localStorage.setItem('gridSizePref', '75');
    }
    
    selectedIcons.clear();
    updateMultiselectUI();
    closeModals();
    renderIcons();
  });

  // Theme Switcher buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      Theme.set(theme);
    });
  });

  // Search input debounced
  DOM.searchInput?.addEventListener('input', (e) => {
    clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(() => updateSearch(e.target.value, false), 120);
  });

  DOM.clearSearchBtn?.addEventListener('click', () => updateSearch('', true));

  // Sort & Grid size settings persistence
  if (DOM.sortSelect) {
    const savedSort = localStorage.getItem('sortPref') || 'newest';
    DOM.sortSelect.value = savedSort;
    DOM.sortSelect.addEventListener('change', (e) => {
      localStorage.setItem('sortPref', e.target.value);
      renderIcons();
    });
  }

  if (DOM.gridSizeSelect) {
    const savedSize = localStorage.getItem('gridSizePref') || '75';
    DOM.gridSizeSelect.value = savedSize;
    DOM.gridSizeSelect.addEventListener('change', (e) => {
      localStorage.setItem('gridSizePref', e.target.value);
      renderIcons();
    });
  }

  // ── High Performance Event Delegation on Icon Grid ────────────────────────
  DOM.iconGrid?.addEventListener('click', (e) => {
    const target = e.target;
    const actionBtn = target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    const id = actionBtn.dataset.id;

    if (action === 'open') {
      openModal(id);
    } else if (action === 'select') {
      e.stopPropagation();
      if (selectedIcons.has(id)) {
        selectedIcons.delete(id);
        actionBtn.classList.remove('is-checked');
        actionBtn.setAttribute('aria-checked', 'false');
      } else {
        selectedIcons.add(id);
        actionBtn.classList.add('is-checked');
        actionBtn.setAttribute('aria-checked', 'true');
      }
      updateMultiselectUI();
    }
  });

  // Modal tags delegation
  DOM.modalIconTags?.addEventListener('click', (e) => {
    const addBtn = e.target.closest('#addTagsPlaceholderBtn');
    if (addBtn) {
      toggleEditTags();
      return;
    }
    const tagBtn = e.target.closest('.tag-btn');
    if (!tagBtn) return;
    const tag = tagBtn.dataset.tag;
    closeModals();
    updateSearch(tag, true);
  });

  // Close modals handlers
  document.querySelectorAll('.closeModalBtn, .closeUploadModalBtn, .closeDeleteModalBtn').forEach(btn => {
    btn.addEventListener('click', closeModals);
  });

  document.querySelectorAll('.backdrop-modal').forEach(bd => {
    bd.addEventListener('click', closeModals);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModals();
    }
  });

  // Preset size buttons in modal
  const presetSizeBtns = document.querySelectorAll('.preset-size-btn');
  presetSizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.size;
      if (DOM.exportSizeInput) DOM.exportSizeInput.value = size;
      updatePresetSelectionUI(size);
    });
  });

  DOM.exportSizeInput?.addEventListener('input', () => {
    const size = DOM.exportSizeInput.value;
    updatePresetSelectionUI(size);
  });

  // Download handlers
  DOM.downloadPngBtn?.addEventListener('click', () => downloadImage('png'));
  DOM.downloadJpgBtn?.addEventListener('click', () => downloadImage('jpeg'));

  DOM.downloadSvgBtn?.addEventListener('click', () => {
    if (!currentIcon) return;
    const size = parseInt(DOM.exportSizeInput.value, 10) || 512;
    let svgData = currentIcon.svg || '';
    if (!svgData.includes('width=') && !svgData.includes('height=')) {
      svgData = svgData.replace('<svg', `<svg width="${size}" height="${size}"`);
    }

    const minified = minifySVG(svgData);
    const blob = new Blob([minified], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentIcon.name}.svg`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });

  DOM.copyCodeBtn?.addEventListener('click', () => {
    if (!currentIcon || !currentIcon.svg) return;
    const minified = minifySVG(currentIcon.svg);
    navigator.clipboard.writeText(minified).then(() => {
      const originalText = DOM.copyCodeBtn.innerHTML;
      DOM.copyCodeBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
        COPIED!
      `;
      setTimeout(() => { DOM.copyCodeBtn.innerHTML = originalText; }, 2000);
    });
  });

  DOM.copyPngBtn?.addEventListener('click', () => copyImageToClipboard('png'));
  DOM.copyJpgBtn?.addEventListener('click', () => copyImageToClipboard('jpeg'));

  // Upload modal trigger
  DOM.openUploadModalBtn?.addEventListener('click', () => {
    if (DOM.uploadModal) DOM.uploadModal.showModal();
    document.body.style.overflow = 'hidden';
  });

  // Delete modal trigger
  DOM.deleteIconBtn?.addEventListener('click', () => {
    if (!currentIcon) return;
    if (DOM.iconModal && DOM.iconModal.open) DOM.iconModal.close();
    if (DOM.deleteModal) DOM.deleteModal.showModal();
  });

  DOM.confirmDeleteBtn?.addEventListener('click', async () => {
    if (!currentIcon) return;

    DOM.confirmDeleteBtn.disabled = true;
    DOM.confirmDeleteBtn.textContent = 'Deleting...';
    DOM.deleteStatus.classList.remove('hidden', 'text-red-600', 'text-green-600');
    DOM.deleteStatus.style.color = 'var(--fg)';
    DOM.deleteStatus.textContent = 'Deleting from GitHub...';

    try {
      const token = Auth.get();
      let filePath = resolveIconPath(currentIcon);
      let sha = await getFileSha(filePath, token);
      if (!sha && filePath !== `icons/${currentIcon.name}.svg`) {
        filePath = `icons/${currentIcon.name}.svg`;
        sha = await getFileSha(filePath, token);
      }

      if (!sha) throw new Error('File not found on GitHub repository.');

      await pushToGitHub(filePath, null, `Delete icon: ${currentIcon.name}`, sha);

      const deletedCache = JSON.parse(localStorage.getItem('deletedIcons') || '[]');
      if (!deletedCache.includes(currentIcon.id)) deletedCache.push(currentIcon.id);
      localStorage.setItem('deletedIcons', JSON.stringify(deletedCache));

      iconsData = iconsData.filter(i => i && i.id !== currentIcon.id && i.name !== currentIcon.name);
      renderIcons();

      DOM.deleteStatus.classList.replace('text-red-600', 'text-green-600');
      DOM.deleteStatus.textContent = 'Success! Icon deleted.';
      setTimeout(closeModals, 1500);
    } catch (err) {
      DOM.deleteStatus.classList.add('text-red-600');
      DOM.deleteStatus.textContent = err.message;
    } finally {
      DOM.confirmDeleteBtn.disabled = false;
      DOM.confirmDeleteBtn.textContent = 'Delete Icon';
    }
  });

  // Edit Tags Button & Form
  DOM.editTagsBtn?.addEventListener('click', () => {
    toggleEditTags();
  });

  DOM.saveTagsBtn?.addEventListener('click', async () => {
    if (!currentIcon) return;

    DOM.saveTagsBtn.disabled = true;
    DOM.saveTagsBtn.textContent = 'SAVING...';
    DOM.editTagsStatus.classList.remove('hidden', 'text-red-600', 'text-green-600');
    DOM.editTagsStatus.style.color = 'var(--fg)';
    DOM.editTagsStatus.textContent = 'Updating tags...';

    const customTags = DOM.editTagsInput.value.trim();
    const newTagsArray = customTags ? customTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    let text = (currentIcon.svg || '').replace(/\sdata-tags="[^"]*"/g, '');
    if (customTags) {
      const safeTags = escapeAttribute(customTags);
      text = text.replace(/<svg\s/, `<svg data-tags="${safeTags}" `);
    }

    // Optimistically update local state immediately
    currentIcon.svg = text;
    currentIcon.tags = newTagsArray;

    const idx = iconsData.findIndex(i => i && (i.id === currentIcon.id || i.name === currentIcon.name));
    if (idx !== -1) {
      iconsData[idx].svg = text;
      iconsData[idx].tags = newTagsArray;
    }

    const localEdits = JSON.parse(localStorage.getItem('localEdits') || '{}');
    localEdits[currentIcon.id] = {
      newId: currentIcon.id,
      newName: currentIcon.name,
      newSvg: text,
      newTags: newTagsArray,
      editTime: Date.now()
    };
    localStorage.setItem('localEdits', JSON.stringify(localEdits));

    renderModalTags();
    renderIcons();

    try {
      const token = Auth.get();
      if (token) {
        let filePath = resolveIconPath(currentIcon);
        let sha = await getFileSha(filePath, token);
        if (!sha && filePath !== `icons/${currentIcon.name}.svg`) {
          filePath = `icons/${currentIcon.name}.svg`;
          sha = await getFileSha(filePath, token);
        }
        if (sha) {
          await pushToGitHub(filePath, text, `Update tags: ${currentIcon.name}`, sha);
        }
      }

      DOM.editTagsStatus.classList.add('text-green-600');
      DOM.editTagsStatus.textContent = 'Success! Tags updated.';

      setTimeout(() => {
        DOM.editTagsForm.classList.add('hidden', 'opacity-0');
      }, 1000);
    } catch (err) {
      console.warn('GitHub update error:', err);
      DOM.editTagsStatus.classList.add('text-green-600');
      DOM.editTagsStatus.textContent = 'Saved locally.';
      setTimeout(() => {
        DOM.editTagsForm.classList.add('hidden', 'opacity-0');
      }, 1000);
    } finally {
      DOM.saveTagsBtn.disabled = false;
      DOM.saveTagsBtn.textContent = 'SAVE';
    }
  });

  // Replace SVG Trigger Button & Input Handler
  DOM.replaceSvgBtn?.addEventListener('click', () => {
    DOM.replaceIconInput?.click();
  });

  DOM.replaceIconInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentIcon) return;

    if (!file.name.toLowerCase().endsWith('.svg')) {
      alert('Please select a valid SVG file.');
      return;
    }

    DOM.replaceStatus.textContent = 'REPLACING...';
    DOM.replaceStatus.classList.remove('hidden', 'text-green-600', 'text-red-600');
    DOM.replaceStatus.style.color = 'var(--fg)';

    try {
      const text = await file.text();
      let finalSvg = minifySVG(text);
      const currentTags = Array.isArray(currentIcon?.tags) ? currentIcon.tags.join(', ') : '';
      if (currentTags) {
        finalSvg = finalSvg.replace(/<svg\s/, `<svg data-tags="${escapeAttribute(currentTags)}" `);
      }

      // Optimistic update
      currentIcon.svg = finalSvg;
      const imgSrc = svgToImgSrc(finalSvg);
      DOM.modalIconPreview.innerHTML = `<img src="${imgSrc}" alt="${escapeAttribute(currentIcon.name)}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;

      document.querySelectorAll('.preset-icon-container').forEach(container => {
        container.innerHTML = `<img src="${imgSrc}" alt="${escapeAttribute(currentIcon.name)}" style="width: 100%; height: 100%; object-fit: contain;" />`;
      });

      const idx = iconsData.findIndex(i => i && (i.id === currentIcon.id || i.name === currentIcon.name));
      if (idx !== -1) {
        iconsData[idx].svg = finalSvg;
      }

      const localEdits = JSON.parse(localStorage.getItem('localEdits') || '{}');
      localEdits[currentIcon.id] = {
        newId: currentIcon.id,
        newName: currentIcon.name,
        newSvg: finalSvg,
        newTags: currentIcon.tags,
        editTime: Date.now()
      };
      localStorage.setItem('localEdits', JSON.stringify(localEdits));

      if (DOM.codeSnippet) {
        DOM.codeSnippet.textContent = minifySVG(finalSvg);
      }

      renderIcons();

      // Push to GitHub
      const token = Auth.get();
      if (token) {
        let filePath = resolveIconPath(currentIcon);
        let sha = await getFileSha(filePath, token);
        if (!sha && filePath !== `icons/${currentIcon.name}.svg`) {
          filePath = `icons/${currentIcon.name}.svg`;
          sha = await getFileSha(filePath, token);
        }
        await pushToGitHub(filePath, finalSvg, `Update icon: ${currentIcon.name}`, sha);
      }

      DOM.replaceStatus.classList.add('text-green-600');
      DOM.replaceStatus.textContent = 'REPLACED!';

      setTimeout(() => {
        DOM.replaceStatus.classList.add('hidden');
        DOM.replaceIconInput.value = '';
      }, 2000);
    } catch (err) {
      DOM.replaceStatus.classList.add('text-red-600');
      DOM.replaceStatus.textContent = err.message;
    }
  });

  // Multiselect bulk delete
  DOM.multiselectDeleteBtn?.addEventListener('click', async () => {
    if (selectedIcons.size === 0) return;

    if (!confirm(`Are you sure you want to permanently delete ${selectedIcons.size} icons?`)) {
      return;
    }

    const originalText = DOM.multiselectDeleteBtn.textContent;
    DOM.multiselectDeleteBtn.disabled = true;
    DOM.multiselectDeleteBtn.textContent = 'DELETING...';

    try {
      const token = Auth.get();
      if (!token) throw new Error('Not authenticated.');

      const deletedSet = new Set(JSON.parse(localStorage.getItem('deletedIcons') || '[]'));
      for (const id of selectedIcons) {
        const icon = iconsData.find(i => i && (i.id === id || i.name === id));
        if (!icon) continue;

        let filePath = resolveIconPath(icon);
        let sha = await getFileSha(filePath, token);
        if (!sha && filePath !== `icons/${icon.name}.svg`) {
          filePath = `icons/${icon.name}.svg`;
          sha = await getFileSha(filePath, token);
        }
        if (sha) {
          await pushToGitHub(filePath, null, `Delete icon: ${icon.name}`, sha);
        }
        deletedSet.add(id);
        iconsData = iconsData.filter(i => i && i.id !== id && i.name !== icon.name);
      }
      localStorage.setItem('deletedIcons', JSON.stringify([...deletedSet]));

      renderIcons();

      DOM.multiselectDeleteBtn.textContent = 'SUCCESS!';
      setTimeout(() => {
        DOM.multiselectDeleteBtn.disabled = false;
        DOM.multiselectDeleteBtn.textContent = originalText;
        selectedIcons.clear();
        updateMultiselectUI();
      }, 1500);
    } catch (err) {
      alert('Error deleting icons: ' + err.message);
      DOM.multiselectDeleteBtn.disabled = false;
      DOM.multiselectDeleteBtn.textContent = originalText;
    }
  });

  // File Upload Handlers
  DOM.uploadFile?.addEventListener('change', async () => {
    const files = DOM.uploadFile.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.svg')) continue;

      try {
        const text = await file.text();
        const minifiedSvg = minifySVG(text);
        const baseName = file.name.replace('.svg', '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
        let defaultName = baseName;
        let counter = 1;

        const isNameTaken = (n) => {
          return iconsData.some(icon => icon && icon.name === n) || selectedUploadFiles.some(item => item.name === n);
        };

        while (isNameTaken(defaultName)) {
          defaultName = `${baseName}-${counter}`;
          counter++;
        }

        selectedUploadFiles.push({
          file,
          svgContent: minifiedSvg,
          name: defaultName,
          tags: ''
        });
      } catch (err) {
        console.error('Failed to read file:', file.name, err);
      }
    }

    DOM.uploadFile.value = '';
    renderUploadItems();
  });

  DOM.submitUploadBtn?.addEventListener('click', async () => {
    if (selectedUploadFiles.length === 0) return;

    DOM.submitUploadBtn.disabled = true;
    DOM.uploadStatus.classList.remove('hidden', 'text-red-600', 'text-green-600');
    DOM.uploadStatus.style.color = 'var(--fg)';

    const token = Auth.get();
    let successCount = 0;
    const usedNames = new Set(iconsData.map(icon => icon?.name).filter(Boolean));

    try {
      const optimisticallyAddedIcons = [];
      for (let i = 0; i < selectedUploadFiles.length; i++) {
        const item = selectedUploadFiles[i];
        let baseName = item.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        if (!baseName) baseName = `untitled-icon-${Date.now()}`;

        let finalName = baseName;
        let counter = 1;
        while (usedNames.has(finalName)) {
          finalName = `${baseName}-${counter}`;
          counter++;
        }
        usedNames.add(finalName);

        if (!finalName.endsWith('.svg')) finalName += '.svg';

        DOM.uploadStatus.textContent = `Uploading ${i + 1} of ${selectedUploadFiles.length}: ${finalName}...`;

        let text = item.svgContent;
        if (item.tags.trim()) {
          const safeTags = escapeAttribute(item.tags.trim());
          text = text.replace(/<svg\s/, `<svg data-tags="${safeTags}" `);
        }

        const filePath = `icons/${finalName}`;
        const existingSha = await getFileSha(filePath, token).catch(() => null);
        await pushToGitHub(filePath, text, `Add icon: ${finalName}`, existingSha);

        if (i < selectedUploadFiles.length - 1) {
          await new Promise(r => setTimeout(r, 400));
        }

        successCount++;
        const iconId = finalName.replace('.svg', '');
        optimisticallyAddedIcons.push({
          id: iconId,
          name: iconId,
          category: 'general',
          svg: text,
          tags: item.tags.trim() ? item.tags.trim().split(',').map(t => t.trim()).filter(Boolean) : [],
          isNew: true,
          lastModified: Date.now()
        });
      }

      DOM.uploadStatus.classList.add('text-green-600');
      DOM.uploadStatus.textContent = `Successfully uploaded ${successCount} icon${successCount > 1 ? 's' : ''}!`;

      const pendingCache = JSON.parse(localStorage.getItem('pendingIcons') || '[]');
      optimisticallyAddedIcons.forEach(newIcon => {
        iconsData.unshift(newIcon);
        pendingCache.push(newIcon);
      });
      localStorage.setItem('pendingIcons', JSON.stringify(pendingCache));

      renderIcons();
      selectedUploadFiles = [];
      renderUploadItems();
      setTimeout(closeModals, 2000);
    } catch (err) {
      DOM.uploadStatus.classList.add('text-red-600');
      DOM.uploadStatus.textContent = `Error on file ${successCount + 1}: ${err.message}`;
    } finally {
      DOM.submitUploadBtn.disabled = false;
    }
  });

  // Rename Handlers
  if (DOM.renameIconBtn) {
    DOM.renameIconBtn.addEventListener('click', () => {
      DOM.modalIconTitle.classList.add('hidden');
      DOM.renameIconBtn.classList.add('hidden');
      DOM.renameIconInput.classList.remove('hidden');
      DOM.renameIconInput.value = currentIcon?.name || '';
      DOM.saveRenameBtn.classList.remove('hidden');
      DOM.cancelRenameBtn.classList.remove('hidden');
      DOM.renameIconInput.focus();
    });

    DOM.cancelRenameBtn.addEventListener('click', () => {
      DOM.modalIconTitle.classList.remove('hidden');
      DOM.renameIconBtn.classList.remove('hidden');
      DOM.renameIconInput.classList.add('hidden');
      DOM.saveRenameBtn.classList.add('hidden');
      DOM.cancelRenameBtn.classList.add('hidden');
      DOM.renameStatus.classList.add('hidden');
    });

    DOM.saveRenameBtn.addEventListener('click', async () => {
      const newName = DOM.renameIconInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (!newName || newName === currentIcon?.name) {
        DOM.cancelRenameBtn.click();
        return;
      }

      const isTaken = iconsData.some(icon => icon && icon.name === newName);
      if (isTaken) {
        alert('An icon with this name already exists.');
        return;
      }

      DOM.saveRenameBtn.disabled = true;
      DOM.renameStatus.textContent = 'Renaming...';
      DOM.renameStatus.classList.remove('hidden', 'text-green-600', 'text-red-600');
      DOM.renameStatus.style.color = 'var(--fg)';

      try {
        const token = Auth.get();
        const oldPath = resolveIconPath(currentIcon);
        const newPath = `icons/${newName}.svg`;

        await pushToGitHub(newPath, currentIcon.svg, `Rename icon to ${newName}`, null);

        const oldSha = await getFileSha(oldPath, token);
        if (oldSha) {
          await pushToGitHub(oldPath, null, `Delete old icon ${currentIcon.name}`, oldSha);
        }

        const originalId = currentIcon.id;
        currentIcon.name = newName;
        currentIcon.id = newName;
        currentIcon.category = 'general';
        DOM.modalIconTitle.textContent = newName;

        const idx = iconsData.findIndex(i => i && (i.id === originalId || i.name === originalId));
        if (idx !== -1) {
          iconsData[idx].name = newName;
          iconsData[idx].id = newName;
          iconsData[idx].category = 'general';
        }

        const localEdits = JSON.parse(localStorage.getItem('localEdits') || '{}');
        localEdits[originalId] = {
          newId: newName,
          newName,
          newSvg: currentIcon.svg,
          newTags: currentIcon.tags,
          editTime: Date.now()
        };
        localStorage.setItem('localEdits', JSON.stringify(localEdits));

        DOM.renameStatus.classList.add('text-green-600');
        DOM.renameStatus.textContent = 'Saved!';

        setTimeout(() => {
          DOM.cancelRenameBtn.click();
          renderIcons();
        }, 1000);
      } catch (err) {
        DOM.renameStatus.classList.add('text-red-600');
        DOM.renameStatus.textContent = err.message;
      } finally {
        DOM.saveRenameBtn.disabled = false;
      }
    });
  }

  // Dynamic Scroll Shadow for Sticky Search Bar
  window.addEventListener('scroll', () => {
    const stickyHeader = document.getElementById('stickySearchHeader');
    if (stickyHeader) {
      if (window.scrollY > 5) {
        stickyHeader.classList.add('shadow-[0_10px_20px_-10px_rgba(0,0,0,0.15)]');
      } else {
        stickyHeader.classList.remove('shadow-[0_10px_20px_-10px_rgba(0,0,0,0.15)]');
      }
    }
  });
}

// ── Authentication Initialization ────────────────────────────────────────────
async function checkAuth() {
  Theme.init();
  if (Auth.isAuthenticated()) {
    DOM.loginScreen?.classList.add('hidden');
    DOM.appContent?.classList.remove('hidden');
    init();
  } else {
    DOM.loginScreen?.classList.remove('hidden');
    DOM.appContent?.classList.add('hidden');
  }
}

DOM.loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  DOM.loginBtn.disabled = true;
  DOM.loginBtn.textContent = 'Verifying...';
  DOM.loginError.classList.add('hidden');

  try {
    const token = await decryptToken(DOM.sitePassword.value);
    Auth.set(token);
    checkAuth();
  } catch {
    DOM.loginError.textContent = 'Invalid password. Access denied.';
    DOM.loginError.classList.remove('hidden');
  } finally {
    DOM.loginBtn.disabled = false;
    DOM.loginBtn.textContent = 'Continue';
  }
});

// Boot authentication check
checkAuth();
