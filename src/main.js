/**
 * Main Application Bootstrap
 * Coordinates state in RAM, routing presets, custom dimensions, cropper, and AdSense.
 */

import './style.css';
import { initRouter, navigateTo } from './modules/router.js';
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
import { CONFIG } from './config.js';

// Central state tracking in Volatile RAM
const state = {
  originalFile: null,   // Sanitized user file
  croppedFile: null,    // Crop result file if cropped
  originalMetadata: {
    width: 0,
    height: 0
  },
  compressedBlob: null,
  targetMaxKB: 50,
  outputFormat: 'image/jpeg',
  targetWidth: null,    // Custom width override
  targetHeight: null,   // Custom height override
  aspectRatioLocked: true,
  isProcessing: false,
  activePreset: 'custom' // 'ssc' | 'upsc' | 'custom'
};

// Cached elements reference local to main
let pageElements = {};

/**
 * Custom cache DOM elements specific to main.js settings inputs
 */
function cacheLocalElements() {
  pageElements = {
    customWidth: document.getElementById('custom-width'),
    customHeight: document.getElementById('custom-height'),
    aspectLock: document.getElementById('aspect-lock'),
    cropTriggerBtn: document.getElementById('crop-trigger-btn'),
    fileInput: document.getElementById('file-input'),
    browseBtn: document.getElementById('browse-btn'),
    dropZone: document.getElementById('drop-zone'),
    targetKbSlider: document.getElementById('target-kb-slider'),
    targetKbInput: document.getElementById('target-kb-input'),
    formatSelect: document.getElementById('format-select'),
    presetSsc: document.getElementById('preset-ssc'),
    presetUpsc: document.getElementById('preset-upsc'),
    presetCustom: document.getElementById('preset-custom'),
    downloadBtn: document.getElementById('download-btn'),
    resetBtn: document.getElementById('reset-btn'),
    linkNeet: document.getElementById('link-neet'),
    linkGate: document.getElementById('link-gate'),
    linkSbi: document.getElementById('link-sbi')
  };
}

/**
 * Triggers client-side canvas quality and size scaling solver.
 */
