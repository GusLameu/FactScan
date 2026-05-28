import { Router, type IRouter } from "express";
import healthRouter from "./health";
import factCheckRouter from "./fact-check/index";
import curiosidadesRouter from "./curiosidades/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/fact-check", factCheckRouter);
router.use("/curiosidades", curiosidadesRouter);

export default router;
