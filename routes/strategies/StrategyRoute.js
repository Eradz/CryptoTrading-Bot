import { Router } from "express";
import {
    registerStrategyController,
    startStrategyController,
    stopStrategyController,
    updateStrategyController,
    getStrategyPerformanceController,
    getQueueStatusController
} from "../../controllers/strategies/StrategyController.js";

const router = Router();

router.post("/register", registerStrategyController);
router.post("/start", startStrategyController);
router.post("/stop", stopStrategyController);
router.post("/update", updateStrategyController);
router.get("/performance/:strategyId", getStrategyPerformanceController);
router.get("/queue/status", getQueueStatusController);

export default router;
