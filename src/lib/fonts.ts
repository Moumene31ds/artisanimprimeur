let fontsLoaded = false;

const OPTIONAL_FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700' +
  '&family=Tajawal:wght@300;400;700;900' +
  '&family=Montserrat:wght@300;400;700;900' +
  '&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700' +
  '&family=Outfit:wght@300;400;700;900&display=swap';

/**
 * Lazy-loads the extra design fonts (Amiri, Tajawal, Montserrat, Playfair,
 * Outfit) that the customizer / AI studio offer as options. Only call this from
 * pages that actually need those fonts — it keeps the global stylesheet free of
 * a render-blocking Google Fonts @import. The <link> is non-blocking.
 */
export function loadOptionalFonts() {
  if (fontsLoaded || typeof document === 'undefined') return;
  fontsLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = OPTIONAL_FONT_CSS;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
}
