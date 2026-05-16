import express from "express";
import cors from "cors";
import bundleApp from "../app-bundle/main.mjs";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

export default app;
