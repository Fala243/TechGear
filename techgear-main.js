/* ==============================================================
   TechGear – Shared Script (loaded on every page)
   --------------------------------------------------------------
   The same techgear-main.js runs on techgear-home.html, techgear-products.html,
   techgear-about.html, and techgear-contact.html. Each feature first checks that
   its HTML elements exist on the CURRENT page and quietly does
   nothing if they don't – so, for example, the Products page
   code can never cause an error on the About page.

   Every feature is set up exactly once, from the "start-up"
   section at the very bottom, so no event listener is added twice.

   Table of contents
   1.  Theme toggle (all pages)
   2.  Product data – the single source of truth
   2b. Saving & loading data with localStorage
   3.  Building product cards (shared by Home and Products)
   4.  Show / hide specifications (any page with product cards)
   4b. Favorites (Home and Products)
   5.  Home page: featured product preview
   6.  Products page: search, filter, sort & rendering
   7.  Products page: deleting products
   8.  Shared form helpers
   9.  Products page: "Add Product" form
   10. Contact page: contact form
   11. Home page: newsletter form
   12. Keyboard shortcuts (all pages)
   13. Footer year (all pages)
   14. Scroll reveal animations (all pages)
   15. Rotating phrase under each page heading (all pages)
   16. Start-up: run each feature once
   ============================================================== */


/* ==============================================================
   1. DARK / LIGHT THEME TOGGLE
   --------------------------------------------------------------
   - The theme is stored in the data-theme attribute on <body>:
     data-theme="dark" (default) or data-theme="light".
   - techgear-styles.css swaps its color variables for [data-theme="light"],
     so changing this ONE attribute re-colors the whole page.
   - The choice is saved in localStorage. Every page reads the
     same key, so the theme stays the same as you move between
     pages. (A tiny script at the top of each page's <body> applies
     a saved light theme before the page is drawn, to avoid a flash.)
   ============================================================== */

// The name (key) the theme is saved under in localStorage.
// localStorage keeps simple text values in the visitor's browser,
// even after the page or browser is closed.
const THEME_STORAGE_KEY = 'techgear-theme';

/**
 * Read the saved theme. Returns "dark", "light", or null.
 * localStorage can throw an error when the browser blocks storage,
 * so try/catch keeps the page working either way.
 */
function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
  } catch (error) {
    // Storage isn't available – fall back to the default theme.
  }
  return null;
}

/**
 * Save the chosen theme in localStorage.
 */
function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Storage isn't available – the theme still changes,
    // it just won't be remembered next time.
  }
}

/**
 * Apply a theme to the page and update the toggle button to match.
 */
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);

  const button = document.getElementById('theme-toggle');
  if (!button) {
    return;
  }

  const isLight = theme === 'light';

  // The button names the theme you will switch TO.
  const buttonText = isLight ? 'Dark Mode' : 'Light Mode';
  button.textContent = buttonText;

  // aria-pressed="true" means "light mode is switched on".
  button.setAttribute('aria-pressed', String(isLight));
  button.setAttribute('aria-label', 'Switch to ' + buttonText);
}

function initThemeToggle() {
  // Use the saved theme if there is one; otherwise the HTML default.
  const startingTheme = getSavedTheme() || document.body.getAttribute('data-theme') || 'dark';
  applyTheme(startingTheme);

  const button = document.getElementById('theme-toggle');
  if (!button) {
    return;
  }

  // addEventListener('click', ...) runs the function on every click
  // (and on Enter/Space, because it's a real <button>).
  // Used to restart the fade timer if the button is clicked quickly twice.
  let themeFadeTimer = null;

  button.addEventListener('click', function () {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    // SMOOTH THEME SWITCH: for a moment, .theme-transition on <html>
    // makes every element fade its colors (see techgear-styles.css 16e).
    // Skipped for visitors who prefer reduced motion.
    if (!prefersReducedMotion()) {
      document.documentElement.classList.add('theme-transition');
      clearTimeout(themeFadeTimer);
      themeFadeTimer = setTimeout(function () {
        document.documentElement.classList.remove('theme-transition');
      }, 400);
    }

    applyTheme(newTheme);
    saveTheme(newTheme);
  });
}


/* ==============================================================
   2. PRODUCT DATA – THE SINGLE SOURCE OF TRUTH
   --------------------------------------------------------------
   An ARRAY is an ordered list: [item1, item2, ...].
   An OBJECT groups related values under names (keys):
     { name: 'UltraBook', price: 1299 }

   "products" is defined ONCE, here. The Home page preview and the
   Products page both draw their cards from this same array.
   To change what is shown, we change the array and re-render.

   All names, specs, and prices are fictional samples.
   SAMPLE_PRODUCTS is only the STARTING catalog: on a visitor's
   first visit "products" is filled with a copy of it. After that,
   their own saved list (with any additions/deletions) is loaded
   from localStorage instead – see section 2b.
   ============================================================== */

// Category ids (used in the data and in HTML ids like "laptops-grid")
// mapped to the names shown to visitors.
const CATEGORY_NAMES = {
  laptops: 'Laptops',
  headphones: 'Headphones',
  smartwatches: 'Smartwatches',
  accessories: 'Accessories'
};

const SAMPLE_PRODUCTS = [
  {
    id: 1,
    name: 'TechGear UltraBook 14',
    category: 'laptops',
    description: 'A featherlight laptop with a vivid display and all-day battery for work on the go.',
    price: 1299,
    image: 'product-images/techgear-ultrabook-14-laptop.webp',
    imageAlt: 'TechGear UltraBook 14 laptop, half open, with a slim silver body and a bright display, on a dark background',
    specs: [
      { label: 'Display', value: '14" 2.8K OLED, 120Hz' },
      { label: 'Processor', value: '8-core CPU, 16GB RAM' },
      { label: 'Battery', value: 'Up to 18 hours' }
    ]
  },
  {
    id: 2,
    name: 'TechGear Forge 16',
    category: 'laptops',
    description: 'A powerful 16-inch creator and gaming laptop with a fast, color-accurate screen.',
    price: 1899,
    image: 'product-images/techgear-forge-16-laptop.webp',
    imageAlt: 'TechGear Forge 16 gaming laptop with a black chassis and a colorful backlit keyboard',
    specs: [
      { label: 'Display', value: '16" QHD+, 240Hz' },
      { label: 'Graphics', value: 'RTX-class GPU, 8GB' },
      { label: 'Storage', value: '1TB NVMe SSD' }
    ]
  },
  {
    id: 3,
    name: 'AuraSound Pro ANC',
    category: 'headphones',
    description: 'Over-ear wireless headphones with adaptive noise cancelling and rich, balanced sound.',
    price: 279,
    image: 'product-images/aurasound-pro-anc-headphones.webp',
    imageAlt: 'AuraSound Pro ANC over-ear wireless headphones in matte black, lying on a dark surface',
    specs: [
      { label: 'Noise cancelling', value: 'Adaptive ANC' },
      { label: 'Battery', value: 'Up to 40 hours' },
      { label: 'Connectivity', value: 'Bluetooth 5.3, USB-C' }
    ]
  },
  {
    id: 4,
    name: 'AuraSound Buds Air',
    category: 'headphones',
    description: 'Tiny true-wireless earbuds with a pocket-sized charging case and clear calls.',
    price: 129,
    image: 'product-images/aurasound-buds-air-earbuds.webp',
    imageAlt: 'AuraSound Buds Air black wireless earbuds beside their open charging case',
    specs: [
      { label: 'Battery', value: '8 h (30 h with case)' },
      { label: 'Water resistance', value: 'IPX5' },
      { label: 'Microphones', value: '6 with voice pickup' }
    ]
  },
  {
    id: 5,
    name: 'PulseFit Watch 2',
    category: 'smartwatches',
    description: 'A sleek fitness smartwatch with health tracking, GPS, and a bright always-on screen.',
    price: 249,
    image: 'product-images/pulsefit-watch-2-smartwatch.webp',
    imageAlt: 'PulseFit Watch 2 smartwatch with a white strap, showing the time on its bright screen',
    specs: [
      { label: 'Display', value: '1.4" AMOLED, always-on' },
      { label: 'Battery', value: 'Up to 7 days' },
      { label: 'Water resistance', value: '5 ATM (swim-proof)' }
    ]
  },
  {
    id: 6,
    name: 'PulseFit Trail Pro',
    category: 'smartwatches',
    description: 'A rugged outdoor watch with offline maps, dual-band GPS, and a titanium case.',
    price: 399,
    image: 'product-images/pulsefit-trail-pro-smartwatch.webp',
    imageAlt: 'PulseFit Trail Pro rugged outdoor watch with a black case and a textured sport strap',
    specs: [
      { label: 'GPS', value: 'Dual-band, offline maps' },
      { label: 'Battery', value: 'Up to 14 days' },
      { label: 'Case', value: 'Titanium, 10 ATM' }
    ]
  },
  {
    id: 7,
    name: 'VoltCharge 65W GaN Charger',
    category: 'accessories',
    description: 'A compact fast charger that powers your laptop, phone, and watch from one plug.',
    price: 49,
    image: 'product-images/voltcharge-65w-charger.webp',
    imageAlt: 'VoltCharge 65W compact GaN wall charger in graphite, beside its coiled USB-C cable',
    specs: [
      { label: 'Total output', value: '65W fast charging' },
      { label: 'Ports', value: '2× USB-C, 1× USB-A' },
      { label: 'Technology', value: 'GaN – 40% smaller' }
    ]
  },
  {
    id: 8,
    name: 'DockLink 8-in-1 USB-C Hub',
    category: 'accessories',
    description: 'One cable connects your laptop to a monitor, network, memory cards, and more.',
    price: 79,
    image: 'product-images/docklink-8-in-1-usb-c-hub.webp',
    imageAlt: 'DockLink 8-in-1 USB-C hub in space gray, showing its SD card slots and USB port',
    specs: [
      { label: 'Video', value: 'HDMI 4K @ 60Hz' },
      { label: 'Ports', value: '3× USB-A, 1× USB-C PD' },
      { label: 'Extras', value: 'Ethernet, SD, microSD' }
    ]
  }
];

