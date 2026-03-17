import { Router } from "express";
import {
  searchExact,
  searchPrefix,
  searchEnglish,
  searchRoot,
  searchFuzzy,
  browse,
} from "../services/search-service.js";
import { normalizePali } from "../utils/normalize.js";

const router = Router();

router.get("/search", (req, res) => {
  const q = normalizePali((req.query.q as string || "").trim());
  const mode = (req.query.mode as string || "exact").toLowerCase();
  const pos = req.query.pos as string | undefined;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  if (!q) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const opts = { limit, offset, pos };

  let result: { total: number; results: unknown[] };

  switch (mode) {
    case "exact":
      result = searchExact(q, opts);
      break;
    case "prefix":
      result = searchPrefix(q, opts);
      break;
    case "english":
      result = searchEnglish(q, opts);
      break;
    case "root":
      result = searchRoot(q, opts);
      break;
    case "fuzzy":
      result = searchFuzzy(q, opts);
      break;
    default:
      res.status(400).json({
        error: `Invalid search mode '${mode}'. Valid modes: exact, prefix, english, root, fuzzy`,
      });
      return;
  }

  res.json({
    query: q,
    mode,
    total: result.total,
    limit,
    offset,
    results: result.results,
  });
});

router.get("/browse", (req, res) => {
  const letter = normalizePali((req.query.letter as string || "a").trim());
  const pos = req.query.pos as string | undefined;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  const result = browse(letter, { limit, offset, pos });

  res.json({
    letter,
    total: result.total,
    limit,
    offset,
    results: result.results,
  });
});

export default router;
