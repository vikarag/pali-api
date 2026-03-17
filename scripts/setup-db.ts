import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");
const DB_PATH = path.join(DATA_DIR, "dpd.db");
const ARCHIVE_PATH = path.join(DATA_DIR, "dpd.db.tar.bz2");
const DOWNLOAD_URL =
  "https://github.com/digitalpalidictionary/dpd-db/releases/download/v0.3.20260303/dpd.db.tar.bz2";

async function setup() {
  console.log("=== Pali API Database Setup ===\n");

  // Create data directory
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log("Created data/ directory");
  }

  // Download if not present
  if (!fs.existsSync(DB_PATH)) {
    if (!fs.existsSync(ARCHIVE_PATH)) {
      console.log(`Downloading DPD database from GitHub releases...`);
      console.log(`URL: ${DOWNLOAD_URL}`);
      console.log("This is ~144MB, may take a few minutes...\n");
      execSync(`curl -L -o "${ARCHIVE_PATH}" "${DOWNLOAD_URL}"`, {
        stdio: "inherit",
      });
      console.log("\nDownload complete.");
    }

    console.log("Extracting database...");
    execSync(`tar -xjf "${ARCHIVE_PATH}" -C "${DATA_DIR}"`, {
      stdio: "inherit",
    });

    // The archive may extract to a different filename — find it
    if (!fs.existsSync(DB_PATH)) {
      const dbFiles = fs
        .readdirSync(DATA_DIR)
        .filter((f) => f.endsWith(".db"));
      if (dbFiles.length > 0 && dbFiles[0] !== "dpd.db") {
        fs.renameSync(path.join(DATA_DIR, dbFiles[0]), DB_PATH);
      }
    }

    console.log("Extraction complete.");
  } else {
    console.log("Database already exists at data/dpd.db");
  }

  // Verify and setup indexes
  console.log("\nSetting up indexes...");
  const db = new DatabaseSync(DB_PATH);

  // Check tables
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as Array<{ name: string }>;
  console.log(`Found tables: ${tables.map((t) => t.name).join(", ")}`);

  // Count headwords
  const count = db
    .prepare("SELECT COUNT(*) as cnt FROM dpd_headwords")
    .get() as { cnt: number };
  console.log(`Headwords: ${count.cnt}`);

  // Create additional indexes
  console.log("Creating indexes...");
  db.exec(`CREATE INDEX IF NOT EXISTS idx_headwords_lemma ON dpd_headwords(lemma_1)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_headwords_pos ON dpd_headwords(pos)`);

  // Check if lookup table has an index on lookup_key
  const lookupIdx = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='lookup' AND name LIKE '%lookup_key%'"
    )
    .all();
  if (lookupIdx.length === 0) {
    console.log("Creating lookup_key index...");
    db.exec(`CREATE INDEX IF NOT EXISTS idx_lookup_key ON lookup(lookup_key)`);
  }

  // Create FTS5 virtual table
  const ftsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dpd_fts'")
    .get();
  if (!ftsExists) {
    console.log("Building FTS5 full-text search index (this may take a moment)...");
    db.exec(`
      CREATE VIRTUAL TABLE dpd_fts USING fts5(
        lemma_1,
        meaning_1,
        meaning_lit,
        meaning_2,
        content='dpd_headwords',
        content_rowid='id'
      )
    `);
    db.exec(`
      INSERT INTO dpd_fts(rowid, lemma_1, meaning_1, meaning_lit, meaning_2)
        SELECT id, lemma_1, meaning_1, meaning_lit, meaning_2 FROM dpd_headwords
    `);
    console.log("FTS5 index created.");
  } else {
    console.log("FTS5 index already exists.");
  }

  // Create sutta source index for cross-references
  console.log("Creating sutta source indexes...");
  db.exec(`CREATE INDEX IF NOT EXISTS idx_headwords_source1 ON dpd_headwords(source_1)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_headwords_source2 ON dpd_headwords(source_2)`);

  db.close();
  console.log("\n=== Setup complete! ===");
  console.log(`Database: ${DB_PATH}`);
  console.log(`Run 'pnpm dev' to start the server.`);
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
