// Schema check for a marketing page's `sections:` list (recommendation §4.1a).
// Same fail-loudly convention as frontmatter.mjs / nav.mjs — throws an Error naming the page
// file AND the offending entry (index + type) so a bad page fails `node build.mjs` with exit 1.

export const SECTION_TYPES = [
  'hero',
  'featureGrid',
  'testimonial',
  'pricingTable',
  'ctaBanner',
  'logoStrip',
];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isFilled = (value) =>
  value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');

// A `cta` must carry both label and href (checked wherever a cta appears: sections and plans).
function checkCta(cta, fail, where) {
  if (!isObject(cta) || !isFilled(cta.label) || !isFilled(cta.href)) {
    fail(`${where} must have both "label" and "href"`);
  }
}

// Every item of `field` (an array) must be an object carrying each of `required`.
function checkItems(section, field, required, fail) {
  if (!Array.isArray(section[field])) {
    fail(`required field "${field}" must be an array`);
  }
  section[field].forEach((item, i) => {
    if (!isObject(item)) fail(`"${field}[${i}]" must be an object`);
    for (const key of required) {
      if (!isFilled(item[key])) fail(`"${field}[${i}]" is missing required field "${key}"`);
    }
  });
}

const TYPE_CHECKS = {
  hero(section, fail) {
    if (!isFilled(section.heading)) fail('missing required field "heading"');
  },
  featureGrid(section, fail) {
    checkItems(section, 'items', [], fail);
  },
  testimonial(section, fail) {
    checkItems(section, 'items', ['quote', 'author'], fail);
  },
  pricingTable(section, fail) {
    checkItems(section, 'plans', ['name', 'price'], fail);
    section.plans.forEach((plan, i) => {
      if (plan.cta === undefined) fail(`"plans[${i}]" is missing required field "cta"`);
      checkCta(plan.cta, fail, `"plans[${i}].cta"`);
      if (plan.features !== undefined && !Array.isArray(plan.features)) {
        fail(`"plans[${i}].features" must be an array`);
      }
    });
  },
  ctaBanner(section, fail) {
    if (!isFilled(section.heading)) fail('missing required field "heading"');
  },
  logoStrip(section, fail) {
    checkItems(section, 'logos', ['name'], fail);
  },
};

export function validateSections(sections, pagePath) {
  if (sections === undefined) return;
  if (!Array.isArray(sections)) {
    throw new Error(`${pagePath}: "sections" must be an array`);
  }
  sections.forEach((section, index) => {
    const label = isObject(section) ? `sections[${index}] (type: ${section.type})` : `sections[${index}]`;
    const fail = (message) => {
      throw new Error(`${pagePath}: ${label}: ${message}`);
    };
    if (!isObject(section)) fail('must be an object');
    if (!SECTION_TYPES.includes(section.type)) {
      fail(`unknown type "${section.type}" (allowed: ${SECTION_TYPES.join(', ')})`);
    }
    TYPE_CHECKS[section.type](section, fail);
    if (section.cta !== undefined) checkCta(section.cta, fail, '"cta"');
  });
}
