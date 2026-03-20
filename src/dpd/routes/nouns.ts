import { Router } from "express";
import { getNounDeclension } from "../services/noun-service.js";
import { normalizePali } from "../../shared/utils/normalize.js";

const router = Router();

router.get("/noun/:word", (req, res) => {
  const word = normalizePali(decodeURIComponent(req.params.word));
  const results = getNounDeclension(word);
  if (results.length === 0) {
    res.status(404).json({ error: "No noun entries found", query: word });
    return;
  }
  res.json({ query: word, results });
});

export default router;