// ---- Product images ----
// One placeholder drawing per category, used for products that
// don't have their own photo (e.g. products added with the form).
const PLACEHOLDER_IMAGES = {
  laptops: 'product-images/laptop-placeholder-image.svg',
  headphones: 'product-images/headphones-placeholder-image.svg',
  smartwatches: 'product-images/smartwatch-placeholder-image.svg',
  accessories: 'product-images/accessory-placeholder-image.svg'
};

/**
 * Work out which image a product card should show. Returns
 * { src, alt, isPlaceholder }.
 *
 * 1. A sample product (same id AND same name) always uses the
 *    sample's current photo, even if older saved data holds no image
 *    or an outdated image path. The saved data itself is never
 *    changed. Checking the name too means a different product that
 *    happens to reuse an id never gets the wrong photo.
 * 2. Otherwise, the product's own image, if it has one.
 * 3. Otherwise, the placeholder for its category. Its alt text is
 *    empty ("decorative"), because the product name is right below.
 */
function getProductImage(product) {
  const matchingSample = SAMPLE_PRODUCTS.find(function (sample) {
    return sample.id === product.id && sample.name === product.name;
  });
  if (matchingSample && matchingSample.image) {
    return { src: matchingSample.image, alt: matchingSample.imageAlt, isPlaceholder: false };
  }

  if (product.image) {
    return { src: product.image, alt: product.imageAlt || product.name, isPlaceholder: false };
  }

  return { src: PLACEHOLDER_IMAGES[product.category], alt: '', isPlaceholder: true };
}

// ---- localStorage keys: the names our data is saved under ----
// (Every page uses the same keys, so all pages share the same data.)
const PRODUCTS_STORAGE_KEY = 'techgear-products';
const FAVORITES_STORAGE_KEY = 'techgear-favorites';

// THE LIVE PRODUCT LIST used by every page and every function below.
// loadProducts() (section 2b) returns the visitor's saved products –
// or a fresh copy of the samples if nothing has been saved yet.
// It's a "const" array: we change what's INSIDE it (push, splice),
// but it's always the same array.
const products = loadProducts();

// FAVORITES: an array of product ids, e.g. [3, 7]. Each id appears
// only once. "let" because we sometimes replace it with a new,
// filtered array.
let favorites = loadFavorites();

// The id for the next new product: one higher than the highest id
// in use, so every product's id stays unique.
let nextProductId = getNextProductId();

// Formats numbers as US dollars, e.g. 1299 → "$1,299.00".
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});


/* ==============================================================
   2b. SAVING & LOADING DATA (localStorage)
   --------------------------------------------------------------
   localStorage keeps data in the visitor's browser between visits
   and across all pages of the site. It can only store TEXT, so:
     JSON.stringify([3, 7])  →  "[3,7]"     (array → text, to save)
     JSON.parse("[3,7]")     →  [3, 7]      (text → array, to load)

   What can go wrong, and what we do about it:
   - Nothing saved yet (first visit)   → start with the sample products
   - Storage blocked (privacy settings, some private windows)
                                       → the site still works; a notice
                                         explains that changes can't be saved
   - Saved text damaged or edited by hand → JSON.parse() would fail, so
                                         we catch the error, check every
                                         product, and tell the visitor
   - Saved list is EMPTY ([])          → the visitor deleted everything on
                                         purpose, so we keep it empty
   ============================================================== */

/**
 * Read and parse one saved value. Returns an object with a status:
 *   'ok' (+ value), 'missing', 'corrupt', or 'unavailable'.
 * try/catch stops a storage error from breaking the whole page.
 */
function readStoredJSON(key) {
  let text;
  try {
    text = localStorage.getItem(key); // null if nothing is saved
  } catch (error) {
    return { status: 'unavailable' }; // the browser blocks storage
  }

  if (text === null) {
    return { status: 'missing' };
  }

  try {
    return { status: 'ok', value: JSON.parse(text) };
  } catch (error) {
    return { status: 'corrupt' }; // the text isn't valid JSON
  }
}

/**
 * Save a value as JSON text. Returns true if it worked.
 * setItem() can fail if storage is blocked or full.
 */
function writeStoredJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Does this saved item look like a real product?
 * (Saved data could have been damaged or edited by hand.)
 */
function isValidProduct(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    Number.isInteger(item.id) && item.id > 0 &&
    typeof item.name === 'string' && item.name.trim() !== '' &&
    Object.prototype.hasOwnProperty.call(CATEGORY_NAMES, item.category) &&
    typeof item.description === 'string' &&
    typeof item.price === 'number' && Number.isFinite(item.price) && item.price > 0 &&
    Array.isArray(item.specs) &&
    item.specs.every(function (spec) {
      return spec !== null && typeof spec === 'object' &&
        typeof spec.label === 'string' && typeof spec.value === 'string';
    })
  );
}

/**
 * Make a clean copy of a product with only the fields we use.
 */
function cleanProduct(item) {
  const product = {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description,
    price: item.price,
    specs: item.specs.map(function (spec) {
      return { label: spec.label, value: spec.value };
    })
  };
  // Optional photo fields. Older saved products simply don't have
  // them – that's fine, getProductImage() handles it.
  if (isSafeImagePath(item.image)) product.image = item.image;
  if (typeof item.imageAlt === 'string') product.imageAlt = item.imageAlt;
  return product;
}

/**
 * Only accept image paths that look like real images: a file in the
 * product-images/ folder, a web address, or an embedded data image.
 * (Saved data could contain anything, so we check before using it.)
 */
function isSafeImagePath(path) {
  return typeof path === 'string' &&
    /^(product-images\/[\w.\-]+|https?:\/\/\S+|data:image\/)/i.test(path);
}

/**
 * Load the product list: the saved one, or the samples on a first
 * visit. options.quiet skips the on-screen notices (used when
 * re-syncing in the background).
 */
