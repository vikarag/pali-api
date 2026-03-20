import express from "express";
import { readFileSync } from "node:fs";
import { marked } from "marked";
import { config } from "./shared/config.js";
import { corsMiddleware } from "./shared/middleware/cors.js";
import { errorHandler } from "./shared/middleware/error-handler.js";
import apiRouter from "./dpd/routes/index.js";
import analyzerRouter from "./analyzer/routes/index.js";
import { getDb, closeDb } from "./shared/db/connection.js";

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// README pages (registered before routers to match first)
const readmeStyle = `
  body { max-width: 48rem; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.6; color: #222; }
  pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; border-radius: 4px; }
  code { font-size: 0.9em; }
  :not(pre)>code { background: #f5f5f5; padding: 0.15em 0.3em; border-radius: 3px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
  th { background: #f9f9f9; }
  a { color: #2563eb; }
  h1, h2, h3 { margin-top: 2rem; }`;

const readmePage = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${readmeStyle}
</style>
</head><body>${body}</body></html>`;

app.get("/dpd/readme", (_req, res) => {
  const md = readFileSync(new URL("../README.md", import.meta.url), "utf-8");
  res.type("html").send(readmePage("Pali Dictionary API", marked(md) as string));
});

app.get("/analyzer/readme", (_req, res) => {
  const md = readFileSync(new URL("../README.md", import.meta.url), "utf-8");
  const lines = md.split("\n");
  const analyzerStart = lines.findIndex((l) => /^## Analyzer API/.test(l));
  const analyzerEnd = lines.findIndex(
    (l, i) => i > analyzerStart && /^## Dictionary API/.test(l)
  );
  const firstHr = lines.findIndex((l) => /^---$/.test(l));
  const intro = lines.slice(0, firstHr).join("\n");
  const analyzerSection = lines
    .slice(analyzerStart, analyzerEnd > 0 ? analyzerEnd - 1 : undefined)
    .join("\n");
  const body = marked(intro + "\n\n---\n\n" + analyzerSection) as string;
  res.type("html").send(readmePage("Pali Analyzer API", body));
});

// API routes
app.use("/api", apiRouter);
app.use("/dpd", apiRouter);
app.use("/analyzer", analyzerRouter);

// DPD index
app.get("/dpd", (_req, res) => {
  res.json({
    name: "Pali Dictionary API",
    version: "1.0.0",
    description: "API server for the Digital Pali Dictionary (DPD)",
    endpoints: {
      health: "/dpd/health",
      stats: "/dpd/stats",
      word: "/dpd/words/:word",
      wordById: "/dpd/words/id/:id",
      grammar: "/dpd/words/:word/grammar",
      meanings: "/dpd/words/:word/meanings",
      etymology: "/dpd/words/:word/etymology",
      examples: "/dpd/words/:word/examples",
      related: "/dpd/words/:word/related",
      construction: "/dpd/words/:word/construction",
      declension: "/dpd/words/:word/declension",
      verb: "/dpd/verb/:word",
      noun: "/dpd/noun/:word",
      suttasForWord: "/dpd/words/:word/suttas",
      search: "/dpd/search?q=<term>&mode=<exact|prefix|fuzzy|english|root>",
      browse: "/dpd/browse?letter=<letter>",
      roots: "/dpd/roots",
      rootDetail: "/dpd/roots/:root",
      compounds: "/dpd/compounds/:word",
      suttas: "/dpd/suttas",
      suttaDetail: "/dpd/suttas/:source",
    },
  });
});

// Analyzer index
app.get("/analyzer", (_req, res) => {
  res.json({
    name: "Pali Analyzer API",
    version: "1.0.0",
    description:
      "Morphological analyzer for Pali text — tokenization, sandhi resolution, compound detection, and grammar disambiguation",
    endpoints: {
      sentence: "POST /analyzer/sentence",
      word: "GET /analyzer/word/:word",
      sandhi: "GET /analyzer/sandhi/:form",
      compound: "GET /analyzer/compound/:word",
      tag: "GET /analyzer/tag?pos=<pos>&inflection=<inflection>&lemma=<lemma>",
      readme: "GET /analyzer/readme",
    },
  });
});

// Root — full README
app.get("/", (_req, res) => {
  const md = readFileSync(new URL("../README.md", import.meta.url), "utf-8");
  res.type("html").send(readmePage("Pali API", marked(md) as string));
});

// Error handler
app.use(errorHandler);

// Verify DB connection on startup
try {
  const db = getDb();
  const count = (
    db.prepare("SELECT COUNT(*) as cnt FROM dpd_headwords").get() as {
      cnt: number;
    }
  ).cnt;
  console.log(`Database loaded: ${count} headwords`);
} catch (err) {
  console.error(
    "Failed to connect to database. Run 'pnpm setup' first.",
    (err as Error).message
  );
  process.exit(1);
}

// Start server
const server = app.listen(config.port, config.host, () => {
  console.log(`Pali API server running at http://${config.host}:${config.port}`);
  console.log(`LAN access: http://<your-ip>:${config.port}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  closeDb();
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeDb();
  server.close();
  process.exit(0);
});
