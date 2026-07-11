import { authorizationBoundaryResponse } from "@/src/infrastructure/auth/require-admin";
import { removePushSubscription, savePushSubscription } from "@/src/modules/notifications/services/push-subscriptions";
import { validatePushSubscription } from "@/src/modules/notifications/validation/push-subscription";

function invalidSubscriptionResponse() {
  return Response.json(
    { error: { code: "INVALID_PUSH_SUBSCRIPTION", message: "Cet abonnement aux notifications est invalide." } },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const input = validatePushSubscription(await request.json().catch(() => null));
  if (!input) return invalidSubscriptionResponse();
  try {
    await savePushSubscription(input);
    return new Response(null, { status: 204 });
  } catch (error) {
    return authorizationBoundaryResponse(error) ?? Response.json(
      { error: { code: "PUSH_SUBSCRIPTION_FAILED", message: "Impossible d’activer les notifications." } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null) as { endpoint?: unknown } | null;
  if (!body || typeof body.endpoint !== "string" || body.endpoint.length > 4_096) {
    return invalidSubscriptionResponse();
  }
  try {
    await removePushSubscription(body.endpoint);
    return new Response(null, { status: 204 });
  } catch (error) {
    return authorizationBoundaryResponse(error) ?? Response.json(
      { error: { code: "PUSH_UNSUBSCRIBE_FAILED", message: "Impossible de désactiver les notifications." } },
      { status: 500 },
    );
  }
}
