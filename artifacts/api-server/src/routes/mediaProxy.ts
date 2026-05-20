import { Router } from "express";

const router = Router();

router.get("/media-proxy", async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    res.status(400).json({ error: "Missing or invalid 'url' query parameter" });
    return;
  }

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "Upstream fetch failed" });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const blob = await upstream.arrayBuffer();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", blob.byteLength);
    res.end(Buffer.from(blob));
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      res.status(504).json({ error: "Upstream timeout" });
    } else {
      res.status(502).json({ error: "Proxy failed", detail: err?.message });
    }
  }
});

export default router;
