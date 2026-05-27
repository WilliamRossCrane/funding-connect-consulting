import {
  renderGrantsCarousel,
  renderGrantsLoadingCard,
} from "../components/grants-carousel.js";

var GRANTS_PATH = "./data/grants.json";
var GRANTS_TRACK_SELECTOR = "#grantCards";
var GRANTS_SHELL_SELECTOR = "#grantsTrackWrap";
var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
var MAX_GRANTS = 6;
var FALLBACK_MESSAGE =
  "Grant opportunities could not be loaded. Please check back soon.";
var GRANTS_FETCH_TIMEOUT = 5000; // ms - fallback if grants fetch is slow
var grantsCleanup = null;

function escapeHtml(value) {
  if (window.FundingConnectComponents?.escapeHtml) {
    return window.FundingConnectComponents.escapeHtml(value || "");
  }

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripGoId(title) {
  return normalizeWhitespace(title)
    .replace(/^GO\d+\s*:\s*/i, "")
    .trim();
}

function formatCloseDate(grant) {
  if (grant.closeDateText) {
    return grant.closeDateText;
  }

  if (grant.closeDate) {
    var parsed;
    var dateOnlyMatch = normalizeWhitespace(grant.closeDate).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (dateOnlyMatch) {
      parsed = new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      );
    } else {
      parsed = new Date(grant.closeDate);
    }

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  return "Check official page";
}

function inferCategory(grant) {
  var explicitCategory = normalizeWhitespace(grant.category);

  if (explicitCategory) {
    return explicitCategory;
  }

  var text = [grant.title, grant.summary].join(" ").toLowerCase();
  var categoryRules = [
    {
      label: "Indigenous Programs",
      match: /indigenous|aboriginal|torres strait|first nations/,
    },
    {
      label: "Community Development",
      match: /community|capacity building|social support/,
    },
    {
      label: "Small Business",
      match: /small business|business|enterprise|economic/,
    },
    { label: "Arts & Culture", match: /arts|culture|museum|heritage/ },
    { label: "Regional Support", match: /regional|remote|queensland/ },
    {
      label: "Health & Wellbeing",
      match: /health|healing|wellbeing|mental health/,
    },
    { label: "Education & Training", match: /education|training|school|youth/ },
    {
      label: "Multicultural Communities",
      match: /multicultural|diverse|diaspora/,
    },
  ];

  for (var i = 0; i < categoryRules.length; i += 1) {
    if (categoryRules[i].match.test(text)) {
      return categoryRules[i].label;
    }
  }

  return "Grant Opportunity";
}

function inferFundingAmount(grant) {
  if (normalizeWhitespace(grant.amount)) {
    return normalizeWhitespace(grant.amount);
  }

  var text = normalizeWhitespace(grant.summary || "");
  var patterns = [
    /\bup to \$[\d,.]+(?:\s*(?:million|billion|thousand))?\b/i,
    /\bfrom \$[\d,.]+(?:\s*(?:million|billion|thousand))?\s+to \$[\d,.]+(?:\s*(?:million|billion|thousand))?\b/i,
    /\$\s?[\d,.]+(?:\s*(?:million|billion|thousand))?\s*(?:-|to)\s*\$?\s?[\d,.]+(?:\s*(?:million|billion|thousand))?\b/i,
    /\btotal funding of up to \$[\d,.]+(?:\s*(?:million|billion|thousand))?\b/i,
    /\bgrants? (?:between|from) \$[\d,.]+(?:\s*(?:million|billion|thousand))?\s+(?:and|to)\s+\$[\d,.]+(?:\s*(?:million|billion|thousand))?\b/i,
  ];

  for (var i = 0; i < patterns.length; i += 1) {
    var match = text.match(patterns[i]);

    if (match) {
      return match[0].replace(/\s+/g, " ").trim();
    }
  }

  return "Funding available";
}

function renderCardMeta(grant) {
  var category = inferCategory(grant);
  var source = normalizeWhitespace(grant.source);

  if (!source) {
    return category;
  }

  return category + " • " + source;
}

function hasUsableLink(grant) {
  return /^https?:\/\//i.test(normalizeWhitespace(grant.link));
}

function renderGrantCard(grant, options) {
  var config = options || {};
  var title = stripGoId(grant.title) || "Grant opportunity";
  var isLinked = hasUsableLink(grant);
  var link = isLinked ? grant.link : "#";
  var tagName = isLinked ? "a" : "article";
  var cloneTabIndex = config.isClone && isLinked ? ' tabindex="-1"' : "";
  var cardAttributes = isLinked
    ? ' class="grant-card grant-card-link" role="listitem" href="' +
      escapeHtml(link) +
      '" target="_blank" rel="noopener noreferrer" aria-label="View official grant: ' +
      escapeHtml(title) +
      '"' +
      cloneTabIndex
    : ' class="grant-card grant-card-fallback" role="listitem"';

  return [
    "<" + tagName + cardAttributes + ">",
    '  <p class="grant-cat">' + escapeHtml(renderCardMeta(grant)) + "</p>",
    '  <h3 class="grant-title">' + escapeHtml(title) + "</h3>",
    '  <p class="grant-amount">' +
      escapeHtml(inferFundingAmount(grant)) +
      "</p>",
    '  <p class="grant-close">Closes: ' +
      escapeHtml(formatCloseDate(grant)) +
      "</p>",
    isLinked ? '  <span class="grant-link">View official grant</span>' : "",
    "</" + tagName + ">",
  ].join("\n");
}

function renderFallback(message) {
  return [
    '<article class="grant-card grant-card-fallback" role="listitem">',
    '  <p class="grant-cat">Grant Updates</p>',
    '  <h3 class="grant-title">Recent Grant Opportunities</h3>',
    '  <p class="grant-close">' + escapeHtml(message) + "</p>",
    "</article>",
  ].join("\n");
}

function renderGrantCardSet(grants, options) {
  var config = options || {};
  var groupClassName =
    "grants-carousel-group" +
    (config.isClone ? " grants-carousel-group--clone" : "");
  var groupAttributes = config.isClone
    ? ' class="' + groupClassName + '" aria-hidden="true" data-clone="true"'
    : ' class="' + groupClassName + '" role="list"';

  return [
    "<div" + groupAttributes + ">",
    grants
      .map(function (grant) {
        return renderGrantCard(grant, { isClone: !!config.isClone });
      })
      .join("\n"),
    "</div>",
  ].join("\n");
}

function buildGrantTrackHtml(grants) {
  if (grants.length < 2) {
    return renderGrantCardSet(grants);
  }

  return [
    renderGrantCardSet(grants),
    renderGrantCardSet(grants, { isClone: true }),
  ].join("\n");
}

function getCarouselElements() {
  return {
    shell: document.querySelector(GRANTS_SHELL_SELECTOR),
    track: document.querySelector(GRANTS_TRACK_SELECTOR),
  };
}

function resetCarouselMotion() {
  var elements = getCarouselElements();

  if (!elements.track || !elements.shell) {
    return;
  }

  elements.track.classList.remove("is-marquee-active");
  elements.track.style.removeProperty("--grants-loop-distance");
  elements.track.style.removeProperty("--grants-marquee-duration");
}

function setTrackHtml(html, options) {
  var elements = getCarouselElements();
  var track = elements.track;
  var shell = elements.shell;
  var config = options || {};

  if (!track) {
    return false;
  }

  resetCarouselMotion();
  track.setAttribute("aria-busy", config.busy ? "true" : "false");
  track.innerHTML = html;

  if (shell) {
    shell.scrollLeft = 0;
  }

  return true;
}

function showLoadingCard() {
  setTrackHtml(renderGrantsLoadingCard(), { busy: true });
}

async function loadGrants() {
  var response = await fetch(GRANTS_PATH, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Grant data request failed with status " + response.status);
  }

  return response.json();
}

function waitForNextFrame() {
  return new Promise(function (resolve) {
    window.requestAnimationFrame(function () {
      resolve();
    });
  });
}

function setupMarquee(grantCount) {
  var elements = getCarouselElements();
  var shell = elements.shell;
  var track = elements.track;
  var firstGroup = track?.querySelector(".grants-carousel-group");
  var reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

  if (!shell || !track || !firstGroup || grantCount < 2) {
    resetCarouselMotion();
    return function () {};
  }

  function applyMarqueeState() {
    var shouldAnimate = !reducedMotionQuery.matches;

    track.classList.toggle("is-marquee-active", shouldAnimate);

    if (!shouldAnimate) {
      track.style.removeProperty("--grants-loop-distance");
      track.style.removeProperty("--grants-marquee-duration");
      return;
    }

    var trackStyles = window.getComputedStyle(track);
    var trackGap = parseFloat(trackStyles.columnGap || trackStyles.gap) || 0;
    var loopDistance = Math.ceil(
      firstGroup.getBoundingClientRect().width + trackGap
    );
    var durationSeconds = Math.max(35, Math.min(60, grantCount * 7));

    track.style.setProperty("--grants-loop-distance", loopDistance + "px");
    track.style.setProperty("--grants-marquee-duration", durationSeconds + "s");
  }

  applyMarqueeState();
  window.addEventListener("resize", applyMarqueeState);

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", applyMarqueeState);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(applyMarqueeState).catch(function () {});
  }

  return function cleanupMarquee() {
    window.removeEventListener("resize", applyMarqueeState);

    if (typeof reducedMotionQuery.removeEventListener === "function") {
      reducedMotionQuery.removeEventListener("change", applyMarqueeState);
    }

    resetCarouselMotion();
  };
}

