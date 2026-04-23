import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import founderPricingContent from "./content.js";
import renderModule from "./render.js";

const { renderFounderPricingHtml } = renderModule;

test("build:founder-pricing emits a publishable HTML document", () => {
  const { directHtml, html } = buildHtml();
  const { counts, facts, meta, memoSections, slides } = founderPricingContent;

  assert.match(html, /<!DOCTYPE html>/);
  assert.equal(html, directHtml);
  assert.match(html, /Founder Pricing &amp; COGS/);
  assert.match(html, /#0b0e14/);
  assert.match(html, /Space Grotesk/);
  assert.match(html, /Source Sans 3/);
  assert.match(html, /id="deck-view"/);
  assert.match(html, /id="memo-view"/);
  assert.match(html, /data-mode="deck"/);
  assert.match(html, /data-mode="memo"/);
  assert.match(html, /class FounderPricingController/);
  assert.match(html, /data-nav="next"/);
  assert.match(html, /data-nav="prev"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /Official Vendor Rate Card/);
  assert.match(html, /Founder Recommendations/);
  assert.match(html, new RegExp(`data-content-slides="${counts.slides}"`));
  assert.match(html, new RegExp(`data-content-memo-sections="${counts.memoSections}"`));
  assert.match(html, new RegExp(`data-content-facts="${counts.facts}"`));

  assert.equal((html.match(/data-slide-id="/g) ?? []).length, slides.length);
  assert.equal((html.match(/data-section-id="/g) ?? []).length, memoSections.length);

  for (const slide of slides) {
    assert.match(html, new RegExp(`data-slide-id="${slide.id}"`));
    assert.match(html, new RegExp(`data-fact-ids="${slide.factIds.join(" ")}"`));
  }

  for (const section of memoSections) {
    assert.match(html, new RegExp(`data-section-id="${section.id}"`));
    assert.match(html, new RegExp(`data-fact-ids="${section.factIds.join(" ")}"`));
  }

  for (const fact of Object.values(facts)) {
    assert.match(html, new RegExp(`data-fact-key="${fact.id}"`));
  }

  assert.match(html, new RegExp(escapeRegExp(meta.verificationDate)));
  assert.match(html, new RegExp(escapeRegExp(meta.publishedPath)));
  assert.match(html, /data-fact-key="seatPrice"/);
  assert.match(html, /data-fact-key="seatMinimum"/);
  assert.match(html, /data-fact-key="voiceAllowance"/);
  assert.match(html, /data-fact-key="orgEstimate"/);
  assert.match(html, /data-fact-key="vendorStack"/);
  assert.match(html, /data-fact-key="verificationDate"/);
  assert.match(html, /data-fact-key="publishedPath"/);
  assert.match(html, /\$50 \/ seat \/ month/);
  assert.match(html, /3-seat minimum/);
  assert.match(html, /120 pooled live voice minutes per paid seat per month/);
  assert.match(html, /~\$58 \/ org \/ month/);
  assert.match(html, /OpenAI/);
  assert.match(html, /Vercel/);
  assert.match(html, /Supabase/);
  assert.match(html, /Fly\.io/);
});

test("founder pricing controller drives deck and memo behavior", () => {
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

  assert.equal(windowObject.__founderPricingController.mode, "deck");
  assert.equal(elements.deckView.hidden, false);
  assert.equal(elements.memoView.hidden, true);
  assert.equal(elements.slides[0].hidden, false);
  assert.equal(elements.slides[1].hidden, true);
  assert.equal(elements.prevButton.disabled, true);
  assert.equal(elements.nextButton.disabled, false);
  assert.equal(elements.statusNode.textContent, "Slide 1 of 2");

  elements.nextButton.emit("click");
  assert.equal(windowObject.__founderPricingController.index, 1);
  assert.equal(elements.slides[0].hidden, true);
  assert.equal(elements.slides[1].hidden, false);
  assert.equal(elements.prevButton.disabled, false);
  assert.equal(elements.nextButton.disabled, true);
  assert.equal(windowObject.location.hash, "#slide-product-truth");

  elements.memoButton.emit("click");
  assert.equal(windowObject.__founderPricingController.mode, "memo");
  assert.equal(elements.deckView.hidden, true);
  assert.equal(elements.memoView.hidden, false);
  assert.equal(elements.prevButton.disabled, true);
  assert.equal(elements.nextButton.disabled, true);
  assert.equal(elements.statusNode.textContent, "Memo mode");

  windowObject.dispatch("wheel", { deltaY: -120 });
  assert.equal(windowObject.__founderPricingController.index, 1);

  elements.deckLinks[0].emit("click");
  assert.equal(windowObject.__founderPricingController.mode, "deck");
  assert.equal(windowObject.__founderPricingController.index, 0);
  assert.equal(windowObject.location.hash, "#slide-cover");

  windowObject.dispatch("touchstart", {
    changedTouches: [{ clientX: 120, clientY: 8 }],
  });
  windowObject.dispatch("touchend", {
    changedTouches: [{ clientX: 20, clientY: 12 }],
  });
  assert.equal(windowObject.__founderPricingController.index, 1);

  windowObject.dispatch("keydown", {
    key: "ArrowLeft",
    preventDefault() {},
  });
  assert.equal(windowObject.__founderPricingController.index, 0);

  windowObject.dispatch("wheel", { deltaY: 120 });
  assert.equal(windowObject.__founderPricingController.index, 1);

  windowObject.location.hash = "#memo-executive-summary";
  windowObject.dispatch("hashchange");
  assert.equal(windowObject.__founderPricingController.mode, "memo");
  assert.equal(elements.memoView.hidden, false);
  assert.equal(elements.memoSection.scrollIntoViewCalls.length > 0, true);
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

function createControllerHarness() {
  const deckView = createMockElement({ id: "deck-view" });
  const memoView = createMockElement({ id: "memo-view", hidden: true });
  const slideOne = createMockElement({
    id: "slide-cover",
    dataset: { active: "true", slideId: "cover" },
  });
  const slideTwo = createMockElement({
    id: "slide-product-truth",
    dataset: { active: "false", slideId: "product-truth" },
    hidden: true,
  });
  const deckButton = createMockElement({
    dataset: { active: "true", mode: "deck" },
  });
  const memoButton = createMockElement({
    dataset: { active: "false", mode: "memo" },
  });
  const prevButton = createMockElement();
  const nextButton = createMockElement();
  const statusNode = createMockElement();
  const deckLinkOne = createMockElement({
    dataset: { slideTarget: "cover" },
  });
  const deckLinkTwo = createMockElement({
    dataset: { slideTarget: "product-truth" },
  });
  const memoLink = createMockElement({
    dataset: { sectionTarget: "executive-summary" },
  });
  const memoSection = createMockElement({ id: "memo-executive-summary" });
  const windowListeners = {};
  const document = {
    getElementById(id) {
      return (
        {
          "deck-view": deckView,
          "memo-executive-summary": memoSection,
          "memo-view": memoView,
          "slide-cover": slideOne,
          "slide-product-truth": slideTwo,
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
          ".mode-button[data-mode]": [deckButton, memoButton],
          ".slide": [slideOne, slideTwo],
          "[data-section-target]": [memoLink],
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
    location: { hash: "" },
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
      deckButton,
      deckLinks: [deckLinkOne, deckLinkTwo],
      deckView,
      document,
      memoButton,
      memoSection,
      memoView,
      nextButton,
      prevButton,
      slides: [slideOne, slideTwo],
      statusNode,
    },
    windowObject,
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
