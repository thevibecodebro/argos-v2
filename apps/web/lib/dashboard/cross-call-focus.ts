type FocusCall = {
  id: string;
  callTopic: string | null;
  createdAt: Date;
  rubricId?: string | null;
  buyerProfileStatus?: string | null;
  categoryScores?: Array<{ slug: string; name: string; score: number | null }>;
};

export type CrossCallFocusRecommendation = {
  categorySlug: string;
  categoryName: string;
  averageScore: number;
  scoredCallCount: number;
  weakCallCount: number;
  practiceCallId: string | null;
  sourceCalls: Array<{
    id: string;
    callTopic: string | null;
    createdAt: string;
    score: number;
  }>;
};

const WINDOW_DAYS = 30;
const WEAK_SCORE_BELOW = 70;

export function buildCrossCallFocusRecommendation(
  calls: FocusCall[],
  activeRubricId: string | null,
  now = new Date(),
): CrossCallFocusRecommendation | null {
  if (!activeRubricId) return null;

  const since = now.getTime() - WINDOW_DAYS * 86_400_000;
  const comparableCalls = calls.filter((call) =>
    call.rubricId === activeRubricId &&
    call.createdAt.getTime() >= since &&
    call.createdAt.getTime() <= now.getTime(),
  );
  if (comparableCalls.length < 3) return null;

  const categories = new Map<string, {
    name: string;
    scores: Array<{ call: FocusCall; score: number }>;
  }>();
  for (const call of comparableCalls) {
    for (const category of call.categoryScores ?? []) {
      if (!category.slug || !Number.isFinite(category.score) ||
          category.score === null || category.score < 0 || category.score > 100) continue;
      const bucket = categories.get(category.slug) ?? { name: category.name, scores: [] };
      bucket.scores.push({ call, score: category.score });
      categories.set(category.slug, bucket);
    }
  }

  const candidates = [...categories.entries()].flatMap(([slug, bucket]) => {
    if (bucket.scores.length < 3) return [];
    const weakCalls = bucket.scores
      .filter((entry) => entry.score < WEAK_SCORE_BELOW)
      .sort((left, right) => right.call.createdAt.getTime() - left.call.createdAt.getTime());
    const averageScore = Math.round(bucket.scores.reduce((sum, entry) => sum + entry.score, 0) / bucket.scores.length);
    if (weakCalls.length < 2 || averageScore >= WEAK_SCORE_BELOW) return [];

    return [{
      categorySlug: slug,
      categoryName: bucket.name,
      averageScore,
      scoredCallCount: bucket.scores.length,
      weakCallCount: weakCalls.length,
      practiceCallId: weakCalls.find(({ call }) => call.buyerProfileStatus === "ready")?.call.id ?? null,
      sourceCalls: weakCalls.slice(0, 3).map(({ call, score }) => ({
        id: call.id,
        callTopic: call.callTopic,
        createdAt: call.createdAt.toISOString(),
        score,
      })),
    }];
  });

  return candidates.sort((left, right) =>
    left.averageScore - right.averageScore ||
    right.weakCallCount - left.weakCallCount ||
    left.categoryName.localeCompare(right.categoryName),
  )[0] ?? null;
}
