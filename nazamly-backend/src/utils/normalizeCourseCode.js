/**
 * Arabic → Latin course code prefix mapping.
 */
const ARABIC_PREFIX_MAP = {
  'س': 'CS',   // Computer Science — علوم الحاسب
  'ر': 'M',   // Math
  'ع': 'U',   // University
  'ت': 'IT',   // Information Technology
  'ف': 'PH',   // Physics
  'ك': 'CH',   // Chmistry
  'ا': 'IS',   // Islamic Studies
  'ح': 'HC',   // Humanities
};

/**
 * Normalize an Arabic course code to a Latin equivalent.
 * @param {string} raw  e.g. "س411"
 * @returns {string}    e.g. "CS411"
 */
function normalizeCourseCode(raw = '') {
  if (!raw) return raw;

  // Strip right-to-left mark and spaces
  raw = raw.replace(/[\u200f\s]/g, '');

  // Already Latin
  if (/^[A-Za-z]+\d+$/.test(raw)) return raw.toUpperCase();

  // Arabic prefix + digits
  for (const [arPrefix, enPrefix] of Object.entries(ARABIC_PREFIX_MAP)) {
    if (raw.startsWith(arPrefix)) {
      const digits = raw.slice(arPrefix.length);
      if (/^\d+$/.test(digits)) return `${enPrefix}${digits}`;
    }
  }

  return raw;  // Return as-is if no mapping found
}

module.exports = { normalizeCourseCode, ARABIC_PREFIX_MAP };
