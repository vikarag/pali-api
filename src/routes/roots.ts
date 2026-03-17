import { Router } from "express";
import { listRoots, getRootDetail } from "../services/root-service.js";
import { normalizePali } from "../utils/normalize.js";

const router = Router();

router.get("/roots", (req, res) => {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string, 10) || 20, 1),
    200
  );
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  const result = listRoots(limit, offset);
  res.json({
    total: result.total,
    limit,
    offset,
    results: result.results,
  });
});

router.get("/roots/:root", (req, res) => {
  const rootKey = normalizePali(decodeURIComponent(req.params.root));
  const result = getRootDetail(rootKey);

  if (!result.root) {
    res.status(404).json({ error: "Root not found", query: rootKey });
    return;
  }

  res.json({
    query: rootKey,
    root: result.root,
    derivedWords: result.derivedWords,
    derivedWordCount: result.derivedWords.length,
  });
});

export default router;
