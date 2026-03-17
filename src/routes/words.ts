import { Router } from "express";
import {
  lookupWord,
  getWordById,
  getWordGrammar,
  getWordMeanings,
  getWordEtymology,
  getWordExamples,
  getWordRelated,
  getWordConstruction,
} from "../services/word-service.js";
import { getDeclension } from "../services/declension-service.js";
import { getSuttasForWord } from "../services/sutta-service.js";
import { normalizePali } from "../utils/normalize.js";

const router = Router();

// Full word entry
router.get("/words/id/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const result = getWordById(id);
  if (!result) {
    res.status(404).json({ error: "Word not found", query: req.params.id });
    return;
  }
  res.json({ query: req.params.id, results: [result] });
});

router.get("/words/:word/grammar", (req, res) => {
  const results = getWordGrammar(normalizePali(decodeURIComponent(req.params.word)));
  res.json({ query: req.params.word, results });
});

router.get("/words/:word/meanings", (req, res) => {
  const results = getWordMeanings(normalizePali(decodeURIComponent(req.params.word)));
  res.json({ query: req.params.word, results });
});

router.get("/words/:word/etymology", (req, res) => {
  const results = getWordEtymology(normalizePali(decodeURIComponent(req.params.word)));
  res.json({ query: req.params.word, results });
});

router.get("/words/:word/examples", (req, res) => {
  const results = getWordExamples(normalizePali(decodeURIComponent(req.params.word)));
  res.json({ query: req.params.word, results });
});

router.get("/words/:word/related", (req, res) => {
  const results = getWordRelated(normalizePali(decodeURIComponent(req.params.word)));
  res.json({ query: req.params.word, results });
});

router.get("/words/:word/construction", (req, res) => {
  const results = getWordConstruction(normalizePali(decodeURIComponent(req.params.word)));
  res.json({ query: req.params.word, results });
});

router.get("/words/:word/declension", (req, res) => {
  const results = getDeclension(normalizePali(decodeURIComponent(req.params.word)));
  res.json({ query: req.params.word, results });
});

router.get("/words/:word/suttas", (req, res) => {
  const results = getSuttasForWord(normalizePali(decodeURIComponent(req.params.word)));
  res.json({ query: req.params.word, results });
});

router.get("/words/:word", (req, res) => {
  const word = normalizePali(decodeURIComponent(req.params.word));
  const results = lookupWord(word);
  if (results.length === 0) {
    res.status(404).json({ error: "Word not found", query: word });
    return;
  }
  res.json({ query: word, results });
});

export default router;