function loadProducts(options) {
  const quiet = Boolean(options && options.quiet);
  const saved = readStoredJSON(PRODUCTS_STORAGE_KEY);

  // First visit (or storage blocked): start with copies of the samples.
  if (saved.status === 'missing' || saved.status === 'unavailable') {
    return SAMPLE_PRODUCTS.map(cleanProduct);
  }

  // Damaged data: fall back to the samples and say so.
  if (saved.status === 'corrupt' || !Array.isArray(saved.value)) {
    if (!quiet) {
      showStorageNotice('Your saved products could not be read, so the sample products are shown instead.');
    }
    return SAMPLE_PRODUCTS.map(cleanProduct);
  }

  // Keep only valid products, and only one product per id.
  const seenIds = new Set();
  const validProducts = [];
  saved.value.forEach(function (item) {
    if (isValidProduct(item) && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      validProducts.push(cleanProduct(item));
    }
  });

  if (validProducts.length < saved.value.length && !quiet) {
    showStorageNotice('Some saved products were damaged and have been skipped.');
  }

  // This may be an empty array – that's fine: it means the visitor
  // deleted every product, so we do NOT bring the samples back.
  return validProducts;
}

/**
 * Save the whole products array. Returns true if it worked.
 */
function saveProducts() {
  const saved = writeStoredJSON(PRODUCTS_STORAGE_KEY, products);
  if (!saved) {
    showStorageNotice('Your product changes could not be saved in this browser, so they will be lost when you leave this page.');
  }
  return saved;
}

/**
 * Load the favorites: a list of ids of products that still exist.
 */
function loadFavorites(options) {
  const quiet = Boolean(options && options.quiet);
  const saved = readStoredJSON(FAVORITES_STORAGE_KEY);

  if (saved.status === 'missing' || saved.status === 'unavailable') {
    return [];
  }
  if (saved.status === 'corrupt' || !Array.isArray(saved.value)) {
    if (!quiet) {
      showStorageNotice('Your saved favorites could not be read, so the list has been reset.');
    }
    return [];
  }

  // Keep whole-number ids, no duplicates (includes() checks the list
  // so far), and only products that still exist (find() looks one up).
  const cleaned = [];
  saved.value.forEach(function (id) {
    const productExists = products.find(function (product) {
      return product.id === id;
    });
    if (Number.isInteger(id) && !cleaned.includes(id) && productExists) {
      cleaned.push(id);
    }
  });
  return cleaned;
}

/**
 * Save the favorites array. Returns true if it worked.
 */
function saveFavorites() {
  const saved = writeStoredJSON(FAVORITES_STORAGE_KEY, favorites);
  if (!saved) {
    showStorageNotice('Your favorites could not be saved in this browser, so they will be lost when you leave this page.');
  }
  return saved;
}

/**
 * One more than the highest product id in use (1 if there are none).
 */
function getNextProductId() {
  let highestId = 0;
  products.forEach(function (product) {
    if (product.id > highestId) {
      highestId = product.id;
    }
  });
  return highestId + 1;
}

/**
 * Show a small notice at the bottom of the screen when data can't
 * be loaded or saved. It's created the first time it's needed, so
 * no page needs extra HTML for it. role="status" makes screen
 * readers announce the message.
 */
function showStorageNotice(message) {
  let notice = document.getElementById('storage-notice');

  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'storage-notice';
    notice.className = 'storage-notice';
    notice.setAttribute('role', 'status');

    const text = createElementWithText('p', 'storage-notice-text', '');
    const closeButton = createElementWithText('button', 'storage-notice-close', 'Dismiss');
    closeButton.type = 'button';
    closeButton.addEventListener('click', function () {
      notice.hidden = true;
    });

    notice.appendChild(text);
    notice.appendChild(closeButton);
    document.body.appendChild(notice);
  }

  notice.querySelector('.storage-notice-text').textContent = message;
  notice.hidden = false;
}


/* ==============================================================
   3. BUILDING PRODUCT CARDS
   --------------------------------------------------------------
   One function builds a card for BOTH the Home preview and the
   Products page, so cards always look and behave the same.
   We create elements with document.createElement(), fill them
   with textContent, and attach them with appendChild().

   textContent (not innerHTML) shows text typed into the form as
   plain text – it can never run as HTML, which keeps the page safe.
   ============================================================== */

/**
 * Small helper: create an element with a class and some text.
 */
function createElementWithText(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
}

/**
 * Build one product card (an <article>) from a product object.
 * options.showDelete adds a Delete button (Products page only).
 * The card is returned – the caller puts it on the page.
 */
function createProductCard(product, options) {
  const showDelete = Boolean(options && options.showDelete);

  // Unique ids for this card, built from the product's id.
  const nameId = 'product-name-' + product.id;
  const specsId = 'product-specs-' + product.id;

  // The card. "dataset" sets data-* attributes,
  // e.g. dataset.category → data-category="laptops".
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.id = product.id;
  card.dataset.category = product.category;

  // Category badge, name (an <h3> on both pages), and description
  const categoryLabel = createElementWithText('p', 'product-category-label', CATEGORY_NAMES[product.category]);
  const name = createElementWithText('h3', 'product-name', product.name);
  name.id = nameId;
  const description = createElementWithText('p', 'product-description', product.description);

  // Price, with a small "Sample price" note inside it
  const price = createElementWithText('p', 'product-price', priceFormatter.format(product.price) + ' ');
  price.appendChild(createElementWithText('span', 'price-note', 'Sample price'));

  // "View Specifications" button. aria-controls links it to the
  // spec list below, so section 4 knows which list to show or hide.
  const specsButton = createElementWithText('button', 'btn btn-secondary specs-toggle', 'View Specifications');
  specsButton.type = 'button';
  specsButton.setAttribute('aria-expanded', 'false');
  specsButton.setAttribute('aria-controls', specsId);
  specsButton.setAttribute('aria-describedby', nameId);

  // The specs PANEL – the element the button controls. It's hidden
  // until the button is clicked, and it animates open and closed
  // (see section 4). Structure:
  //   div.specs-panel  >  div.specs-panel-inner  >  dl.product-specs
  const specsPanel = document.createElement('div');
  specsPanel.className = 'specs-panel';
  specsPanel.id = specsId;
  specsPanel.hidden = true;

  const specsInner = document.createElement('div');
  specsInner.className = 'specs-panel-inner';

  const specsList = document.createElement('dl');
  specsList.className = 'product-specs';

  // forEach runs the function once for every item in the array.
  product.specs.forEach(function (spec) {
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.appendChild(createElementWithText('dt', '', spec.label));
    row.appendChild(createElementWithText('dd', '', spec.value));
    specsList.appendChild(row);
  });

  specsInner.appendChild(specsList);
  specsPanel.appendChild(specsInner);

  // ---- Product image (at the top of every card) ----
  // getProductImage() picks the product's photo, a matching sample
  // photo for older saved data, or the category placeholder.
  const imageInfo = getProductImage(product);

  // The frame keeps every image the same 4:3 shape (techgear-styles.css).
  const media = document.createElement('div');
  media.className = 'product-media';

  const image = document.createElement('img');
  image.className = 'product-image';
  image.alt = imageInfo.alt;
  image.width = 800;           // the images' real shape (4:3), so the
  image.height = 600;          // browser can reserve the space early
  image.loading = 'lazy';      // download only when it's about to be seen
  image.decoding = 'async';    // decode without blocking the page

  // SMOOTH LOADING: the image starts invisible and fades in once it
  // has finished downloading ("load" event → .is-loaded in CSS).
  image.addEventListener('load', function () {
    image.classList.add('is-loaded');
  });

  // MISSING PHOTO: if the file can't be loaded (e.g. it hasn't been
  // added to the product-images/ folder yet), show the category placeholder
  // instead. data-fallback makes sure we only try this once.
  image.addEventListener('error', function () {
    if (!imageInfo.isPlaceholder && image.dataset.fallback !== 'true') {
      image.dataset.fallback = 'true';
      image.alt = ''; // the placeholder is decorative
      image.src = PLACEHOLDER_IMAGES[product.category];
    } else {
      image.hidden = true; // even the placeholder failed: show the empty frame
    }
  });

  // Set src LAST, after the listeners, so no "load" event is missed.
  image.src = imageInfo.src;

  media.appendChild(image);
  card.appendChild(media);

  // Top row: category badge on the left, favorite heart on the right.
  const topRow = document.createElement('div');
  topRow.className = 'card-top';
  topRow.appendChild(categoryLabel);
  topRow.appendChild(createFavoriteButton(product)); // section 4b

  // Put the pieces inside the card, in display order.
  card.appendChild(topRow);
  card.appendChild(name);
  card.appendChild(description);
  card.appendChild(price);
  card.appendChild(specsButton);
  card.appendChild(specsPanel);

  // Delete button (Products page only). data-id tells the click
  // handler which product to remove; aria-label names the product.
  if (showDelete) {
    const deleteButton = createElementWithText('button', 'btn btn-delete delete-product', 'Delete');
    deleteButton.type = 'button';
    deleteButton.dataset.id = product.id;
    deleteButton.setAttribute('aria-label', 'Delete ' + product.name);
    card.appendChild(deleteButton);
  }

  return card;
}


