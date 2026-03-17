import express from "express";
import { config } from "./config.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import apiRouter from "./routes/index.js";
import { getDb, closeDb } from "./db/connection.js";

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// API routes
app.use("/api", apiRouter);

// Root redirect
app.get("/", (_req, res) => {
  res.json({
    name: "Pali Dictionary API",
    version: "1.0.0",
    description: "API server for the Digital Pali Dictionary (DPD)",
    endpoints: {
      health: "/api/health",
      stats: "/api/stats",
      word: "/api/words/:word",
      wordById: "/api/words/id/:id",
      grammar: "/api/words/:word/grammar",
      meanings: "/api/words/:word/meanings",
      etymology: "/api/words/:word/etymology",
      examples: "/api/words/:word/examples",
      related: "/api/words/:word/related",
      construction: "/api/words/:word/construction",
      declension: "/api/words/:word/declension",
      suttasForWord: "/api/words/:word/suttas",
      search: "/api/search?q=<term>&mode=<exact|prefix|fuzzy|english|root>",
      browse: "/api/browse?letter=<letter>",
      roots: "/api/roots",
      rootDetail: "/api/roots/:root",
      compounds: "/api/compounds/:word",
      suttas: "/api/suttas",
      suttaDetail: "/api/suttas/:source",
    },
  });
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
