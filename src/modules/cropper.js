/**
 * Client-Side Cropper Manager
 * Lazy-loads cropperjs and stylesheet. Coordinates cropping modal and aspect ratio locks in RAM.
 */

let cssLoaded = false;
let cropperInstance = null;
let currentObjectUrl = null;

/**
 * Dynamically appends cropper.css to the head if not already present.
 */
function injectStylesheet() {
  if (cssLoaded) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/cropper.css';
  document.head.appendChild(link);
  cssLoaded = true;
}

/**
 * Opens the crop modal, initializes CropperJS, and binds control actions.
 * @param {File} imageFile - The source image file object.
 * @param {Function} onCropSuccess - Callback when crop is applied, receives a new File object.
 * @param {number} defaultAspectRatio - Default aspect ratio lock (e.g. 350/450 or NaN).
 */
export async function openCropModal(imageFile, onCropSuccess, defaultAspectRatio = NaN) {
  injectStylesheet();

  // Lazy-load cropperjs
  const CropperModule = await import('cropperjs');
  const Cropper = CropperModule.default;

  // DOM crop elements
  const modal = document.getElementById('crop-modal');
  const cropImage = document.getElementById('crop-modal-image');
  const cancelBtn = document.getElementById('crop-cancel-btn');
  const applyBtn = document.getElementById('crop-apply-btn');
  
  // Aspect buttons
  const aspectFree = document.getElementById('aspect-free');
  const aspect1to1 = document.getElementById('aspect-1-1');
  const aspectPhoto = document.getElementById('aspect-photo');
  const aspectSig = document.getElementById('aspect-sig');

  if (!modal || !cropImage) {
    throw new Error("Crop modal DOM elements are missing.");
  }

  // Clear previous session URL
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  // Load image src
  currentObjectUrl = URL.createObjectURL(imageFile);
  cropImage.src = currentObjectUrl;

  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Initialize Cropper Instance
  cropperInstance = new Cropper(cropImage, {
    aspectRatio: defaultAspectRatio,
    viewMode: 1,
    autoCropArea: 0.9,
    responsive: true,
    background: false,
    zoomable: true,
    movable: true,
    rotatable: true,
    scalable: true
  });

  // Aspect Ratio selectors
  const aspectButtons = [
    { btn: aspectFree, ratio: NaN },
    { btn: aspect1to1, ratio: 1 },
    { btn: aspectPhoto, ratio: 350 / 450 }, // SSC/SBI Photo
    { btn: aspectSig, ratio: 350 / 110 }   // UPSC/NEET Signature
  ];

  const updateActiveAspectButton = (activeBtn) => {
    const activeClasses = ['border-cyan-primary', 'bg-cyan-500/10', 'text-cyan-primary'];
    const inactiveClasses = ['border-white/5', 'bg-white/2', 'text-slate-400'];
    
    aspectButtons.forEach(({ btn }) => {
      if (!btn) return;
      if (btn === activeBtn) {
        btn.classList.add(...activeClasses);
        btn.classList.remove(...inactiveClasses);
      } else {
        btn.classList.remove(...activeClasses);
        btn.classList.add(...inactiveClasses);
      }
    });
  };

  // Find initial active button
  let initialBtn = aspectFree;
  if (defaultAspectRatio === 1) initialBtn = aspect1to1;
  else if (defaultAspectRatio === 350 / 450) initialBtn = aspectPhoto;
  else if (defaultAspectRatio === 350 / 110) initialBtn = aspectSig;
  updateActiveAspectButton(initialBtn);

  aspectButtons.forEach(({ btn, ratio }) => {
    if (!btn) return;
    btn.onclick = (e) => {
      e.preventDefault();
      cropperInstance.setAspectRatio(ratio);
      updateActiveAspectButton(btn);
    };
  });

  // Rotation controls
  const rotateLeft = document.getElementById('crop-rotate-left');
  const rotateRight = document.getElementById('crop-rotate-right');
  if (rotateLeft) {
    rotateLeft.onclick = (e) => {
      e.preventDefault();
      cropperInstance.rotate(-90);
    };
  }
  if (rotateRight) {
    rotateRight.onclick = (e) => {
      e.preventDefault();
      cropperInstance.rotate(90);
    };
  }

  // Cleanup & Close helpers
  const cleanup = () => {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    cropImage.src = '';
  };

  // Bind cancel action
  cancelBtn.onclick = (e) => {
    e.preventDefault();
    cleanup();
  };

  // Bind apply crop action
  applyBtn.onclick = (e) => {
    e.preventDefault();
    if (!cropperInstance) return;

    // Get cropped canvas
    const croppedCanvas = cropperInstance.getCroppedCanvas({
      imageSmoothingQuality: 'high'
    });

    if (!croppedCanvas) {
      alert("Failed to crop image. Make sure selection bounds are correct.");
      cleanup();
      return;
    }

    // Convert cropped canvas to blob using the original file format
    croppedCanvas.toBlob((blob) => {
      if (blob) {
        // Re-wrap as File object
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now()
        });
        
        onCropSuccess(croppedFile);
      } else {
        alert("Failed to process crop data.");
      }
      cleanup();
    }, imageFile.type || 'image/jpeg', 0.95);
  };
}