/* ==============================================================
   4. SHOW / HIDE SPECIFICATIONS
   --------------------------------------------------------------
   Works for every product card on any page, including cards
   created later. Each card opens and closes on its own.

   ANIMATION: the panel's height and opacity animate in CSS when
   the class "is-open" is added or removed (techgear-styles.css, section 11).
   The "hidden" attribute is removed BEFORE opening and added back
   only AFTER closing has finished, so the animation is visible and
   closed specs are still fully hidden from screen readers.
   ============================================================== */

// How long the CSS collapse animation takes (matches techgear-styles.css).
const SPECS_ANIMATION_MS = 300;

/**
 * Expand a specs panel with an animation.
 */
function openSpecsPanel(panel) {
  panel.hidden = false;
  // Reading offsetHeight forces the browser to draw the panel in its
  // collapsed state first; without this, it would skip straight to
  // "open" and there would be nothing to animate.
  void panel.offsetHeight;
  panel.classList.add('is-open');
}

/**
 * Collapse a specs panel with an animation, then hide it.
 */
function closeSpecsPanel(panel) {
  panel.classList.remove('is-open'); // starts the collapse animation

  if (prefersReducedMotion()) {
    panel.hidden = true; // no animation – hide straight away
    return;
  }

  // Wait for the animation to finish, then hide it completely.
  // (The check skips this if the panel was re-opened in the meantime.)
  setTimeout(function () {
    if (!panel.classList.contains('is-open')) {
      panel.hidden = true;
    }
  }, SPECS_ANIMATION_MS);
}

/**
 * Open or close one product's specifications.
 */
function toggleSpecs(button) {
  // Find the panel this button controls, using its id.
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  if (!panel) {
    return;
  }

  // aria-expanded is text ("true"/"false"), so compare with a string.
  const willOpen = button.getAttribute('aria-expanded') !== 'true';

  if (willOpen) {
    openSpecsPanel(panel);
  } else {
    closeSpecsPanel(panel);
  }

  // Keep the button in sync with what is on screen.
  button.setAttribute('aria-expanded', String(willOpen));
  button.textContent = willOpen ? 'Hide Specifications' : 'View Specifications';

  // classList.toggle(name, condition) adds the class when the
  // condition is true and removes it when false.
  button.classList.toggle('is-active', willOpen);
}

/**
 * Close every open specification list. Returns true if any closed.
 */
function closeAllSpecs() {
  const openButtons = document.querySelectorAll('.specs-toggle[aria-expanded="true"]');
  openButtons.forEach(function (button) {
    toggleSpecs(button); // on an open card, this closes it
  });
  return openButtons.length > 0;
}

function initSpecsToggles() {
  // EVENT DELEGATION: one listener on the whole document handles the
  // spec button on every card. Clicks "bubble up" from the button,
  // and closest() finds the .specs-toggle button that was clicked.
  // This also covers cards that renderProducts() creates later.
  document.addEventListener('click', function (event) {
    const button = event.target.closest('.specs-toggle');
    if (button) {
      toggleSpecs(button);
    }
  });
}


/* ==============================================================
   4b. FAVORITES
   --------------------------------------------------------------
   "favorites" (section 2) is an array of product ids, e.g. [3, 7].
   - Clicking a heart adds or removes that product's id.
   - The array is saved to localStorage after every change, so the
     Home and Products pages always share the same favorites.
   - ♡ (outline) = not a favorite, ♥ (filled) = favorite.
   ============================================================== */

// The two heart characters. ︎ asks for the plain text style
// of ♥, so no device swaps in a red emoji heart.
const HEART_EMPTY = '♡';        // ♡
const HEART_FULL = '♥︎';   // ♥

/**
 * Is this product a favorite? includes() checks if the id is in the array.
 */
function isFavorite(id) {
  return favorites.includes(id);
}

/**
 * Add or remove a product from favorites, save, and return the new state.
 */
function toggleFavorite(id) {
  if (isFavorite(id)) {
    // filter() makes a new array WITHOUT this id.
    favorites = favorites.filter(function (favoriteId) {
      return favoriteId !== id;
    });
  } else {
    favorites.push(id);
  }
  saveFavorites();
  return isFavorite(id);
}

/**
 * Remove an id from favorites (used when a product is deleted, so
 * the favorites list never points at a product that's gone).
 */
function removeFromFavorites(id) {
  if (isFavorite(id)) {
    favorites = favorites.filter(function (favoriteId) {
      return favoriteId !== id;
    });
    saveFavorites();
  }
}

/**
 * Make a heart button show the right state.
 * aria-pressed="true" tells screen readers the favorite is ON; the
 * label ("Favorite: product name") stays the same in both states,
 * which is how toggle buttons are meant to work. The tooltip (title)
 * describes what a click will do.
 */
function setFavoriteButtonState(button, favorite) {
  button.setAttribute('aria-pressed', String(favorite));
  button.classList.toggle('is-favorite', favorite);
  button.title = favorite ? 'Remove from favorites' : 'Add to favorites';
  button.querySelector('.favorite-icon').textContent = favorite ? HEART_FULL : HEART_EMPTY;
}

/**
 * Build the heart button for one product card.
 */
function createFavoriteButton(product) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'favorite-btn';
  button.dataset.id = product.id;
  button.setAttribute('aria-label', 'Favorite: ' + product.name);

  // The heart itself is decoration – the label says what it does.
  const icon = createElementWithText('span', 'favorite-icon', '');
  icon.setAttribute('aria-hidden', 'true');
  button.appendChild(icon);

  setFavoriteButtonState(button, isFavorite(product.id));
  return button;
}

/**
 * Announce a short message to screen-reader users. Uses the
 * Products page status line, or a hidden one created on other pages.
 */
function announce(message) {
  let status = document.getElementById('products-status') || document.getElementById('site-status');
  if (!status) {
    status = document.createElement('p');
    status.id = 'site-status';
    status.className = 'visually-hidden';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    document.body.appendChild(status);
  }
  status.textContent = message;
}

/**
 * Update the Products page "Favorites Only" button: its pressed
 * state and the number of favorites shown on it.
 */
function updateFavoritesFilterButton() {
  const button = document.getElementById('favorites-filter');
  if (!button) {
    return; // not the Products page
  }
  button.setAttribute('aria-pressed', String(filterState.favoritesOnly));
  button.classList.toggle('active', filterState.favoritesOnly);
  button.querySelector('.favorites-filter-icon').textContent =
    filterState.favoritesOnly ? HEART_FULL : HEART_EMPTY;
  button.querySelector('.favorites-count').textContent = '(' + favorites.length + ')';
}

function initFavorites() {
  // Make sure a screen-reader status line exists BEFORE the first
  // announcement (live regions must be on the page in advance).
  announce('');

  // EVENT DELEGATION: one click listener for every heart on the page,
  // including hearts on cards that are created later.
  document.addEventListener('click', function (event) {
    const button = event.target.closest('.favorite-btn');
    if (!button) {
      return;
    }

    const id = Number(button.dataset.id); // data-id is text → number
    const product = products.find(function (item) {
      return item.id === id;
    });
    if (!product) {
      return;
    }

    const nowFavorite = toggleFavorite(id);

    // Update EVERY heart for this product on the page.
    document.querySelectorAll('.favorite-btn[data-id="' + id + '"]').forEach(function (heart) {
      setFavoriteButtonState(heart, nowFavorite);
    });

    // A little "pop" animation when a heart is filled (techgear-styles.css).
    if (nowFavorite) {
      button.classList.remove('pop');
      void button.offsetWidth; // restart the animation if clicked again
      button.classList.add('pop');
    }

    announce(product.name + (nowFavorite ? ' added to favorites.' : ' removed from favorites.'));
    updateFavoritesFilterButton();

    // Products page with "Favorites Only" on: an un-favorited product
    // must disappear, so re-draw the catalog and move focus sensibly.
    if (filterState.favoritesOnly && !nowFavorite && document.getElementById('product-catalog')) {
      renderProducts();
      focusAfterDelete(product.category);
    }
  });
}


