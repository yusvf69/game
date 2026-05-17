let cachedApp;

export default async function handler(req, res) {
  if (!cachedApp) {
    const { default: app } = await import("../src/app.js");
    cachedApp = app;
  }
  return cachedApp(req, res);
}
