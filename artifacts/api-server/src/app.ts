import express, { type Express } from "express";
import cors from "cors";
import { Router } from "express";
import healthRouter from "./routes/health";

const app: Express = express();
const router = Router();

router.use(healthRouter);

app.use(cors());
app.use(express.json());
app.use("/api", router);

export default app;