/* ==============================================================
   5. HOME PAGE: FEATURED PRODUCT PREVIEW
   --------------------------------------------------------------
   Shows the first product of each category from the SAME
   "products" array the Products page uses.
   ============================================================== */
function renderFeaturedPreview() {
  const grid = document.getElementById('featured-preview-grid');
  if (!grid) {
    return; // not the Home page
  }

  grid.textContent = ''; // remove the "turn on JavaScript" message

  Object.keys(CATEGORY_NAMES).forEach(function (category) {
    // find() returns the FIRST product that matches, or undefined.
    const product = products.find(function (item) {
      return item.category === category;
    });
    if (product) {
      grid.appendChild(createProductCard(product)); // no Delete button here
    }
  });

  // Every product was deleted on the Products page: say so.
  if (grid.children.length === 0) {
    grid.appendChild(createElementWithText(
      'p',
      'placeholder-text',
      'There are no products right now. Add some on the Products page.'
    ));
  }
}


/* ==============================================================
   6. PRODUCTS PAGE: SEARCH, CATEGORY FILTER, SORT & RENDERING
   --------------------------------------------------------------
   "filterState" remembers what the visitor has chosen. It is
   separate from the product data:
     - products    = WHAT exists (the single source of truth)
     - filterState = HOW the visitor wants to see it
   Every control updates filterState and calls renderProducts(),
   which works out what to show from both.
   ============================================================== */

const filterState = {
  searchTerm: '',       // text typed in the search box
  category: 'all',      // 'all' or a category id like 'laptops'
  sortBy: 'default',    // 'default', 'price-asc', or 'price-desc'
  favoritesOnly: false  // true = show only favorite products
};

/**
 * Is a search term, category, or "Favorites Only" narrowing the
 * results? (Sorting only changes the ORDER, so it doesn't count.)
 */
function areFiltersActive() {
  return filterState.searchTerm.trim() !== '' ||
    filterState.category !== 'all' ||
    filterState.favoritesOnly;
}

/**
 * Return the products to display, based on filterState.
 * The original "products" array is never changed.
 */
function getVisibleProducts() {
  // toLowerCase() makes the search case-insensitive.
  const term = filterState.searchTerm.trim().toLowerCase();

  // FILTERING: filter() builds a NEW array with only the items for
  // which the function returns true.
  const matchingProducts = products.filter(function (product) {
    const matchesCategory =
      filterState.category === 'all' || product.category === filterState.category;

    // includes() checks whether one piece of text contains another.
    const matchesSearch =
      term === '' ||
      product.name.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term);

    // "Favorites Only": keep the product only if its id is in favorites.
    const matchesFavorites = !filterState.favoritesOnly || isFavorite(product.id);

    // Keep the product only if it passes ALL the checks.
    return matchesCategory && matchesSearch && matchesFavorites;
  });

  // SORTING: sort() changes an array IN PLACE, so we sort a copy.
  const sortedProducts = matchingProducts.slice();

  // A negative result puts a first; a positive result puts b first.
  if (filterState.sortBy === 'price-asc') {
    sortedProducts.sort(function (a, b) {
      return a.price - b.price; // cheapest first
    });
  } else if (filterState.sortBy === 'price-desc') {
    sortedProducts.sort(function (a, b) {
      return b.price - a.price; // most expensive first
    });
  }
  // 'default' keeps the original array order.

  return sortedProducts;
}

// The ids of the products shown after the last render. A Set is a
// list without duplicates; .has(id) checks if an id is in it.
// It lets us animate only cards that are NEW on screen, so typing in
// the search box doesn't make every card flicker on each keystroke.
let shownProductIds = new Set();

/**
 * Draw the Products page catalog, applying the current search,
 * category filter, and sort order. Call it whenever the array or
 * the filter settings change.
 *
 * options.animateAll = true plays the entrance animation on EVERY
 * card (used after choosing a category or sort order). Otherwise
 * only cards that weren't on screen before are animated.
 */
function renderProducts(options) {
  const catalog = document.getElementById('product-catalog');
  if (!catalog) {
    return; // not the Products page
  }
  const animateAll = Boolean(options && options.animateAll);

  // 1. Get the products to show (a NEW, filtered and sorted array).
  const visibleProducts = getVisibleProducts();
  const filtersActive = areFiltersActive();

  // Object.keys() gives the category ids: ['laptops', 'headphones', ...]
  Object.keys(CATEGORY_NAMES).forEach(function (category) {
    const grid = document.getElementById(category + '-grid');
    if (!grid) {
      return;
    }

    // 2. Clear out the old cards (and any placeholder text).
    grid.textContent = '';

    // 3. The visible products in this category (already sorted).
    const categoryProducts = visibleProducts.filter(function (product) {
      return product.category === category;
    });

    // 4. Hide the whole category block (heading included) when a
    //    different category is selected, or the search left it empty.
    const categoryBlock = document.getElementById('category-' + category);
    const otherCategorySelected = filterState.category !== 'all' && filterState.category !== category;
    const hideBlock = otherCategorySelected || (filtersActive && categoryProducts.length === 0);
    if (categoryBlock) {
      categoryBlock.hidden = hideBlock;
    }
    if (hideBlock) {
      return;
    }

    // 5. A friendly message if the category has no products at all...
    if (categoryProducts.length === 0) {
      grid.appendChild(createElementWithText(
        'p',
        'placeholder-text',
        'No ' + CATEGORY_NAMES[category].toLowerCase() + ' yet. Add one with the form below.'
      ));
      return;
    }

    // 6. ...otherwise a card (with a Delete button) for each product.
    //    forEach also gives us each item's position (index): 0, 1, 2...
    categoryProducts.forEach(function (product, index) {
      const card = createProductCard(product, { showDelete: true });

      // ENTRANCE ANIMATION: .card-enter fades the card up into place
      // (techgear-styles.css 16c). Each card waits 60ms longer than the one
      // before it (capped at 5 steps), for a staggered "cascade".
      if (animateAll || !shownProductIds.has(product.id)) {
        card.classList.add('card-enter');
        card.style.setProperty('--enter-delay', Math.min(index, 5) * 60 + 'ms');
      }

      grid.appendChild(card);
    });
  });

  // Remember which products are on screen now, for the next render.
  shownProductIds = new Set(visibleProducts.map(function (product) {
    return product.id;
  }));

  // 7. Update "Showing X of Y products." and the no-results box.
  updateResultsSummary(visibleProducts.length);
}

/**
 * Update the results count and show/hide the no-results box.
 */
function updateResultsSummary(visibleCount) {
  const resultsCount = document.getElementById('results-count');
  const noResults = document.getElementById('no-results');
  const total = products.length;

  if (resultsCount) {
    resultsCount.textContent =
      'Showing ' + visibleCount + ' of ' + total + (total === 1 ? ' product.' : ' products.');
  }
  if (noResults) {
    noResults.hidden = !(areFiltersActive() && visibleCount === 0);

    // A more helpful hint when "Favorites Only" is on but there are
    // no favorites at all yet.
    const hint = noResults.querySelector('.no-results-text');
    if (hint) {
      hint.textContent = (filterState.favoritesOnly && favorites.length === 0)
        ? 'You haven\'t added any favorites yet. Select the ♡ on a product to save it.'
        : 'Try a different search term or category.';
    }
  }
}

/**
 * Highlight the selected category button and un-highlight the rest.
 */
function updateFilterButtons() {
  document.querySelectorAll('#product-filters .filter-btn').forEach(function (button) {
    const isSelected = button.dataset.filter === filterState.category;
    button.classList.toggle('active', isSelected);           // visual highlight
    button.setAttribute('aria-pressed', String(isSelected)); // for screen readers
  });
}

/**
 * Announce a short message to screen-reader users
 * (#products-status is visually hidden).
 */
function announceProductStatus(message) {
  announce(message); // shared helper in section 4b
}

