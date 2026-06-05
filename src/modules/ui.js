/**
 * UI Controller Module
 * Handles all UI event listeners, styling updates, slider synchronization, and DOM updates.
 */

import { formatBytes } from './fileHandler.js';

// DOM Element cache
let elements = {};

/**
 * Initializes elements from the DOM.
 */
export function cacheDOMElements() {
  elements = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    browseBtn: document.getElementById('browse-btn'),
    presetSsc: document.getElementById('preset-ssc'),
    presetUpsc: document.getElementById('preset-upsc'),
    presetCustom: document.getElementById('preset-custom'),
    targetKbSlider: document.getElementById('target-kb-slider'),
    targetKbInput: document.getElementById('target-kb-input'),
    formatSelect: document.getElementById('format-select'),
    
    // Panels
    workspaceLanding: document.getElementById('workspace-landing'),
    workspacePreview: document.getElementById('workspace-preview'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingStatusText: document.getElementById('loading-status-text'),
    
    // Telemetry displays
    origName: document.getElementById('orig-name'),
    origSize: document.getElementById('orig-size'),
    origDims: document.getElementById('orig-dims'),
    
    compSize: document.getElementById('comp-size'),
    compDims: document.getElementById('comp-dims'),
    compQuality: document.getElementById('comp-quality'),
    compRatio: document.getElementById('comp-ratio'),
    
    // Preview
    previewCanvas: document.getElementById('preview-canvas'),
    downloadBtn: document.getElementById('download-btn'),
    resetBtn: document.getElementById('reset-btn'),
    
    // SEO Dynamic Header
    mainH1: document.getElementById('main-h1'),
    presetBadge: document.getElementById('preset-badge')
  };
}

/**
 * Syncs the target size range slider and numeric input.
 * @param {number} value 
 */
export function updateTargetKbUI(value) {
  if (elements.targetKbSlider) elements.targetKbSlider.value = value;
  if (elements.targetKbInput) elements.targetKbInput.value = value;
}

/**
 * Highlights/unhighlights drop-zone boundary on drag activities.
 * @param {boolean} active 
 */
export function toggleDropZoneHighlight(active) {
  if (!elements.dropZone) return;
  if (active) {
    elements.dropZone.classList.add('border-cyan-primary', 'bg-slate-800/40');
  } else {
    elements.dropZone.classList.remove('border-cyan-primary', 'bg-slate-800/40');
  }
}

/**
 * Renders loading progress overlay.
 * @param {boolean} show 
 * @param {string} statusText 
 */
export function toggleLoading(show, statusText = "Processing...") {
  if (!elements.loadingOverlay) return;
  if (show) {
    elements.loadingStatusText.textContent = statusText;
    elements.loadingOverlay.classList.remove('hidden');
    elements.loadingOverlay.classList.add('flex');
  } else {
    elements.loadingOverlay.classList.add('hidden');
    elements.loadingOverlay.classList.remove('flex');
  }
}

/**
 * Configures UI panels based on image state
 * @param {boolean} hasFile 
 */
export function toggleWorkspaceView(hasFile) {
  if (hasFile) {
    elements.workspaceLanding.classList.add('hidden');
    elements.workspacePreview.classList.remove('hidden');
  } else {
    elements.workspaceLanding.classList.remove('hidden');
    elements.workspacePreview.classList.add('hidden');
    // Clear canvas
    const ctx = elements.previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
  }
}

/**
 * Renders the compressed image details inside telemetry card
 */
export function renderImageTelemetry(original, compressed) {
  // Original
  elements.origName.textContent = original.name;
  elements.origSize.textContent = formatBytes(original.size);
  elements.origDims.textContent = `${original.width} × ${original.height} px`;

  // Compressed
  elements.compSize.textContent = formatBytes(compressed.bytes);
  elements.compDims.textContent = `${compressed.width} × ${compressed.height} px`;
  elements.compQuality.textContent = `${Math.round(compressed.quality * 100)}%`;
  
  const savings = Math.max(0, ((original.size - compressed.bytes) / original.size) * 100);
  elements.compRatio.textContent = `-${savings.toFixed(1)}%`;
}

/**
 * Draws image onto preview canvas element
 * @param {Blob} compressedBlob 
 */
export async function drawPreview(compressedBlob) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(compressedBlob);
    
    img.onload = () => {
      elements.previewCanvas.width = img.naturalWidth;
      elements.previewCanvas.height = img.naturalHeight;
      const ctx = elements.previewCanvas.getContext('2d');
      ctx.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      resolve();
    };
    
    img.src = objectUrl;
  });
}

/**
 * Sync active class state for preset quick actions
 * @param {string} activePreset - 'ssc', 'upsc', or 'custom'
 */
export function updatePresetButtons(activePreset) {
  const activeClass = ['border-cyan-primary/50', 'bg-cyan-500/10', 'text-cyan-primary'];
  const inactiveClass = ['border-white/5', 'bg-white/2', 'text-slate-400', 'hover:border-white/10'];

  const buttons = {
    ssc: elements.presetSsc,
    upsc: elements.presetUpsc,
    custom: elements.presetCustom
  };

  Object.entries(buttons).forEach(([key, btn]) => {
    if (!btn) return;
    if (key === activePreset) {
      btn.classList.add(...activeClass);
      btn.classList.remove(...inactiveClass);
    } else {
      btn.classList.remove(...activeClass);
      btn.classList.add(...inactiveClass);
    }
  });
}

/**
 * Modifies the main page H1 title element programmatically for SEO mapping
 * @param {string} title 
 * @param {string} badgeText 
 */
export function updateSEOHeader(title, badgeText) {
  if (elements.mainH1) elements.mainH1.textContent = title;
  if (elements.presetBadge) {
    elements.presetBadge.textContent = badgeText;
    if (badgeText === 'Standard') {
      elements.presetBadge.classList.add('bg-cyan-500/10', 'text-cyan-primary');
      elements.presetBadge.classList.remove('bg-emerald-500/10', 'text-success-green');
    } else {
      elements.presetBadge.classList.add('bg-emerald-500/10', 'text-success-green');
      elements.presetBadge.classList.remove('bg-cyan-500/10', 'text-cyan-primary');
    }
  }
}
