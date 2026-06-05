/**
 * Main Application Bootstrap
 * Binds UI listeners, implements client-side state machine, and registers Service Worker.
 */

import './style.css';
import { initRouter, navigateTo, ROUTE_PRESETS } from './modules/router.js';
import { 
  cacheDOMElements, 
  updateTargetKbUI, 
  toggleDropZoneHighlight, 
  toggleLoading, 
  toggleWorkspaceView, 
  renderImageTelemetry, 
  drawPreview, 
  updatePresetButtons,
  updateSEOHeader
} from './modules/ui.js';
import { processIncomingFile } from './modules/fileHandler.js';
import { processClientImage, loadImage } from './modules/compressor.js';

// Central state tracking in Volatile RAM
const state = {
  originalFile: null,
  originalMetadata: {
    width: 0,
    height: 0
  },
  compressedBlob: null,
  targetMaxKB: 50,
  outputFormat: 'image/jpeg',
  isProcessing: false,
  activePreset: 'custom' // 'ssc' | 'upsc' | 'custom'
};

/**
 * Triggers client-side canvas quality and size scaling solver.
 */
async function triggerCompression() {
  if (!state.originalFile) return;
  if (state.isProcessing) return;

  state.isProcessing = true;
  toggleLoading(true, "Executing local iterative compression...");

  try {
    const result = await processClientImage(state.originalFile, state.targetMaxKB, state.outputFormat);
    state.compressedBlob = result.blob;

    // Render telemetry calculations
    renderImageTelemetry(
      {
        name: state.originalFile.name,
        size: state.originalFile.size,
        width: state.originalMetadata.width,
        height: state.originalMetadata.height
      },
      {
        bytes: result.finalBytes,
        width: result.width,
        height: result.height,
        quality: result.finalQuality
      }
    );

    // Draw preview inside screen canvas
    await drawPreview(result.blob);
    toggleWorkspaceView(true);

  } catch (error) {
    console.error("Compression loop error:", error);
    alert(error.message || "An unexpected processing error occurred.");
  } finally {
    state.isProcessing = false;
    toggleLoading(false);
  }
}

/**
 * Validates and loads incoming file into current state.
 * @param {File} file 
 */
async function loadFileIntoWorkspace(file) {
  try {
    toggleLoading(true, "Sanitizing file structures...");
    
    // Process formats, converts HEIC to standard JPG
    const sanitizedFile = await processIncomingFile(file, (msg) => {
      toggleLoading(true, msg);
    });

    // Ingest image element metadata in RAM
    const img = await loadImage(sanitizedFile);
    
    state.originalFile = sanitizedFile;
    state.originalMetadata = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };

    toggleLoading(false);
    
    // Trigger compression immediately
    await triggerCompression();

  } catch (error) {
    toggleLoading(false);
    console.error("File loading error:", error);
    alert(error.message || "Failed to parse uploaded image file.");
  }
}

/**
 * Initialize event listeners
 */
function bindEventListeners() {
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');
  const dropZone = document.getElementById('drop-zone');
  
  const targetKbSlider = document.getElementById('target-kb-slider');
  const targetKbInput = document.getElementById('target-kb-input');
  const formatSelect = document.getElementById('format-select');
  
  const presetSsc = document.getElementById('preset-ssc');
  const presetUpsc = document.getElementById('preset-upsc');
  const presetCustom = document.getElementById('preset-custom');
  
  const downloadBtn = document.getElementById('download-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Trigger file picker click
  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Click on dropzone itself triggers picker
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // Picker selection changed
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        loadFileIntoWorkspace(e.target.files[0]);
      }
    });
  }

  // Drag and drop events
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropZoneHighlight(true);
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropZoneHighlight(false);
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        loadFileIntoWorkspace(dt.files[0]);
      }
    }, false);
  }

  // Configurations bindings: Slider and Number Input Sync
  if (targetKbSlider && targetKbInput) {
    targetKbSlider.addEventListener('input', (e) => {
      state.targetMaxKB = parseInt(e.target.value, 10);
      updateTargetKbUI(state.targetMaxKB);
      state.activePreset = 'custom';
      updatePresetButtons(state.activePreset);
      triggerCompression();
    });

    targetKbInput.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = 50;
      val = Math.max(5, Math.min(2000, val)); // Clamp values
      state.targetMaxKB = val;
      updateTargetKbUI(state.targetMaxKB);
      state.activePreset = 'custom';
      updatePresetButtons(state.activePreset);
      triggerCompression();
    });
  }

  // Format selection changes
  if (formatSelect) {
    formatSelect.addEventListener('change', (e) => {
      state.outputFormat = e.target.value;
      triggerCompression();
    });
  }

  // Preset Controls
  if (presetSsc) {
    presetSsc.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateTo('/compress-photo-to-exactly-50kb-ssc', syncRouteWithState);
    });
  }

  if (presetUpsc) {
    presetUpsc.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateTo('/resize-signature-under-20kb-upsc', syncRouteWithState);
    });
  }

  if (presetCustom) {
    presetCustom.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateTo('/', syncRouteWithState);
    });
  }

  // Reset/Clear file
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.originalFile = null;
      state.compressedBlob = null;
      if (fileInput) fileInput.value = '';
      toggleWorkspaceView(false);
    });
  }

  // File Download Trigger
  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.compressedBlob || !state.originalFile) return;

      const extension = state.outputFormat === 'image/png' ? 'png' : 'jpg';
      const cleanOriginalName = state.originalFile.name.substring(0, state.originalFile.name.lastIndexOf('.')) || state.originalFile.name;
      const downloadName = `${cleanOriginalName}_compressed_${state.targetMaxKB}kb.${extension}`;

      const link = document.createElement('a');
      const url = URL.createObjectURL(state.compressedBlob);
      
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  // Intercept nav links clicks to keep Single Page application state
  const links = ['link-root', 'link-ssc', 'link-upsc'];
  links.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const href = el.getAttribute('href');
        navigateTo(href, syncRouteWithState);
      });
    }
  });
}

/**
 * Synchronizes Routing events with the central application state
 * @param {Object} routeConfig 
 */
function syncRouteWithState(routeConfig) {
  state.targetMaxKB = routeConfig.targetMaxKB;
  state.outputFormat = routeConfig.outputType;

  // Sync inputs & selections UI
  updateTargetKbUI(state.targetMaxKB);
  const formatSelect = document.getElementById('format-select');
  if (formatSelect) formatSelect.value = state.outputFormat;

  // Sync preset highlighting
  const currentPath = window.location.pathname;
  if (currentPath === '/compress-photo-to-exactly-50kb-ssc') {
    state.activePreset = 'ssc';
  } else if (currentPath === '/resize-signature-under-20kb-upsc') {
    state.activePreset = 'upsc';
  } else {
    state.activePreset = 'custom';
  }
  updatePresetButtons(state.activePreset);

  // Sync document meta
  updateSEOHeader(routeConfig.h1, routeConfig.badge);

  // If a file is loaded, execute compression loop immediately with new targets
  if (state.originalFile) {
    triggerCompression();
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  bindEventListeners();
  
  // Initialize Routing & Presets
  initRouter(syncRouteWithState);

  // Register local caching service worker for 100% offline access
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW Registered with scope: ', registration.scope);
        })
        .catch(err => {
          console.error('Service Worker registration failed: ', err);
        });
    });
  }
});