function setupManualControls(grantCount) {
  var elements = getCarouselElements();
  var shell = elements.shell;
  var track = elements.track;

  if (!shell || !track) return function () {};

  var controlPrev = shell.querySelector('[data-grants-control="prev"]');
  var controlNext = shell.querySelector('[data-grants-control="next"]');
  var cards = Array.from(
    track.querySelectorAll('.grants-carousel-group:not([data-clone]) .grant-card')
  );

  if (!cards.length || cards.length < 2) {
    if (controlPrev) controlPrev.style.display = "none";
    if (controlNext) controlNext.style.display = "none";
    return function () {};
  }

  if (controlPrev) controlPrev.style.display = "";
  if (controlNext) controlNext.style.display = "";

  var currentIndex = 0;

  function focusCard(idx) {
    currentIndex = ((idx % cards.length) + cards.length) % cards.length;
    var c = cards[currentIndex];
    if (c && typeof c.focus === "function") {
      c.focus();
      c.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  function onNext(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    focusCard(currentIndex + 1);
  }

  function onPrev(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    focusCard(currentIndex - 1);
  }

  controlNext && controlNext.addEventListener("click", onNext);
  controlPrev && controlPrev.addEventListener("click", onPrev);

  function onKey(e) {
    if (e.key === "ArrowRight") onNext();
    if (e.key === "ArrowLeft") onPrev();
  }

  shell.addEventListener("keydown", onKey);

  return function cleanupControls() {
    controlNext && controlNext.removeEventListener("click", onNext);
    controlPrev && controlPrev.removeEventListener("click", onPrev);
    shell.removeEventListener("keydown", onKey);
  };
}

export async function initGrants() {
  var elements = getCarouselElements();

  if (!elements.track) {
    renderGrantsCarousel();
    elements = getCarouselElements();
  }

  if (!elements.track) {
    console.error(
      "Unable to initialise grants carousel: #grantCards was not found in the homepage markup."
    );
    return;
  }

  if (typeof grantsCleanup === "function") {
    grantsCleanup();
    grantsCleanup = null;
  }

  showLoadingCard();

  try {
    // Race the grants fetch against a short timeout so slow responses don't
    // block the page or leave the loading card visible forever.
    var payload = await Promise.race([
      loadGrants(),
      new Promise(function (resolve) {
        window.setTimeout(function () {
          resolve({ __timedout: true });
        }, GRANTS_FETCH_TIMEOUT);
      }),
    ]);

    if (payload && payload.__timedout) {
      console.warn("Grants fetch timed out — showing fallback message.");
      setTrackHtml(renderFallback("Grant data is taking longer than expected."), { busy: false });
      // Do not block rendering; return early. If the fetch resolves later it
      // will not overwrite the UI.
      return;
    }

    if (!Array.isArray(payload?.grants)) {
      console.error(
        "Unable to render grants carousel: ./data/grants.json is missing a valid grants array.",
        payload
      );
      setTrackHtml(renderFallback(FALLBACK_MESSAGE), { busy: false });
      return;
    }

    var grants = payload.grants.slice(0, MAX_GRANTS);

    if (!grants.length) {
      console.error(
        "Unable to render grants carousel: ./data/grants.json contains zero grants."
      );
      setTrackHtml(renderFallback(FALLBACK_MESSAGE), { busy: false });
      return;
    }

    setTrackHtml(buildGrantTrackHtml(grants), { busy: false });
    await waitForNextFrame();
    await waitForNextFrame();
    var cleanupMarquee = setupMarquee(grants.length);
    var cleanupControls = setupManualControls(grants.length);
    grantsCleanup = function () {
      try {
        cleanupMarquee && cleanupMarquee();
      } catch (e) {}
      try {
        cleanupControls && cleanupControls();
      } catch (e) {}
    };
  } catch (error) {
    console.error(
      "Unable to load local grants data from ./data/grants.json:",
      error
    );
    setTrackHtml(renderFallback(FALLBACK_MESSAGE), { busy: false });
  }
}
