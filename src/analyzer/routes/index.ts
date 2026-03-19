import { Router } from "express";
import {
  analyzeSentence,
  analyzeWord,
  resolveSandhiOnly,
  analyzeCompoundOnly,
} from "../services/analyzer-service.js";
import { makeTag, makeCompoundTag } from "../services/tagger.js";
import { normalizePali } from "../../shared/utils/normalize.js";

const router = Router();

// POST /sentence — full sentence analysis
router.post("/sentence", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing or invalid 'text' field" });
    return;
  }
  const result = analyzeSentence(text);
  res.json(result);
});

// GET /word/:word — single-word analysis (no sentence disambiguation)
router.get("/word/:word", (req, res) => {
  const word = normalizePali(decodeURIComponent(req.params.word));
  const token = analyzeWord(word);
  if (!token.analyses.length && !token.sandhi && !token.compound) {
    res.status(404).json({ error: "Word not found", query: word });
    return;
  }
  res.json({ query: word, ...token });
});

// GET /sandhi/:form — sandhi resolution only
router.get("/sandhi/:form", (req, res) => {
  const form = normalizePali(decodeURIComponent(req.params.form));
  const result = resolveSandhiOnly(form);
  if (!result) {
    res.status(404).json({ error: "No sandhi resolution found", query: form });
    return;
  }
  res.json({ query: form, ...result });
});

// GET /compound/:word — compound analysis only
router.get("/compound/:word", (req, res) => {
  const word = normalizePali(decodeURIComponent(req.params.word));
  const result = analyzeCompoundOnly(word);
  if (!result) {
    res
      .status(404)
      .json({ error: "No compound analysis found", query: word });
    return;
  }
  res.json({ query: word, ...result });
});

// GET /tag — generate a grammar tag from query params
router.get("/tag", (req, res) => {
  const pos = (req.query.pos as string) || "";
  const inflection =
    (req.query.inflection as string)?.replace(/\+/g, " ") || "";
  const lemma = (req.query.lemma as string) || "";
  const compoundType = (req.query.compound_type as string) || "";

  if (!pos && !compoundType) {
    res
      .status(400)
      .json({ error: "Missing 'pos' or 'compound_type' query parameter" });
    return;
  }

  const tag = compoundType
    ? makeCompoundTag(compoundType, inflection)
    : makeTag(pos, inflection, lemma);

  res.json({ tag, pos, inflection, lemma });
});

export default router;
