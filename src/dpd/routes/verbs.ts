import { Router } from "express";
import { getVerbConjugation } from "../services/verb-service.js";
import { normalizePali } from "../../shared/utils/normalize.js";

const router = Router();

router.get("/verb/:word", (req, res) => {
  const word = normalizePali(decodeURIComponent(req.params.word));
  const results = getVerbConjugation(word);
  if (results.length === 0) {
    res.status(404).json({ error: "No verb entries found", query: word });
    return;
  }
  res.json({ query: word, results });
});

export default router;
