import { renderHead, renderAnalytics } from '../../render/head.mjs';
import { renderHeader } from '../shared/Header.mjs';
import { renderFooter } from '../shared/Footer.mjs';

function renderHero(section) {
  const cta = section.cta
    ? `<a class="cta" href="${section.cta.href}">${section.cta.label}</a>`
    : '';
  return `<section class="section hero"${section.animate ? ' data-animate="true"' : ''}>
<div class="container">
<h1 data-pagefind-weight="2" data-pagefind-meta="title">${section.heading || ''}</h1>
${section.subheading ? `<p class="subheading">${section.subheading}</p>\n` : ''}${cta}
</div>
</section>`;
}

function renderFeatureGrid(section) {
  const items = (section.items || [])
    .map(
      (item) =>
        `<div class="feature"><span class="icon">${item.icon || ''}</span><h3>${item.title || ''}</h3><p>${item.body || ''}</p></div>`
    )
    .join('\n');
  const heading = section.heading ? `<h2 class="section-heading">${section.heading}</h2>\n` : '';
  return `<section class="section feature-grid"${section.animate ? ' data-animate="true"' : ''} style="--columns:${section.columns || 3}">
<div class="container">
${heading}${items}
</div>
</section>`;
}

function renderCtaBanner(section) {
  const cta = section.cta
    ? `<a class="cta" href="${section.cta.href}">${section.cta.label}</a>`
    : '';
  return `<section class="section cta-banner"${section.id ? ` id="${section.id}"` : ''}${section.animate ? ' data-animate="true"' : ''}>
<div class="container">
<h2>${section.heading || ''}</h2>
${cta}
</div>
</section>`;
}

function renderTestimonialCard(item) {
  const avatar = item.avatar
    ? `<img class="avatar" src="${item.avatar}" alt="" loading="lazy">`
    : '';
  const role = item.role ? `<span class="role">${item.role}</span>` : '';
  return `<figure class="testimonial"><blockquote><p>${item.quote || ''}</p></blockquote><figcaption>${avatar}<span class="author">${item.author || ''}</span>${role}</figcaption></figure>`;
}

// One item → a single centred quote card. 2+ items → a CSS-only scroll-snap carousel (no JS;
// the focusable track scrolls with the keyboard and degrades to a plain scrollable row).
function renderTestimonial(section) {
  const items = section.items || [];
  const cards = items.map(renderTestimonialCard).join('\n');
  const heading = section.heading ? `<h2 class="section-heading">${section.heading}</h2>\n` : '';
  const body =
    items.length > 1
      ? `<div class="testimonial-track" role="region" aria-label="${section.heading || 'Testimonials'}" tabindex="0">\n${cards}\n</div>`
      : `<div class="testimonial-single">\n${cards}\n</div>`;
  return `<section class="section testimonial-section"${section.animate ? ' data-animate="true"' : ''}>
<div class="container">
${heading}${body}
</div>
</section>`;
}

function renderLogoStrip(section) {
  const logos = (section.logos || [])
    .map((logo) => {
      const mark = logo.src
        ? `<img src="${logo.src}" alt="${logo.name || ''}" loading="lazy">`
        : `<span class="logo-wordmark">${logo.name || ''}</span>`;
      return `<li class="logo-strip-item">${logo.href ? `<a href="${logo.href}">${mark}</a>` : mark}</li>`;
    })
    .join('\n');
  const heading = section.heading ? `<h2 class="section-heading">${section.heading}</h2>\n` : '';
  return `<section class="section logo-strip"${section.animate ? ' data-animate="true"' : ''}>
<div class="container">
${heading}<ul class="logo-strip-list">
${logos}
</ul>
</div>
</section>`;
}

function renderPlan(plan) {
  const period = plan.period ? `<span class="period">${plan.period}</span>` : '';
  const description = plan.description ? `<p class="plan-description">${plan.description}</p>\n` : '';
  const features = (plan.features || []).map((feature) => `<li>${feature}</li>`).join('\n');
  const cta = plan.cta ? `<a class="cta" href="${plan.cta.href}">${plan.cta.label}</a>` : '';
  return `<div class="${plan.highlighted ? 'plan plan-highlighted' : 'plan'}">
<h3>${plan.name || ''}</h3>
<p class="plan-price"><span class="price">${plan.price || ''}</span>${period}</p>
${description}<ul class="plan-features">
${features}
</ul>
${cta}
</div>`;
}

function renderPricingTable(section) {
  const plans = (section.plans || []).map(renderPlan).join('\n');
  const heading = section.heading ? `<h2 class="section-heading">${section.heading}</h2>\n` : '';
  return `<section class="section pricing-table"${section.animate ? ' data-animate="true"' : ''}>
<div class="container">
${heading}<div class="plans">
${plans}
</div>
</div>
</section>`;
}

const SECTION_RENDERERS = {
  hero: renderHero,
  featureGrid: renderFeatureGrid,
  testimonial: renderTestimonial,
  pricingTable: renderPricingTable,
  ctaBanner: renderCtaBanner,
  logoStrip: renderLogoStrip,
};

export function renderMarketingPage({
  title = '',
  description = '',
  sections = [],
  contentHtml = '',
  urlPath = '/',
}) {
  const body = sections
    .map((section) => {
      const renderer = SECTION_RENDERERS[section.type];
      return renderer ? renderer(section) : `<!-- unknown section type: ${section.type} -->`;
    })
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${renderHead({ title, description, urlPath, ogType: 'website' })}
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
<link rel="stylesheet" href="/styles/marketing.css">
${renderAnalytics()}
</head>
<body class="marketing">
${renderHeader({ urlPath })}
<main data-pagefind-body data-pagefind-meta="type:Pages">
${body}
${contentHtml}
</main>
${renderFooter()}
<script defer src="/scripts/reveal.js"></script>
<script defer src="/scripts/search.js"></script>
</body>
</html>
`;
}
