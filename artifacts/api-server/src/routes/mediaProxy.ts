import { Router } from "express";

const router = Router();

router.get("/media-proxy", async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing 'url' query parameter" });
    return;
  }

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "Upstream fetch failed" });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);

    if (upstream.body) {
      for await (const chunk of upstream.body as any) {
        res.write(chunk);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      res.status(504).json({ error: "Upstream timeout" });
    } else {
      res.status(502).json({ error: "Proxy fetch failed", detail: err?.message });
    }
  }
});

export default router;
