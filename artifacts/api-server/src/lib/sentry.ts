import * as Sentry from "@sentry/node";

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    });
    console.log("[sentry] Initialized with DSN:", process.env.SENTRY_DSN.substring(0, 20) + "...");
  } else {
    console.log("[sentry] SENTRY_DSN not set, skipping initialization");
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error("[sentry] (dry) Error:", error.message, context);
  }
}
