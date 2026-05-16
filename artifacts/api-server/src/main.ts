import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/__diag", (_req, res) =>
  res.json({
    ok: true,
    ts: Date.now(),
    routes: app.router?.stack?.length ?? 0,
  }),
);

app.use("/api", router);

export default app;
