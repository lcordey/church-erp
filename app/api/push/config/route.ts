import { getPushConfiguration } from "@/src/modules/notifications/services/push-subscriptions";

export async function GET() {
  return Response.json({ data: getPushConfiguration() });
}
