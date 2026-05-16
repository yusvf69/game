import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/__vercel_test", (_req, res) => res.json({ status: "from-bundle" }));

app.use("/api", router);

export default app;
