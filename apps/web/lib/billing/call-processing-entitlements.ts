export type CallProcessingEntitlementsRepository = {
  findActiveCallProcessingSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }): Promise<{ id: string } | null>;
};

export async function getCallProcessingEntitlementStatus(
  repository: CallProcessingEntitlementsRepository,
  input: {
    orgId: string | null;
    userId: string | null;
  },
) {
  const subscription = await repository.findActiveCallProcessingSubscription(input);

  if (!subscription) {
    return {
      ok: false as const,
      status: 402 as const,
      code: "payment_required" as const,
      error: "An active Argos subscription is required to process call recordings.",
    };
  }

  return {
    ok: true as const,
    data: {
      subscriptionId: subscription.id,
    },
  };
}
