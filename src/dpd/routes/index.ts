import { Router } from "express";
import healthRouter from "./health.js";
import wordsRouter from "./words.js";
import searchRouter from "./search.js";
import rootsRouter from "./roots.js";
import compoundsRouter from "./compounds.js";
import suttasRouter from "./suttas.js";
import verbsRouter from "./verbs.js";
import nounsRouter from "./nouns.js";

const router = Router();

router.use(healthRouter);
router.use(wordsRouter);
router.use(searchRouter);
router.use(rootsRouter);
router.use(compoundsRouter);
router.use(suttasRouter);
router.use(verbsRouter);
router.use(nounsRouter);

export default router;
