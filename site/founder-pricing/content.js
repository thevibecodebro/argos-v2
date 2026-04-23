const founderPricingContent = {
  meta: {
    title: "Founder Pricing & COGS",
    verificationDate: "2026-04-22",
    publishedPath: "/founder-pricing/",
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
    pricing: {
      seatPrice: "$50 / seat / month",
      seatMinimum: "3-seat minimum",
      voiceAllowance: "120 pooled live voice minutes per paid seat per month",
      orgEstimate: "~$58 / org / month",
    },
    vendorStack: ["OpenAI", "Vercel", "Supabase", "Fly.io"],
  },
  slides: [
    {
      id: "cover",
      title: "Founder Pricing & COGS",
      summary: "A pricing story that stays product-native, investor-ready, and grounded in current cost structure.",
      highlights: [
        "Published path: /founder-pricing/",
        "Verification date: 2026-04-22",
      ],
    },
    {
      id: "product-truth",
      title: "Product truth from the codebase",
      summary: "The pricing narrative is anchored to the shipped product surface, not an invented packaging model.",
      highlights: [
        "Current app shell and deployment paths define the real operating context.",
        "The deck and memo share one content source so the story cannot drift.",
      ],
    },
    {
      id: "vendor-rate-card",
      title: "Official vendor rate card",
      summary: "The model references the vendor stack directly so the pricing story stays tied to actual infrastructure inputs.",
      highlights: ["OpenAI", "Vercel", "Supabase", "Fly.io"],
    },
    {
      id: "pricing-architecture",
      title: "Pricing architecture and controls",
      summary: "The founder package is constrained by a clear seat floor and a pooled voice allowance.",
      highlights: [
        "$50 / seat / month",
        "3-seat minimum",
        "120 pooled live voice minutes per paid seat per month",
      ],
    },
    {
      id: "direct-cost-stack",
      title: "Direct cost stack",
      summary: "The org-level estimate sits near the lower end of the founder-friendly range while preserving margin room.",
      highlights: ["~$58 / org / month", "OpenAI", "Vercel", "Supabase", "Fly.io"],
    },
    {
      id: "team-size-economics",
      title: "Team-size economics under the standard allowance",
      summary: "The minimum seat commitment matters more than the headline seat price when the allowance is pooled.",
      highlights: [
        "3-seat minimum",
        "120 pooled live voice minutes per paid seat per month",
      ],
    },
    {
      id: "voice-sensitivity",
      title: "Voice sensitivity",
      summary: "Voice usage is the primary variable that can change the economics faster than steady software-only usage.",
      highlights: ["OpenAI", "120 pooled live voice minutes per paid seat per month"],
    },
    {
      id: "arr-scale",
      title: "ARR scale",
      summary: "The pricing structure leaves room to scale revenue while keeping the first cohort easy to explain.",
      highlights: ["$50 / seat / month", "~$58 / org / month"],
    },
    {
      id: "founder-conclusion",
      title: "Founder conclusion",
      summary: "Use the disciplined package as the default and keep the voice and infrastructure guardrails explicit.",
      highlights: ["OpenAI", "Vercel", "Supabase", "Fly.io"],
    },
  ],
  memoSections: [
    {
      id: "executive-summary",
      title: "Executive summary",
      paragraphs: [
        "The founder pricing package is intentionally simple: a $50 per seat monthly price, a 3-seat minimum, and a pooled live voice allowance that keeps the package legible for founders and investors.",
        "The org-level estimate is about ~$58 / org / month under the canonical assumptions captured in this deck.",
      ],
    },
    {
      id: "product-truth",
      title: "Product truth from the current codebase",
      paragraphs: [
        "The pricing story should stay tied to the current product surface and the repository's actual deployment footprint.",
        "The canonical implementation uses one shared content object so the deck and memo remain aligned.",
      ],
    },
    {
      id: "official-vendor-pricing",
      title: "Official vendor pricing",
      paragraphs: [
        "The rate card explicitly names the vendor stack: OpenAI, Vercel, Supabase, and Fly.io.",
        "Those vendors are carried through the HTML so the generated artifact surfaces the same canonical references as the source model.",
      ],
    },
    {
      id: "modeling-boundary",
      title: "Modeling boundary: core COGS vs optional software vs internal tooling",
      paragraphs: [
        "The founder model keeps the direct cost boundary clean so the core pricing story remains easy to audit.",
        "Optional software and internal tooling are called out separately rather than being hidden inside the base seat price.",
      ],
    },
    {
      id: "packaging-recommendation",
      title: "Packaging recommendation and voice guardrails",
      paragraphs: [
        "Keep the packaging anchored to the seat minimum and the pooled live voice allowance.",
        "Voice usage is the main guardrail that must be stated clearly to avoid ambiguity in founder conversations.",
      ],
    },
    {
      id: "unit-economics",
      title: "Unit economics and margin sensitivity",
      paragraphs: [
        "The canonical estimate of ~$58 / org / month leaves room for software delivery while preserving a straightforward founder story.",
        "If usage intensity changes, the voice cost line should be the first place the model is revisited.",
      ],
    },
    {
      id: "founder-recommendations",
      title: "Founder recommendations",
      paragraphs: [
        "Lead with the seat price and minimum, then explain the pooled voice allowance as the reason the package remains usable.",
        "Keep the vendor stack visible so the model reads as grounded operationally rather than aspirationally priced.",
      ],
    },
    {
      id: "sources-and-verification",
      title: "Sources and verification date",
      paragraphs: [
        "Verification date: 2026-04-22.",
        "Published path: /founder-pricing/",
      ],
    },
  ],
};

module.exports = founderPricingContent;
module.exports.default = founderPricingContent;