function initProductCatalog() {
  const catalog = document.getElementById('product-catalog');
  if (!catalog) {
    return; // not the Products page – nothing to set up
  }

  const searchInput = document.getElementById('product-search');
  const sortSelect = document.getElementById('product-sort');
  const filterButtonGroup = document.getElementById('product-filters');
  const clearFiltersButton = document.getElementById('clear-filters');
  const favoritesFilterButton = document.getElementById('favorites-filter');

  // "Favorites Only": switch it on/off and re-draw. It works together
  // with the search, category, and sort settings in filterState.
  if (favoritesFilterButton) {
    favoritesFilterButton.addEventListener('click', function () {
      filterState.favoritesOnly = !filterState.favoritesOnly; // flip on ↔ off
      updateFavoritesFilterButton();
      renderProducts({ animateAll: true });
    });
  }

  // Search: the "input" event fires on every change to the text
  // (typing, deleting, pasting, or clearing it with the × button).
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      filterState.searchTerm = searchInput.value;
      renderProducts();
    });
  }

  // Sort: dropdowns fire "change" when a new option is chosen.
  // animateAll replays the card cascade so the new order is easy to see.
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      filterState.sortBy = sortSelect.value;
      renderProducts({ animateAll: true });
    });
  }

  // Category buttons: one listener on their wrapper (delegation).
  if (filterButtonGroup) {
    filterButtonGroup.addEventListener('click', function (event) {
      const button = event.target.closest('.filter-btn');
      if (!button) {
        return;
      }
      filterState.category = button.dataset.filter; // e.g. 'laptops'
      updateFilterButtons();
      renderProducts({ animateAll: true });
    });
  }

  // Clear Filters: reset everything back to the start.
  if (clearFiltersButton) {
    clearFiltersButton.addEventListener('click', function () {
      filterState.searchTerm = '';
      filterState.category = 'all';
      filterState.sortBy = 'default';
      filterState.favoritesOnly = false;

      // Make the controls on the page match the reset state.
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = 'default';
      updateFilterButtons();
      updateFavoritesFilterButton();

      renderProducts({ animateAll: true });
      if (searchInput) searchInput.focus(); // ready for a new search
    });
  }

  // Delete buttons on the cards (section 7)
  initDeleteButtons(catalog);

  // Draw the catalog for the first time.
  updateFavoritesFilterButton();
  renderProducts();
}


/* ==============================================================
   7. PRODUCTS PAGE: DELETING PRODUCTS
   --------------------------------------------------------------
   Clicking "Delete" removes the product from the ARRAY, then
   re-renders. The card disappears because the data changed.
   ============================================================== */

/**
 * Remove a product from the array by its id.
 * Returns the removed product, or null if it wasn't found.
 */
function deleteProduct(id) {
  // findIndex() returns the position of the first match, or -1.
  const index = products.findIndex(function (product) {
    return product.id === id;
  });
  if (index === -1) {
    return null;
  }

  // splice(index, 1) removes 1 item at that position.
  const removedProduct = products.splice(index, 1)[0];

  // Also remove it from favorites, so no favorite points at a
  // product that no longer exists.
  removeFromFavorites(id);

  // Save the updated list so the deletion lasts after a reload and
  // shows on every page.
  saveProducts();

  renderProducts();
  updateFavoritesFilterButton();
  return removedProduct;
}

/**
 * After a delete, the focused button is gone. Move keyboard focus
 * somewhere sensible so keyboard users don't get lost.
 */
function focusAfterDelete(category) {
  const grid = document.getElementById(category + '-grid');
  const nextButton = grid ? grid.querySelector('.specs-toggle') : null;
  if (nextButton) {
    nextButton.focus(); // the next card in the same category
    return;
  }

  const categoryBlock = document.getElementById('category-' + category);
  const heading = document.getElementById(category + '-heading');
  if (heading && categoryBlock && !categoryBlock.hidden) {
    heading.setAttribute('tabindex', '-1'); // lets JS focus a heading
    heading.focus();
    return;
  }

  const noResults = document.getElementById('no-results');
  const clearButton = document.getElementById('clear-filters');
  const searchInput = document.getElementById('product-search');
  if (noResults && !noResults.hidden && clearButton) {
    clearButton.focus();
  } else if (searchInput) {
    searchInput.focus();
  }
}

// How long the card fade-out takes before it's removed (matches CSS).
const CARD_LEAVE_MS = 250;

function initDeleteButtons(catalog) {
  // Event delegation: one listener handles Delete on every card.
  catalog.addEventListener('click', function (event) {
    const deleteButton = event.target.closest('.delete-product');
    if (!deleteButton) {
      return;
    }

    const card = deleteButton.closest('.product-card');
    if (card && card.classList.contains('card-leave')) {
      return; // already fading out – ignore extra clicks
    }

    // data-id is stored as text, so Number() turns it into a number.
    const id = Number(deleteButton.dataset.id);

    // Removes the product from the array and re-renders the catalog.
    function finishDelete() {
      const removedProduct = deleteProduct(id);
      if (removedProduct) {
        announceProductStatus(removedProduct.name + ' was deleted.');
        focusAfterDelete(removedProduct.category);
      }
    }

    // EXIT ANIMATION: fade and shrink the card first (techgear-styles.css 16c),
    // then delete it. Reduced-motion users skip straight to deleting.
    if (!card || prefersReducedMotion()) {
      finishDelete();
      return;
    }
    card.classList.add('card-leave');
    setTimeout(finishDelete, CARD_LEAVE_MS);
  });
}


/* ==============================================================
   8. SHARED FORM HELPERS
   --------------------------------------------------------------
   Used by the Add Product, Contact, and newsletter forms.
   Each validation error is an object like:
     { inputs: [the wrong field(s)], errorId: 'id-of-message', message: 'text' }
   ============================================================== */

/**
 * Show a summary message under a form ("success" or "error").
 */
function setFormMessage(element, text, type) {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.className = 'form-message ' + type;
}

/**
 * Remove all error messages and red outlines from a form.
 */
function clearFormErrors(form) {
  form.querySelectorAll('.field-error').forEach(function (errorElement) {
    errorElement.textContent = '';
  });
  form.querySelectorAll('[aria-invalid]').forEach(function (field) {
    field.removeAttribute('aria-invalid');
  });
}

/**
 * Show each error next to its field, mark the fields invalid, and
 * move the cursor to the first problem so it's easy to fix.
 */
function showFormErrors(errors) {
  errors.forEach(function (error) {
    const errorElement = document.getElementById(error.errorId);
    if (errorElement) {
      errorElement.textContent = error.message;
    }
    error.inputs.forEach(function (input) {
      input.setAttribute('aria-invalid', 'true'); // red outline + screen readers
    });
  });
  errors[0].inputs[0].focus();
}

/**
 * When a visitor edits a field that had an error, remove its red
 * outline so they can see it's being fixed.
 */
function clearInvalidOnInput(form) {
  form.addEventListener('input', function (event) {
    if (event.target.getAttribute('aria-invalid') === 'true') {
      event.target.removeAttribute('aria-invalid');
    }
  });
}

// A simple email check: something@something.something (no spaces).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


/* ==============================================================
   9. PRODUCTS PAGE: "ADD PRODUCT" FORM
   --------------------------------------------------------------
   On submit: stop the page reload, check every field, then
   push() the new product into the array and re-render.
   ============================================================== */

/**
 * Read and check every field. Returns { values, errors }.
 */
