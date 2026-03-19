import { Router } from "express";
import { getDb } from "../../shared/db/connection.js";

const router = Router();

router.get("/health", (_req, res) => {
  try {
    const db = getDb();
    const headwordCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM dpd_headwords").get() as {
        cnt: number;
      }
    ).cnt;
    const rootCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM dpd_roots").get() as {
        cnt: number;
      }
    ).cnt;
    const lookupCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM lookup").get() as {
        cnt: number;
      }
    ).cnt;

    res.json({
      status: "ok",
      database: {
        headwords: headwordCount,
        roots: rootCount,
        lookupEntries: lookupCount,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: (err as Error).message });
  }
});

router.get("/stats", (_req, res) => {
  const db = getDb();

  const headwordCount = (
    db.prepare("SELECT COUNT(*) as cnt FROM dpd_headwords").get() as {
      cnt: number;
    }
  ).cnt;
  const rootCount = (
    db.prepare("SELECT COUNT(*) as cnt FROM dpd_roots").get() as {
      cnt: number;
    }
  ).cnt;
  const lookupCount = (
    db.prepare("SELECT COUNT(*) as cnt FROM lookup").get() as {
      cnt: number;
    }
  ).cnt;

  const posStats = db
    .prepare(
      "SELECT pos, COUNT(*) as count FROM dpd_headwords WHERE pos != '' GROUP BY pos ORDER BY count DESC"
    )
    .all() as Array<{ pos: string; count: number }>;

  const withExamples = (
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE example_1 IS NOT NULL AND example_1 != ''"
      )
      .get() as { cnt: number }
  ).cnt;

  const compoundCount = (
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE compound_type IS NOT NULL AND compound_type != ''"
      )
      .get() as { cnt: number }
  ).cnt;

  res.json({
    headwords: headwordCount,
    roots: rootCount,
    lookupEntries: lookupCount,
    withExamples,
    compoundWords: compoundCount,
    partOfSpeech: posStats,
  });
});

export default router;
