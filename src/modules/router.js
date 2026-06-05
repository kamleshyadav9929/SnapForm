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
    badge: 'SSC Preset'
  },
  '/resize-signature-under-20kb-upsc': {
    targetMaxKB: 20,
    outputType: 'image/jpeg',
    title: 'UPSC Signature Resizer under 20KB | 100% Offline & Private',
    h1: 'UPSC Signature Resizer (Under 20KB)',
    description: 'Resize and compress signatures under 20KB online for UPSC portal requirements. 100% private, local-first signature compressor.',
    badge: 'UPSC Preset'
  },
  '/': {
    targetMaxKB: 50,
    outputType: 'image/jpeg',
    title: '100% Offline Image Resizer & Compressor - Compress to 20KB, 50KB, 100KB',
    h1: 'Local-First Image Resizer & Compressor',
    description: 'Resize and compress JPEG, PNG, HEIC, and WebP images to exact KB thresholds (50KB, 20KB) locally. Zero server uploads. 100% private.',
    badge: 'Standard'
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