function readAddProductForm() {
  const errors = [];

  // .value is what was typed; .trim() removes extra spaces.
  const nameInput = document.getElementById('new-product-name');
  const categoryInput = document.getElementById('new-product-category');
  const descriptionInput = document.getElementById('new-product-description');
  const priceInput = document.getElementById('new-product-price');

  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const description = descriptionInput.value.trim();
  const priceText = priceInput.value.trim();
  const price = Number(priceText);

  if (name === '') {
    errors.push({ inputs: [nameInput], errorId: 'new-product-name-error', message: 'Please enter a product name.' });
  }

  // The category must be one of our four known ids.
  if (!CATEGORY_NAMES[category]) {
    errors.push({ inputs: [categoryInput], errorId: 'new-product-category-error', message: 'Please choose a category.' });
  }

  if (description === '') {
    errors.push({ inputs: [descriptionInput], errorId: 'new-product-description-error', message: 'Please enter a short description.' });
  }

  // Number.isFinite() is false for text that isn't a number.
  if (priceText === '') {
    errors.push({ inputs: [priceInput], errorId: 'new-product-price-error', message: 'Please enter a price as a number, like 199.99.' });
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.push({ inputs: [priceInput], errorId: 'new-product-price-error', message: 'Price must be greater than 0.' });
  }

  // The three specifications: a "for" loop runs for i = 1, 2, 3.
  const specs = [];
  for (let i = 1; i <= 3; i++) {
    const labelInput = document.getElementById('new-spec-' + i + '-label');
    const valueInput = document.getElementById('new-spec-' + i + '-value');
    const label = labelInput.value.trim();
    const value = valueInput.value.trim();

    if (label === '' || value === '') {
      const emptyInputs = [];
      if (label === '') emptyInputs.push(labelInput);
      if (value === '') emptyInputs.push(valueInput);
      errors.push({ inputs: emptyInputs, errorId: 'new-spec-' + i + '-error', message: 'Please enter a name and a value for spec ' + i + '.' });
    }

    specs.push({ label: label, value: value });
  }

  return {
    values: {
      name: name,
      category: category,
      description: description,
      price: Math.round(price * 100) / 100, // keep 2 decimal places
      specs: specs
    },
    errors: errors
  };
}

function initAddProductForm() {
  const form = document.getElementById('add-product-form');
  if (!form) {
    return; // not the Products page
  }
  const message = document.getElementById('add-product-message');

  // "submit" fires when the submit button is clicked or Enter is
  // pressed in a field.
  form.addEventListener('submit', function (event) {
    // Stop the browser from sending the form and reloading the page.
    event.preventDefault();

    clearFormErrors(form);
    const result = readAddProductForm();

    if (result.errors.length > 0) {
      showFormErrors(result.errors);
      setFormMessage(message, 'Please fix the highlighted fields and try again.', 'error');
      return;
    }

    // Everything is valid: create the new product object.
    const newProduct = {
      id: nextProductId,
      name: result.values.name,
      category: result.values.category,
      description: result.values.description,
      price: result.values.price,
      specs: result.values.specs
    };
    nextProductId++; // the next product gets a different id

    // push() adds the item to the END of the array...
    products.push(newProduct);
    // ...saveProducts() stores the whole array in localStorage, so the
    // new product is still there after a reload and on the Home page...
    const wasSaved = saveProducts();
    // ...and re-rendering shows it straight away.
    renderProducts();
    form.reset();

    // If the current search or category hides the new product,
    // say so – otherwise it could look like nothing happened.
    // some() is true if at least one item matches.
    const isShown = getVisibleProducts().some(function (product) {
      return product.id === newProduct.id;
    });
    let text = newProduct.name + ' was added to ' + CATEGORY_NAMES[newProduct.category] + '.';
    if (!isShown) {
      text += ' It is hidden by your current search or filters – select Clear Filters, or choose "All" and clear the search box, to see it.';
    }
    if (!wasSaved) {
      text += ' It could not be saved in this browser, so it will disappear when you leave the page.';
    }
    setFormMessage(message, text, 'success');
  });

  clearInvalidOnInput(form);
}


/* ==============================================================
   10. CONTACT PAGE: CONTACT FORM
   --------------------------------------------------------------
   Checks every field and shows specific error messages.
   This site has no server (back end), so messages are NOT sent –
   the confirmation says so honestly.
   ============================================================== */

/**
 * Read and check the contact form. Returns { values, errors }.
 */
function readContactForm() {
  const errors = [];

  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const subjectInput = document.getElementById('contact-subject');
  const messageInput = document.getElementById('contact-message');

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const subject = subjectInput.value.trim();
  const message = messageInput.value.trim();

  // Name
  if (name === '') {
    errors.push({ inputs: [nameInput], errorId: 'contact-name-error', message: 'Please enter your name.' });
  } else if (name.length < 2) {
    errors.push({ inputs: [nameInput], errorId: 'contact-name-error', message: 'Your name should be at least 2 characters long.' });
  }

  // Email – test() checks the text against the pattern.
  if (email === '') {
    errors.push({ inputs: [emailInput], errorId: 'contact-email-error', message: 'Please enter your email address.' });
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({ inputs: [emailInput], errorId: 'contact-email-error', message: 'Please enter a valid email address, like name@example.com.' });
  }

  // Subject
  if (subject === '') {
    errors.push({ inputs: [subjectInput], errorId: 'contact-subject-error', message: 'Please enter a subject.' });
  }

  // Message
  if (message === '') {
    errors.push({ inputs: [messageInput], errorId: 'contact-message-error', message: 'Please enter a message.' });
  } else if (message.length < 10) {
    errors.push({ inputs: [messageInput], errorId: 'contact-message-error', message: 'Your message is a little short – please write at least 10 characters.' });
  }

  return {
    values: { name: name, email: email, subject: subject, message: message },
    errors: errors
  };
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) {
    return; // not the Contact page
  }
  const formMessage = document.getElementById('contact-form-message');

  form.addEventListener('submit', function (event) {
    event.preventDefault(); // no reload – we handle it here

    clearFormErrors(form);
    const result = readContactForm();

    if (result.errors.length > 0) {
      showFormErrors(result.errors);
      setFormMessage(formMessage, 'Please fix the highlighted fields and try again.', 'error');
      return;
    }

    // Valid! Be clear that nothing was actually sent.
    setFormMessage(
      formMessage,
      'Thanks, ' + result.values.name + '! Your message passed all checks. ' +
      'This demo site isn\'t connected to an email server yet, so your message has not been sent.',
      'success'
    );
    form.reset();
  });

  clearInvalidOnInput(form);
}


/* ==============================================================
   11. HOME PAGE: NEWSLETTER FORM
   --------------------------------------------------------------
   Checks the email address. Sign-up isn't connected to a service
   yet, so nothing is saved or sent – and the message says so.
   ============================================================== */
function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) {
    return; // not the Home page
  }
  const emailInput = document.getElementById('newsletter-email');
  const message = document.getElementById('newsletter-message');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const email = emailInput.value.trim();

    if (email === '' || !EMAIL_PATTERN.test(email)) {
      emailInput.setAttribute('aria-invalid', 'true');
      emailInput.focus();
      setFormMessage(
        message,
        email === '' ? 'Please enter your email address.' : 'Please enter a valid email address, like name@example.com.',
        'error'
      );
      return;
    }

    emailInput.removeAttribute('aria-invalid');
    setFormMessage(
      message,
      'Thanks! Your email address looks good, but newsletter sign-up isn\'t connected yet on this demo site, so it wasn\'t saved or sent.',
      'success'
    );
    form.reset();
  });

  clearInvalidOnInput(form);
}


/* ==============================================================
   12. KEYBOARD SHORTCUTS (all pages)
   --------------------------------------------------------------
   Home   → smoothly scroll to the top of the page
   End    → smoothly scroll to the bottom of the page
   Escape → close every open product specification

   Skipped while typing in a form field, and when Ctrl, Alt,
   Shift, or Meta is held (so browser shortcuts keep working).
   ============================================================== */

/**
 * Is the visitor typing somewhere right now?
 */
function isTypingTarget(element) {
  if (!element) {
    return false;
  }
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}

/**
 * Has the visitor asked their device for less motion?
 * matchMedia() checks a CSS media query from JavaScript.
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll to a vertical position: smooth, or an instant jump when
 * reduced motion is on (techgear-styles.css also turns smooth scrolling off).
 */
function scrollPageTo(top) {
  window.scrollTo({
    top: top,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth'
  });
}

function initKeyboardShortcuts() {
  // "keydown" fires when a key is pressed. Listening on the document
  // catches keys no matter which element has focus.
  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
      return;
    }
    if (isTypingTarget(event.target)) {
      return;
    }

    // event.key is the name of the pressed key.
    if (event.key === 'Home') {
      event.preventDefault(); // replace the browser's instant jump
      scrollPageTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollPageTo(document.documentElement.scrollHeight);
    } else if (event.key === 'Escape') {
      // Only cancel Escape's default behaviour if we closed something.
      if (closeAllSpecs()) {
        event.preventDefault();
      }
    }
  });
}


/* ==============================================================
   13. FOOTER YEAR (all pages)
   Keeps the copyright year current automatically.
   ============================================================== */
function updateFooterYear() {
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}


