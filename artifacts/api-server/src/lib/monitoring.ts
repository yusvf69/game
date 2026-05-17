const POSTHOG_KEY = process.env["NEXT_PUBLIC_POSTHOG_KEY"];
const POSTHOG_HOST = process.env["POSTHOG_HOST"] || "https://app.posthog.com";

let posthog: any = null;

async function initPostHog() {
  if (!POSTHOG_KEY) return null;
  try {
    const { PostHog } = await import("posthog-node");
    const client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
    console.log("[monitoring] PostHog initialized");
    return client;
  } catch {
    console.log("[monitoring] PostHog not available (install posthog-node)");
    return null;
  }
}

export async function initMonitoring() {
  posthog = await initPostHog();
}

export function trackEvent(event: string, distinctId: string = "system", properties: Record<string, any> = {}) {
  if (posthog) {
    try {
      posthog.capture({ distinctId, event, properties });
    } catch {}
  }
}

export function trackError(error: Error, context: Record<string, any> = {}) {
  console.error(`[monitoring] ${error.message}`, context);
  trackEvent("error", "system", { error: error.message, stack: error.stack, ...context });
}

export function shutdownMonitoring() {
  if (posthog) {
    try {
      posthog.shutdown();
    } catch {}
  }
}
