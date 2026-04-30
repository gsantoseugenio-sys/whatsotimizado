import { saveTelemetryEvent } from "../repos/telemetry-repo.js";

export async function trackEvent({
  userId,
  authTokenId,
  eventName,
  context,
  objective,
  style,
  promptVariant,
  latencyMs,
  metadata
}) {
  await saveTelemetryEvent({
    userId,
    authTokenId,
    eventName,
    context,
    objective,
    style,
    promptVariant,
    latencyMs,
    metadata
  });
}