/* ==============================================================
   14. SCROLL REVEAL ANIMATIONS (all pages)
   --------------------------------------------------------------
   Sections (and the About page's value cards and steps) fade in
   and slide up slightly as they scroll into view.

   IntersectionObserver is a built-in browser tool that tells us
   when an element enters the visible screen – much more efficient
   than checking positions on every scroll event.

   - Each element animates only ONCE (we stop watching it after).
   - Sections already on screen when the page loads are left alone,
     so nothing at the top of the page blinks or hides.
   - Skipped completely for reduced-motion users and in very old
     browsers, so content is always visible.
   ============================================================== */

// How long the reveal transition takes (matches techgear-styles.css 16b).
const REVEAL_MS = 700;

function initScrollReveal() {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    return;
  }

  const targets = document.querySelectorAll(
    'main > section:not(.hero):not(.page-hero), .info-card, .steps li'
  );

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) {
        return; // not on screen yet
      }

      const element = entry.target;
      element.classList.add('is-visible'); // starts the CSS transition
      observer.unobserve(element);         // animate only once

      // When the animation is done, remove the helper classes so the
      // element's normal transitions (like hover effects) apply again.
      const delay = parseInt(element.style.getPropertyValue('--reveal-delay'), 10) || 0;
      setTimeout(function () {
        element.classList.remove('reveal', 'is-visible');
        element.style.removeProperty('--reveal-delay');
      }, REVEAL_MS + delay + 50);
    });
  }, {
    threshold: 0,                      // as soon as any part is visible...
    rootMargin: '0px 0px -10% 0px'     // ...and it's a little way up the screen
  });

  targets.forEach(function (element) {
    // Leave anything already on screen alone (no flash on page load).
    if (element.getBoundingClientRect().top < window.innerHeight) {
      return;
    }

    // Items in a row (value cards, steps) appear one after another:
    // the 2nd waits 100ms, the 3rd 200ms, and so on.
    if (element.matches('.info-card, .steps li')) {
      const position = Array.prototype.indexOf.call(element.parentElement.children, element);
      element.style.setProperty('--reveal-delay', position * 100 + 'ms');
    }

    element.classList.add('reveal'); // hidden until it scrolls into view
    observer.observe(element);
  });
}


/* ==============================================================
   15. ROTATING PHRASE (all pages)
   --------------------------------------------------------------
   Under each page heading, a short electric-blue line cycles
   through four phrases. Each page lists its own phrases in the
   HTML, in data-phrases="Phrase one|Phrase two|...", so this one
   function works on every page without changes.

   How it works:
   - setInterval() runs a function again and again, every 3 seconds.
   - Each time, we add .is-hidden (CSS fades the phrase out), wait
     for the fade to finish, change the text, and remove .is-hidden
     (CSS fades the new phrase in).
   - A Pause/Play button lets visitors stop the movement.
   - The rotation pauses while the browser tab is hidden, and never
     starts for visitors who prefer reduced motion (they simply see
     the first phrase).
   ============================================================== */

const ROTATE_EVERY_MS = 3000; // show each phrase for 3 seconds
const PHRASE_FADE_MS = 400;   // matches the CSS transition on .rotating-phrase

/**
 * Start rotating ONE .rotating-text element.
 */
function setUpRotatingText(container) {
  // PREVENT DUPLICATE INTERVALS: mark the element once it's set up.
  // If this function were ever called again for the same element,
  // it stops here instead of starting a second interval.
  if (container.dataset.rotationReady === 'true') {
    return;
  }
  container.dataset.rotationReady = 'true';

  // "A|B|C|D" → ['A', 'B', 'C', 'D']. split() breaks text apart at
  // each "|"; trim() removes spaces; filter() drops empty pieces.
  const phrases = (container.dataset.phrases || '')
    .split('|')
    .map(function (phrase) { return phrase.trim(); })
    .filter(function (phrase) { return phrase !== ''; });

  const phraseElement = container.querySelector('.rotating-phrase');
  const toggleButton = container.parentElement.querySelector('.rotation-toggle');

  // Nothing to rotate, or the visitor prefers less motion: keep the
  // first phrase on screen and stop here.
  if (!phraseElement || phrases.length < 2 || prefersReducedMotion()) {
    return;
  }

  let currentIndex = 0;
  let intervalId = null;      // the id setInterval() gives us, or null
  let pausedByVisitor = false;

  // Fade out → change text → fade in.
  function showNextPhrase() {
    phraseElement.classList.add('is-hidden');

    setTimeout(function () {
      // % (remainder) wraps around: after the last phrase, back to 0.
      currentIndex = (currentIndex + 1) % phrases.length;
      phraseElement.textContent = phrases[currentIndex];
      phraseElement.classList.remove('is-hidden');
    }, PHRASE_FADE_MS);
  }

  function startRotation() {
    // Only one interval at a time, and never while paused by the visitor.
    if (intervalId !== null || pausedByVisitor) {
      return;
    }
    intervalId = setInterval(showNextPhrase, ROTATE_EVERY_MS);
  }

  function stopRotation() {
    clearInterval(intervalId); // cancels the repeating timer
    intervalId = null;
  }

  // ---- Pause / Play button ----
  if (toggleButton) {
    toggleButton.hidden = false; // only useful once rotation is running

    toggleButton.addEventListener('click', function () {
      pausedByVisitor = !pausedByVisitor; // flip true ↔ false

      if (pausedByVisitor) {
        stopRotation();
        toggleButton.textContent = 'Play';
        toggleButton.setAttribute('aria-label', 'Play rotating phrases');
      } else {
        toggleButton.textContent = 'Pause';
        toggleButton.setAttribute('aria-label', 'Pause rotating phrases');
        startRotation();
      }
    });
  }

  // ---- Pause while the tab is in the background ----
  // "visibilitychange" fires when the visitor switches tabs.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopRotation();
    } else {
      startRotation(); // does nothing if the visitor paused it
    }
  });

  startRotation();
}

function initRotatingText() {
  // Each page has one rotating line, but this works for any number.
  document.querySelectorAll('.rotating-text').forEach(setUpRotatingText);
}


/* ==============================================================
   15b. KEEPING PAGES IN SYNC
   --------------------------------------------------------------
   Each page reads the latest saved data when it loads, so moving
   between Home and Products always shows the same favorites and
   products. Two extra cases are handled here:
   - "pageshow" with event.persisted: the browser's Back/Forward
     button can show a page from memory WITHOUT reloading it, so we
     re-read localStorage to pick up changes made on the other page.
   - "storage": fires when ANOTHER open tab of this site changes
     localStorage, so both tabs stay in step.
   ============================================================== */
function refreshFromStorage() {
  // Replace the contents of the products array with the saved list.
  // splice(0, length, ...items) swaps everything in one step.
  const latestProducts = loadProducts({ quiet: true });
  products.splice(0, products.length, ...latestProducts);

  favorites = loadFavorites({ quiet: true });
  nextProductId = getNextProductId();

  // Re-draw whatever this page shows (each function checks its page).
  renderFeaturedPreview();
  updateFavoritesFilterButton();
  renderProducts();
}

function initStorageSync() {
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      refreshFromStorage();
    }
  });

  window.addEventListener('storage', function (event) {
    // event.key is the key that changed (null if storage was cleared).
    if (event.key === PRODUCTS_STORAGE_KEY || event.key === FAVORITES_STORAGE_KEY || event.key === null) {
      refreshFromStorage();
    }
  });
}


/* ==============================================================
   16. START-UP
   --------------------------------------------------------------
   techgear-main.js is loaded with "defer", so the HTML is ready when this
   runs. Each function is called ONCE, so no listener is added
   twice. Functions for features that aren't on this page simply
   return without doing anything.
   ============================================================== */
initThemeToggle();       // every page
initSpecsToggles();      // any page with product cards
initFavorites();         // any page with product cards
initStorageSync();       // every page (keeps saved data in step)
initKeyboardShortcuts(); // every page
updateFooterYear();      // every page
renderFeaturedPreview(); // Home page
initNewsletterForm();    // Home page
initProductCatalog();    // Products page (search, filters, sort, delete)
initAddProductForm();    // Products page
initContactForm();       // Contact page
initScrollReveal();      // every page (after the products are drawn)
initRotatingText();      // every page
