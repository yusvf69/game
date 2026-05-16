import express from "express";
const app = express();
app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
export default app;