async function triggerCompression() {
  // Use cropped file if available, otherwise original
  const activeFile = state.croppedFile || state.originalFile;
  if (!activeFile) return;
  if (state.isProcessing) return;

  state.isProcessing = true;
  toggleLoading(true, "Executing local iterative compression...");

  try {
    const result = await processClientImage(
      activeFile, 
      state.targetMaxKB, 
      state.outputFormat,
      state.targetWidth,
      state.targetHeight
    );
    
    state.compressedBlob = result.blob;

    // Render telemetry calculations
    renderImageTelemetry(
      {
        name: activeFile.name,
        size: activeFile.size,
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
    
    // Clear previous crop states
    state.croppedFile = null;

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

    // Auto-fill custom dimensions inputs if presets don't specify them
    updateDimensionInputsUI();

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
 * Updates the Width and Height input elements in the UI
 */
function updateDimensionInputsUI() {
  if (!pageElements.customWidth || !pageElements.customHeight) return;

  if (state.targetWidth) {
    pageElements.customWidth.value = state.targetWidth;
  } else {
    pageElements.customWidth.value = '';
    pageElements.customWidth.placeholder = state.originalFile ? state.originalMetadata.width : 'Original';
  }

  if (state.targetHeight) {
    pageElements.customHeight.value = state.targetHeight;
  } else {
    pageElements.customHeight.value = '';
    pageElements.customHeight.placeholder = state.originalFile ? state.originalMetadata.height : 'Original';
  }
}

/**
 * Initialize all event listeners
 */
function bindEventListeners() {
  // Trigger file picker click
  if (pageElements.browseBtn && pageElements.fileInput) {
    pageElements.browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pageElements.fileInput.click();
    });
  }

  // Click on dropzone itself triggers picker
  if (pageElements.dropZone && pageElements.fileInput) {
    pageElements.dropZone.addEventListener('click', () => {
      pageElements.fileInput.click();
    });
  }

  // Picker selection changed
  if (pageElements.fileInput) {
    pageElements.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        loadFileIntoWorkspace(e.target.files[0]);
      }
    });
  }

  // Drag and drop events
  if (pageElements.dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      pageElements.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropZoneHighlight(true);
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      pageElements.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropZoneHighlight(false);
      }, false);
    });

    pageElements.dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        loadFileIntoWorkspace(dt.files[0]);
      }
    }, false);
  }

  // Configurations bindings: Slider and Number Input Sync
  if (pageElements.targetKbSlider && pageElements.targetKbInput) {
    pageElements.targetKbSlider.addEventListener('input', (e) => {
      state.targetMaxKB = parseInt(e.target.value, 10);
      updateTargetKbUI(state.targetMaxKB);
      state.activePreset = 'custom';
      updatePresetButtons(state.activePreset);
      triggerCompression();
    });

    pageElements.targetKbInput.addEventListener('change', (e) => {
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
  if (pageElements.formatSelect) {
    pageElements.formatSelect.addEventListener('change', (e) => {
      state.outputFormat = e.target.value;
      triggerCompression();
    });
  }

  // Crop Trigger Modal
  if (pageElements.cropTriggerBtn) {
    pageElements.cropTriggerBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const activeFile = state.originalFile;
      if (!activeFile) return;

      try {
        toggleLoading(true, "Loading crop interface...");
        
        // Lazy load cropping module
        const { openCropModal } = await import('./modules/cropper.js');
        toggleLoading(false);

        // Determine default aspect ratio based on presets
        let defaultAspect = NaN;
        const path = window.location.pathname;
        if (path.includes('ssc') || path.includes('sbi') || path.includes('gate')) {
          defaultAspect = 350 / 450;
        } else if (path.includes('upsc') || path.includes('neet')) {
          defaultAspect = 350 / 110;
        } else if (state.targetWidth && state.targetHeight) {
          defaultAspect = state.targetWidth / state.targetHeight;
        }

        // Open Modal
        openCropModal(activeFile, async (croppedFile) => {
          state.croppedFile = croppedFile;
          
          toggleLoading(true, "Analyzing cropped structure...");
          const img = await loadImage(croppedFile);
          
          // Sync cropped base dimensions
          state.originalMetadata = {
            width: img.naturalWidth,
            height: img.naturalHeight
          };
          
          // Re-sync dimension configurations
          if (state.targetWidth || state.targetHeight) {
            const ratio = img.naturalWidth / img.naturalHeight;
            if (state.aspectRatioLocked) {
              if (state.targetWidth) {
                state.targetHeight = Math.round(state.targetWidth / ratio);
              } else if (state.targetHeight) {
                state.targetWidth = Math.round(state.targetHeight * ratio);
              }
              updateDimensionInputsUI();
            }
          }
          
          toggleLoading(false);
          triggerCompression();
        }, defaultAspect);

      } catch (err) {
        toggleLoading(false);
        console.error("Crop loader error:", err);
        alert("Failed to initialize cropping module.");
      }
    });
  }

  // Aspect Ratio lock checkbox
  if (pageElements.aspectLock) {
    pageElements.aspectLock.addEventListener('change', (e) => {
      state.aspectRatioLocked = e.target.checked;
    });
  }

  // Width dimension input override
  if (pageElements.customWidth) {
    pageElements.customWidth.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val <= 0) {
        state.targetWidth = null;
      } else {
        state.targetWidth = val;
        
        // If aspect locked and we have image loaded, sync Height input
        if (state.aspectRatioLocked && (state.originalFile || state.croppedFile)) {
          const ratio = state.originalMetadata.width / state.originalMetadata.height;
          state.targetHeight = Math.round(val / ratio);
          if (pageElements.customHeight) {
            pageElements.customHeight.value = state.targetHeight;
          }
        }
      }
      triggerCompression();
    });
  }

  // Height dimension input override
  if (pageElements.customHeight) {
    pageElements.customHeight.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val <= 0) {
        state.targetHeight = null;
      } else {
        state.targetHeight = val;
        
        // If aspect locked and we have image loaded, sync Width input
        if (state.aspectRatioLocked && (state.originalFile || state.croppedFile)) {
          const ratio = state.originalMetadata.width / state.originalMetadata.height;
          state.targetWidth = Math.round(val * ratio);
          if (pageElements.customWidth) {
            pageElements.customWidth.value = state.targetWidth;
          }
        }
      }
      triggerCompression();
    });
  }

  // Preset Controls
  if (pageElements.presetSsc) {
    pageElements.presetSsc.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateTo('/compress-photo-to-exactly-50kb-ssc', syncRouteWithState);
    });
  }

  if (pageElements.presetUpsc) {
    pageElements.presetUpsc.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateTo('/resize-signature-under-20kb-upsc', syncRouteWithState);
    });
  }

  if (pageElements.presetCustom) {
    pageElements.presetCustom.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateTo('/', syncRouteWithState);
    });
  }

  // Reset/Clear file
  if (pageElements.resetBtn) {
    pageElements.resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.originalFile = null;
      state.croppedFile = null;
      state.targetWidth = null;
      state.targetHeight = null;
      if (pageElements.fileInput) pageElements.fileInput.value = '';
      updateDimensionInputsUI();
      toggleWorkspaceView(false);
    });
  }

  // File Download Trigger
  if (pageElements.downloadBtn) {
    pageElements.downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.compressedBlob || !state.originalFile) return;

      const activeFile = state.croppedFile || state.originalFile;
      const extension = state.outputFormat === 'image/png' ? 'png' : 'jpg';
      const cleanOriginalName = activeFile.name.substring(0, activeFile.name.lastIndexOf('.')) || activeFile.name;
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

  // Intercept nav links and footer links clicks to keep Single Page application state
  const navAndFooterLinks = ['link-root', 'link-ssc', 'link-upsc', 'link-neet', 'link-gate', 'link-sbi'];
  navAndFooterLinks.forEach(id => {
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
 * Configure AdSense IDs at runtime based on CONFIG
 */
function setupAdSensePublisher() {
  const client = CONFIG.adsenseClientId;
  // Bypasses placeholder or unconfigured publisher IDs
  if (!client || client === 'ca-pub-placeholder' || client.includes('1234567890')) return;

  // 1. Inject the Google AdSense Script Tag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);

  // 2. Configure and Push Ad Slots
  const adElements = document.querySelectorAll('ins.adsbygoogle');
  adElements.forEach(ins => {
    ins.setAttribute('data-ad-client', client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.warn("AdSense push initialization error:", error);
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
  
  // Set dimensions overrides if defined in routing presets
  state.targetWidth = routeConfig.targetWidth || null;
  state.targetHeight = routeConfig.targetHeight || null;

  // Sync inputs & selections UI
  updateTargetKbUI(state.targetMaxKB);
  updateDimensionInputsUI();
  
  if (pageElements.formatSelect) pageElements.formatSelect.value = state.outputFormat;

  // Sync preset highlighting
  const currentPath = window.location.pathname;
  if (currentPath === '/compress-photo-to-exactly-50kb-ssc' || 
      currentPath === '/compress-photo-under-20kb-gate-exam' || 
      currentPath === '/sbi-clerk-photo-resizer-under-50kb') {
    state.activePreset = 'ssc';
  } else if (currentPath === '/resize-signature-under-20kb-upsc' || 
             currentPath === '/resize-signature-under-10kb-neet') {
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
  cacheLocalElements();
  bindEventListeners();
  setupAdSensePublisher();
  
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
