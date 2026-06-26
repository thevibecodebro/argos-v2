export type TrainingAiEntitlementsRepository = {
  findActiveTrainingAiSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }): Promise<{ id: string } | null>;
};

export async function getTrainingAiEntitlementStatus(
  repository: TrainingAiEntitlementsRepository,
  input: {
    orgId: string | null;
    userId: string | null;
  },
) {
  const subscription = await repository.findActiveTrainingAiSubscription(input);

  if (!subscription) {
    return {
      ok: false as const,
      status: 402 as const,
      code: "payment_required" as const,
      error: "An active paid Argos subscription is required to generate AI training content.",
    };
  }

  return {
    ok: true as const,
    data: {
      subscriptionId: subscription.id,
    },
  };
}
