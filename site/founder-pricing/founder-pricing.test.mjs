import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import founderPricingContent from "./content.js";
import renderModule from "./render.js";

const { renderFounderPricingHtml } = renderModule;

test("build:founder-pricing emits a publishable HTML document", () => {
  const { directHtml, html } = buildHtml();
  const { counts, facts, meta, slides } = founderPricingContent;
  const requiredPhrases = [
    "Solo, $79 / month",
    "Team, $50 / seat / month",
    "3-seat minimum",
    "120 live minutes per seat",
    "250 minutes for $125",
    "500 minutes for $175",
    "2,000 minutes for $600",
    "Verified: April 23, 2026",
    "Official Vendor Cost Stack",
    "Monthly vs Annual Billing Economics",
    "Appendix",
  ];
  const requiredFactKeys = [
    "seatPrice",
    "seatMinimum",
    "voiceAllowance",
    "vendorStack",
    "verificationDate",
    "publishedPath",
  ];
  const requiredVendorNames = ["OpenAI", "Vercel", "Supabase", "Fly.io"];

  assert.match(html, /<!DOCTYPE html>/);
  assert.equal(html, directHtml);
  assert.match(html, /Founder Pricing &amp; COGS/);
  assert.match(html, /#0b0e14/);
  assert.match(html, /Space Grotesk/);
  assert.match(html, /Source Sans 3/);
  assert.match(html, /id="deck-view"/);
  assert.match(html, /data-mode="deck"/);
  assert.doesNotMatch(html, /id="memo-view"/);
  assert.doesNotMatch(html, /data-mode="memo"/);
  assert.match(html, /class FounderPricingController/);
  assert.match(html, /data-nav="next"/);
  assert.match(html, /data-nav="prev"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /prefers-reduced-motion/);
  for (const phrase of requiredPhrases) {
    assert.match(html, new RegExp(escapeRegExp(phrase)));
  }
  assert.match(html, new RegExp(`data-content-slides="${counts.slides}"`));
  assert.match(html, new RegExp(`data-content-facts="${counts.facts}"`));

  assert.equal((html.match(/data-slide-id="/g) ?? []).length, slides.length);

  for (const slide of slides) {
    assert.match(html, new RegExp(`data-slide-id="${slide.id}"`));
    assert.match(html, new RegExp(`data-fact-ids="${slide.factIds.join(" ")}"`));
  }

  for (const fact of Object.values(facts)) {
    assert.match(html, new RegExp(`data-fact-key="${fact.id}"`));
  }

  assert.match(html, new RegExp(escapeRegExp(meta.verificationDate)));
  assert.match(html, new RegExp(escapeRegExp(meta.publishedPath)));
  for (const factKey of requiredFactKeys) {
    assert.match(html, new RegExp(`data-fact-key="${factKey}"`));
  }
  for (const vendorName of requiredVendorNames) {
    assert.match(html, new RegExp(escapeRegExp(vendorName)));
  }
});

test("founder pricing controller drives the single deck flow and appendix navigation", () => {
  const { html } = buildHtml();
  const { elements, windowObject } = createControllerHarness();
  const script = extractInlineScript(html);
  const context = {
    console,
    document: elements.document,
    window: windowObject,
  };

  context.globalThis = context;

  vm.runInNewContext(script, context);
  windowObject.dispatch("DOMContentLoaded");

  assert.ok(
    windowObject.__founderPricingController,
    "expected the controller to initialize without memo-mode internals; the old implementation still depends on memo-view",
  );
  assert.equal(windowObject.__founderPricingController.mode, "deck");
  assert.equal(elements.prevButton.disabled, true);
  assert.equal(elements.nextButton.disabled, false);

  elements.nextButton.emit("click");
  assert.equal(windowObject.location.hash, "#slide-included-usage");

  elements.appendixLink.emit("click");
  assert.equal(windowObject.location.hash, "#slide-appendix-rate-card");
  assert.equal(windowObject.__founderPricingController.index, 9);
});

test("github pages workflow exists for founder pricing site", () => {
  const workflowFile = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    ".github",
    "workflows",
    "founder-pricing-pages.yml",
  );

  assert.equal(existsSync(workflowFile), true);
  const workflow = readFileSync(workflowFile, "utf8");

  assert.match(workflow, /package-lock\.json/);
  assert.match(workflow, /npm run test:founder-pricing/);
  assert.match(workflow, /npm run build:founder-pricing/);
  assert.match(workflow, /path:\s+dist\b/);
});

function buildHtml() {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(testDir, "..", "..");
  const outDir = path.join(repoRoot, "dist/founder-pricing");
  const outFile = path.join(outDir, "index.html");

  rmSync(outDir, { recursive: true, force: true });

  execFileSync("npm", ["run", "build:founder-pricing"], {
    cwd: repoRoot,
    stdio: "pipe",
  });

  return {
    directHtml: renderFounderPricingHtml(founderPricingContent),
    html: readFileSync(outFile, "utf8"),
  };
}

function extractInlineScript(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);

  assert.ok(match?.[1], "expected controller script in generated html");

  return match[1];
}

function createMockElement({ dataset = {}, hidden = false, id = "" } = {}) {
  return {
    attributes: {},
    dataset: { ...dataset },
    disabled: false,
    hidden,
    id,
    listeners: {},
    scrollIntoViewCalls: [],
    textContent: "",
    addEventListener(type, handler) {
      this.listeners[type] ??= [];
      this.listeners[type].push(handler);
    },
    emit(type, extra = {}) {
      const event = {
        changedTouches: [],
        deltaY: 0,
        key: "",
        preventDefault() {},
        ...extra,
      };

      for (const handler of this.listeners[type] ?? []) {
        handler(event);
      }

      return event;
    },
    scrollIntoView(options) {
      this.scrollIntoViewCalls.push(options);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
}

function createControllerHarness({ initialHash = "" } = {}) {
  const deckView = createMockElement({ id: "deck-view" });
  const slides = Array.from({ length: 10 }, (_, index) =>
    createMockElement({
      id:
        index === 0
          ? "slide-cover"
          : index === 1
            ? "slide-included-usage"
            : index === 9
              ? "slide-appendix-rate-card"
              : `slide-filler-${index + 1}`,
      dataset: {
        active: index === 0 ? "true" : "false",
        slideId:
          index === 0
            ? "cover"
            : index === 1
              ? "included-usage"
              : index === 9
                ? "appendix-rate-card"
                : `filler-${index + 1}`,
      },
      hidden: index !== 0,
    }),
  );
  const deckButton = createMockElement({
    dataset: { active: "true", mode: "deck" },
  });
  const prevButton = createMockElement();
  const nextButton = createMockElement();
  const statusNode = createMockElement();
  const deckLinkOne = createMockElement({
    dataset: { slideTarget: "cover" },
  });
  const deckLinkTwo = createMockElement({
    dataset: { slideTarget: "included-usage" },
  });
  const appendixLink = createMockElement({
    dataset: { appendixTarget: "rate-card" },
  });
  const windowListeners = {};
  const document = {
    getElementById(id) {
      return (
        {
          "deck-view": deckView,
          "slide-appendix-rate-card": slides[9],
          "slide-cover": slides[0],
          "slide-filler-10": slides[9],
          "slide-filler-2": slides[1],
          "slide-included-usage": slides[1],
        }[id] ?? null
      );
    },
    querySelector(selector) {
      return (
        {
          '[data-nav="next"]': nextButton,
          '[data-nav="prev"]': prevButton,
          "[data-slide-status]": statusNode,
        }[selector] ?? null
      );
    },
    querySelectorAll(selector) {
      return (
        {
          ".mode-button[data-mode]": [deckButton],
          ".slide": slides,
          "[data-appendix-target]": [appendixLink],
          "[data-slide-target]": [deckLinkOne, deckLinkTwo],
        }[selector] ?? []
      );
    },
  };
  const windowObject = {
    __founderPricingController: null,
    history: {
      replaceState(_state, _title, hash) {
        windowObject.location.hash = hash;
      },
    },
    location: { hash: initialHash },
    addEventListener(type, handler) {
      windowListeners[type] ??= [];
      windowListeners[type].push(handler);
    },
    dispatch(type, extra = {}) {
      const event = {
        changedTouches: [],
        deltaY: 0,
        key: "",
        preventDefault() {},
        ...extra,
      };

      for (const handler of windowListeners[type] ?? []) {
        handler(event);
      }

      return event;
    },
    matchMedia() {
      return { matches: false };
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
  };

  return {
    elements: {
      appendixLink,
      deckButton,
      deckLinks: [deckLinkOne, deckLinkTwo],
      deckView,
      document,
      nextButton,
      prevButton,
      slides,
      statusNode,
    },
    windowObject,
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
