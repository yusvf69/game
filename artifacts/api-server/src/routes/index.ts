import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import gameplayRouter from "./gameplay";
import storyRouter from "./story";
import rankingRouter from "./ranking";
import socialRouter from "./social";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(gameplayRouter);
router.use(storyRouter);
router.use(rankingRouter);
router.use(socialRouter);
router.use(aiRouter);

export default router;
