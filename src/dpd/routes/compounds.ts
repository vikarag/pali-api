import { Router } from "express";
import { deconstructCompound } from "../services/compound-service.js";

const router = Router();

router.get("/compounds/:word", (req, res) => {
  const word = decodeURIComponent(req.params.word);
  const results = deconstructCompound(word);

  if (results.length === 0) {
    res.status(404).json({ error: "Word not found", query: word });
    return;
  }

  res.json({ query: word, results });
});

export default router;
