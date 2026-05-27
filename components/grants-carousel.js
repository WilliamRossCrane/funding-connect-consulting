/**
 * Grants carousel component.
 */

function fallbackEscapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getEscapeHtml() {
  if (window.FundingConnectComponents?.escapeHtml) {
    return window.FundingConnectComponents.escapeHtml;
  }

  return fallbackEscapeHtml;
}

export function renderGrantsLoadingCard() {
  return [
    '<article class="grant-card grant-card-loading" role="listitem" aria-hidden="true">',
    '  <p class="grant-cat">Grant Updates</p>',
    '  <h3 class="grant-title">Loading recent grant opportunities</h3>',
    '  <p class="grant-amount">Please wait a moment</p>',
    '  <p class="grant-close">Checking the latest local grant data.</p>',
    "</article>",
  ].join("\n");
}

export function renderGrantsCarousel() {
  var placeholder = document.getElementById("grants-carousel-placeholder");

  if (!placeholder) {
    return false;
  }

  var section = window.FCC_CONTENT?.grantsSection || {};
  var escapeHtml = getEscapeHtml();

  placeholder.innerHTML = [
    '<section class="grants-section" aria-labelledby="grants-heading">',
    '  <div class="grants-header">',
    '    <h2 id="grants-heading">' +
      escapeHtml(section.heading || "Recent Grant Opportunities") +
      "</h2>",
    '    <span aria-label="' +
      escapeHtml(
        section.statusAriaLabel || "This section is updated regularly"
      ) +
      '">' +
      escapeHtml(section.status || "Updated regularly") +
      "</span>",
    "  </div>",
    '  <div class="grants-carousel-shell grants-track-wrap" id="grantsTrackWrap" aria-label="' +
      escapeHtml(
        section.trackAriaLabel ||
          "Scrolling grant opportunities - hover or focus to pause"
      ) +
      '">',
    '    <button class="grants-carousel-control grants-carousel-prev" aria-label="Previous grant" data-grants-control="prev"></button>',
    '    <div class="grants-carousel-track grants-track" id="grantCards" aria-live="polite" aria-busy="true">',
    renderGrantsLoadingCard(),
    "    </div>",
    '    <button class="grants-carousel-control grants-carousel-next" aria-label="Next grant" data-grants-control="next"></button>',
    "  </div>",
    '  <p class="grants-disclaimer">Grant information is sourced from GrantConnect, Queensland Government and business.gov.au. Please refer to each official grant page for full eligibility and application details.</p>',
    "</section>",
  ].join("\n");

  return true;
}
