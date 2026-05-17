import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes/index.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { initSentry, captureError } from "./lib/sentry.js";

initSentry();

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for sensitive endpoints
app.use("/api/auth/login", rateLimit(5, 60_000));
app.use("/api/auth/register", rateLimit(3, 60_000));
app.use("/api/questions", rateLimit(30, 60_000));
app.use("/api/stage/buzz", rateLimit(10, 10_000));
app.use("/api/stage/answer", rateLimit(30, 60_000));

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path, originalUrl: req.originalUrl, baseUrl: req.baseUrl });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  captureError(err, { path: req.path, method: req.method });
  console.error("[express error]", err?.message || err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

export default app;
