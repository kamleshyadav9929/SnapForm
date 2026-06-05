/**
 * Client-Side SEO Router
 * Manages programmatic paths and dynamically updates document metadata to rank for long-tail search terms.
 */

export const ROUTE_PRESETS = {
  '/compress-photo-to-exactly-50kb-ssc': {
    targetMaxKB: 50,
    outputType: 'image/jpeg',
    title: 'SSC Online Photo Resizer under 50KB | 100% Offline & Private',
    h1: 'SSC Online Photo Resizer (Under 50KB)',
    description: 'Compress and resize photos to exactly under 50KB online for SSC registration portals. 100% private, local-first image compressor.',
    badge: 'SSC Preset',
    targetWidth: 350,
    targetHeight: 450
  },
  '/resize-signature-under-20kb-upsc': {
    targetMaxKB: 20,
    outputType: 'image/jpeg',
    title: 'UPSC Signature Resizer under 20KB | 100% Offline & Private',
    h1: 'UPSC Signature Resizer (Under 20KB)',
    description: 'Resize and compress signatures under 20KB online for UPSC portal requirements. 100% private, local-first signature compressor.',
    badge: 'UPSC Preset',
    targetWidth: 350,
    targetHeight: 110
  },
  '/resize-signature-under-10kb-neet': {
    targetMaxKB: 10,
    outputType: 'image/jpeg',
    title: 'NEET Signature Resizer under 10KB | 100% Offline & Private',
    h1: 'NEET Signature Resizer (Under 10KB)',
    description: 'Resize and compress signatures under 10KB online for NEET exam portal. 100% private local-first signature resizer.',
    badge: 'NEET Preset',
    targetWidth: 300,
    targetHeight: 100
  },
  '/compress-photo-under-20kb-gate-exam': {
    targetMaxKB: 20,
    outputType: 'image/jpeg',
    title: 'GATE Photo Compressor under 20KB | 100% Offline & Private',
    h1: 'GATE Photo Compressor (Under 20KB)',
    description: 'Compress and resize GATE photos under 20KB online locally. Keep aspect ratios locked and process completely in browser memory.',
    badge: 'GATE Preset',
    targetWidth: 240,
    targetHeight: 320
  },
  '/sbi-clerk-photo-resizer-under-50kb': {
    targetMaxKB: 50,
    outputType: 'image/jpeg',
    title: 'SBI Clerk Photo Resizer under 50KB | 100% Offline & Private',
    h1: 'SBI Clerk Photo Resizer (Under 50KB)',
    description: 'Resize and compress photos for SBI Clerk registration portals under 50KB online. 100% secure, offline client-side compression.',
    badge: 'SBI Preset',
    targetWidth: 350,
    targetHeight: 450
  },
  '/': {
    targetMaxKB: 50,
    outputType: 'image/jpeg',
    title: '100% Offline Image Resizer & Compressor - Compress to 20KB, 50KB, 100KB',
    h1: 'Local-First Image Resizer & Compressor',
    description: 'Resize and compress JPEG, PNG, HEIC, and WebP images to exact KB thresholds (50KB, 20KB) locally. Zero server uploads. 100% private.',
    badge: 'Standard',
    targetWidth: null,
    targetHeight: null
  }
};

/**
 * Normalizes window path to match ROUTE_PRESETS
 * @param {string} path 
 * @returns {string}
 */
function normalizePath(path) {
  // Support both normal subdirectories and hash-based fallbacks for static hosting
  const p = path.replace(/\/index\.html$/i, '/').replace(/\/$/, '');
  return ROUTE_PRESETS[p] ? p : '/';
}

/**
 * Resolves current path route configuration and updates SEO tags in the document.
 * @param {Function} onRouteMatched - Callback to update core application state.
 */
export function handleRouting(onRouteMatched) {
  const currentPath = window.location.pathname;
  const targetKey = normalizePath(currentPath);
  const routeConfig = ROUTE_PRESETS[targetKey];

  // Update Page Title
  document.title = routeConfig.title;

  // Update Meta Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = routeConfig.description;

  // Trigger app state synchronization callback
  onRouteMatched(routeConfig);
}

/**
 * Navigates to a route client-side without full reload.
 * @param {string} path 
 * @param {Function} onRouteMatched 
 */
export function navigateTo(path, onRouteMatched) {
  window.history.pushState({}, '', path);
  handleRouting(onRouteMatched);
}

/**
 * Sets up history change event listeners
 * @param {Function} onRouteMatched 
 */
export function initRouter(onRouteMatched) {
  window.addEventListener('popstate', () => {
    handleRouting(onRouteMatched);
  });
  
  // Initial run
  handleRouting(onRouteMatched);
}
