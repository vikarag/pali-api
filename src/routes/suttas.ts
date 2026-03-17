import { Router } from "express";
import { listSuttas, getWordsBySutta } from "../services/sutta-service.js";

const router = Router();

router.get("/suttas", (req, res) => {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string, 10) || 50, 1),
    200
  );
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  const result = listSuttas(limit, offset);
  res.json({
    total: result.total,
    limit,
    offset,
    results: result.results,
  });
});

router.get("/suttas/:source", (req, res) => {
  const source = decodeURIComponent(req.params.source);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string, 10) || 50, 1),
    200
  );
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  const result = getWordsBySutta(source, limit, offset);
  res.json({
    query: source,
    total: result.total,
    limit,
    offset,
    results: result.results,
  });
});

export default router;
