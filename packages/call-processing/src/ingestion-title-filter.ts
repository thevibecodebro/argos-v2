export type IngestionTitleFilterKind = "include" | "exclude";

export type IngestionTitleDecisionReason =
  | "included"
  | "excluded"
  | "unconfigured"
  | "missing_title"
  | "no_include_match";

export type IngestionTitleFilterConfig = {
  configured: boolean;
  excludePhrases: string[];
  includePhrases: string[];
};

export type IngestionTitleDecision = {
  accepted: boolean;
  matchedPhrase?: string;
  reason: IngestionTitleDecisionReason;
};

export function canonicalizeIngestionTitleText(value: string) {
  return value.normalize("NFKC").replace(/\p{Cf}/gu, "").trim().replace(/\s+/gu, " ");
}

export function normalizeIngestionTitleText(value: string) {
  return canonicalizeIngestionTitleText(value).toLowerCase();
}

export function evaluateIngestionTitleFilter(
  title: string | null | undefined,
  config: IngestionTitleFilterConfig,
): IngestionTitleDecision {
  const normalizedTitle = normalizeIngestionTitleText(title ?? "");

  if (!normalizedTitle) {
    return {
      accepted: false,
      reason: "missing_title",
    };
  }

  const excludedPhrase = config.excludePhrases.find((phrase) => {
    const normalizedPhrase = normalizeIngestionTitleText(phrase);
    return normalizedPhrase && normalizedTitle.includes(normalizedPhrase);
  });

  if (excludedPhrase) {
    return {
      accepted: false,
      matchedPhrase: excludedPhrase,
      reason: "excluded",
    };
  }

  if (config.includePhrases.length === 0) {
    return {
      accepted: false,
      reason: "unconfigured",
    };
  }

  const includedPhrase = config.includePhrases.find((phrase) => {
    const normalizedPhrase = normalizeIngestionTitleText(phrase);
    return normalizedPhrase && normalizedTitle.includes(normalizedPhrase);
  });

  if (includedPhrase) {
    return {
      accepted: true,
      matchedPhrase: includedPhrase,
      reason: "included",
    };
  }

  return {
    accepted: false,
    reason: "no_include_match",
  };
}
