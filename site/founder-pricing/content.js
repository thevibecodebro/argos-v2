const pricing = {
  seatPrice: "$50 / seat / month",
  seatMinimum: "3-seat minimum",
  voiceAllowance: "120 pooled live voice minutes per paid seat per month",
  orgEstimate: "~$58 / org / month",
};

const vendorStack = ["OpenAI", "Vercel", "Supabase", "Fly.io"];
const verificationDate = "2026-04-22";
const publishedPath = "/argos-v2/founder-pricing/";

const founderPricingContent = {
  meta: {
    title: "Founder Pricing & COGS",
    verificationDate,
    publishedPath,
  },
  theme: {
    colors: {
      background: "#0b0e14",
      primarySurface: "#10131a",
      secondarySurface: "#161a21",
      elevatedSurface: "#1c2028",
      elevatedSurfaceAlt: "#22262f",
      primaryText: "#ecedf6",
      secondaryText: "#a9abb3",
      primaryAccent: "#74b1ff",
      tertiaryAccent: "#6dddff",
      outline: "#45484f",
    },
    typography: {
      display: "Space Grotesk",
      body: "Source Sans 3",
    },
  },
  controls: {
    pricing,
    vendorStack,
  },
  counts: {
    slides: 9,
    memoSections: 8,
    facts: 7,
  },
  facts: {
    seatPrice: {
      id: "seatPrice",
      label: "Seat price",
      value: pricing.seatPrice,
    },
    seatMinimum: {
      id: "seatMinimum",
      label: "Seat minimum",
      value: pricing.seatMinimum,
    },
    voiceAllowance: {
      id: "voiceAllowance",
      label: "Voice allowance",
      value: pricing.voiceAllowance,
    },
    orgEstimate: {
      id: "orgEstimate",
      label: "Org estimate",
      value: pricing.orgEstimate,
    },
    vendorStack: {
      id: "vendorStack",
      label: "Vendor stack",
      values: vendorStack,
    },
    verificationDate: {
      id: "verificationDate",
      label: "Verification date",
      value: verificationDate,
    },
    publishedPath: {
      id: "publishedPath",
      label: "Published path",
      value: publishedPath,
    },
  },
  slides: [
    {
      id: "cover",
      title: "Founder Pricing & COGS",
      summary: "A pricing story that stays product-native, investor-ready, and grounded in current cost structure.",
      factIds: ["publishedPath", "verificationDate"],
    },
    {
      id: "product-truth",
      title: "Product truth from the codebase",
      summary: "The pricing narrative is anchored to the shipped product surface, not an invented packaging model.",
      factIds: ["publishedPath"],
    },
    {
      id: "vendor-rate-card",
      title: "Official vendor rate card",
      summary: "The model references the vendor stack directly so the pricing story stays tied to actual infrastructure inputs.",
      factIds: ["vendorStack"],
    },
    {
      id: "pricing-architecture",
      title: "Pricing architecture and controls",
      summary: "The founder package is constrained by a clear seat floor and a pooled voice allowance.",
      factIds: ["seatPrice", "seatMinimum", "voiceAllowance"],
    },
    {
      id: "direct-cost-stack",
      title: "Direct cost stack",
      summary: "The org-level estimate sits near the lower end of the founder-friendly range while preserving margin room.",
      factIds: ["orgEstimate", "vendorStack"],
    },
    {
      id: "team-size-economics",
      title: "Team-size economics under the standard allowance",
      summary: "The minimum seat commitment matters more than the headline seat price when the allowance is pooled.",
      factIds: ["seatMinimum", "voiceAllowance"],
    },
    {
      id: "voice-sensitivity",
      title: "Voice sensitivity",
      summary: "Voice usage is the primary variable that can change the economics faster than steady software-only usage.",
      factIds: ["voiceAllowance", "vendorStack"],
    },
    {
      id: "arr-scale",
      title: "ARR scale",
      summary: "The pricing structure leaves room to scale revenue while keeping the first cohort easy to explain.",
      factIds: ["seatPrice", "orgEstimate"],
    },
    {
      id: "founder-conclusion",
      title: "Founder conclusion",
      summary: "Use the disciplined package as the default and keep the voice and infrastructure guardrails explicit.",
      factIds: ["vendorStack", "publishedPath"],
    },
  ],
  memoSections: [
    {
      id: "executive-summary",
      title: "Executive summary",
      factIds: ["seatPrice", "seatMinimum", "voiceAllowance", "orgEstimate"],
      paragraphTemplates: [
        "The founder pricing package is intentionally simple: a {seatPrice} monthly price, a {seatMinimum}, and a {voiceAllowance} that keeps the package legible for founders and investors.",
        "The org-level estimate is about {orgEstimate} under the canonical assumptions captured in this deck.",
      ],
    },
    {
      id: "product-truth",
      title: "Product truth from the current codebase",
      factIds: ["publishedPath"],
      paragraphTemplates: [
        "The pricing story should stay tied to the current product surface and the repository's actual deployment footprint.",
        "The canonical implementation uses one shared content object so the deck and memo remain aligned.",
      ],
    },
    {
      id: "official-vendor-pricing",
      title: "Official vendor pricing",
      factIds: ["vendorStack"],
      paragraphTemplates: [
        "The rate card explicitly names the vendor stack: {vendorStack}.",
        "Those vendors are carried through the HTML so the generated artifact surfaces the same canonical references as the source model.",
      ],
    },
    {
      id: "modeling-boundary",
      title: "Modeling boundary: core COGS vs optional software vs internal tooling",
      factIds: ["seatPrice", "orgEstimate"],
      paragraphTemplates: [
        "The founder model keeps the direct cost boundary clean so the core pricing story remains easy to audit.",
        "Optional software and internal tooling are called out separately rather than being hidden inside the base seat price.",
      ],
    },
    {
      id: "packaging-recommendation",
      title: "Packaging recommendation and voice guardrails",
      factIds: ["seatMinimum", "voiceAllowance"],
      paragraphTemplates: [
        "Keep the packaging anchored to the seat minimum and the pooled live voice allowance.",
        "Voice usage is the main guardrail that must be stated clearly to avoid ambiguity in founder conversations.",
      ],
    },
    {
      id: "unit-economics",
      title: "Unit economics and margin sensitivity",
      factIds: ["orgEstimate", "voiceAllowance"],
      paragraphTemplates: [
        "The canonical estimate of {orgEstimate} leaves room for software delivery while preserving a straightforward founder story.",
        "If usage intensity changes, the voice cost line should be the first place the model is revisited.",
      ],
    },
    {
      id: "founder-recommendations",
      title: "Founder recommendations",
      factIds: ["seatPrice", "seatMinimum", "vendorStack"],
      paragraphTemplates: [
        "Lead with the seat price and minimum, then explain the pooled voice allowance as the reason the package remains usable.",
        "Keep the vendor stack visible so the model reads as grounded operationally rather than aspirationally priced.",
      ],
    },
    {
      id: "sources-and-verification",
      title: "Sources and verification date",
      factIds: ["verificationDate", "publishedPath"],
      paragraphTemplates: [
        "Verification date: {verificationDate}.",
        "Published path: {publishedPath}.",
      ],
    },
  ],
};

module.exports = founderPricingContent;
module.exports.default = founderPricingContent;
