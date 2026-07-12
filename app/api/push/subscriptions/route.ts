import { authorizationBoundaryResponse } from "@/src/infrastructure/auth/require-admin";
import {
  getPushSubscriptionPreferences,
  removePushSubscription,
  savePushSubscription,
  updatePushSubscriptionPreferences,
} from "@/src/modules/notifications/services/push-subscriptions";
import { validatePushSubscription } from "@/src/modules/notifications/validation/push-subscription";

function invalidSubscriptionResponse() {
  return Response.json(
    { error: { code: "INVALID_PUSH_SUBSCRIPTION", message: "Cet abonnement aux notifications est invalide." } },
    { status: 400 },
  );
}

function readEndpoint(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 4_096 ? value : null;
}

function readPreferences(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const preferences = value as Record<string, unknown>;
  if (typeof preferences["event-assignment"] !== "boolean" || typeof preferences["event-setlist"] !== "boolean") return null;
  return {
    "event-assignment": preferences["event-assignment"],
    "event-setlist": preferences["event-setlist"],
  };
}

export async function GET(request: Request) {
  const endpoint = readEndpoint(new URL(request.url).searchParams.get("endpoint"));
  if (!endpoint) return invalidSubscriptionResponse();
  try {
    const subscription = await getPushSubscriptionPreferences(endpoint);
    return Response.json({ data: subscription ? { preferences: subscription.preferences } : null });
  } catch (error) {
    return authorizationBoundaryResponse(error) ?? Response.json(
      { error: { code: "PUSH_SUBSCRIPTION_READ_FAILED", message: "Impossible de charger les préférences." } },
      { status: 500 },
    );
  }
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
  const endpoint = readEndpoint(body?.endpoint);
  if (!endpoint) {
    return invalidSubscriptionResponse();
  }
  try {
    await removePushSubscription(endpoint);
    return new Response(null, { status: 204 });
  } catch (error) {
    return authorizationBoundaryResponse(error) ?? Response.json(
      { error: { code: "PUSH_UNSUBSCRIBE_FAILED", message: "Impossible de désactiver les notifications." } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { endpoint?: unknown; preferences?: unknown } | null;
  const endpoint = readEndpoint(body?.endpoint);
  const preferences = readPreferences(body?.preferences);
  if (!endpoint || !preferences) return invalidSubscriptionResponse();
  try {
    const subscription = await updatePushSubscriptionPreferences(endpoint, preferences);
    if (!subscription) return Response.json(
      { error: { code: "PUSH_SUBSCRIPTION_NOT_FOUND", message: "Cet appareil n’est plus abonné aux notifications." } },
      { status: 404 },
    );
    return Response.json({ data: { preferences: subscription.preferences } });
  } catch (error) {
    return authorizationBoundaryResponse(error) ?? Response.json(
      { error: { code: "PUSH_PREFERENCES_FAILED", message: "Impossible de mettre à jour les préférences." } },
      { status: 500 },
    );
  }
}
