import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path, originalUrl: req.originalUrl, baseUrl: req.baseUrl });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[express error]", err?.message || err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

export default app;
