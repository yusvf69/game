let cachedApp;

export default async function handler(req, res) {
  if (!cachedApp) {
    const { default: app } = await import("../dist/app-bundle.mjs");
    cachedApp = app;
  }
  return cachedApp(req, res);
}
