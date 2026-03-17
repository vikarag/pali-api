# Pali API

A self-hosted REST API server for the [Digital Pali Dictionary](https://digitalpalidictionary.github.io/) (DPD). Look up Pali words, search by English meaning, browse declension tables, deconstruct compounds, and cross-reference sutta citations — all from any device on your local network.

Powered by DPD's SQLite database (88,600+ headwords, 1.28M inflected forms, 753 roots) and Node.js 24's built-in `node:sqlite` module. No external database services required.

## Quick Start

```bash
# Prerequisites: Node.js >= 24, pnpm

# Install dependencies
pnpm install

# Download DPD database (~144MB download, ~1.9GB extracted) and build search indexes
pnpm setup

# Start the server
pnpm dev
```

The server starts at `http://0.0.0.0:8080` by default, accessible from any device on your LAN.

## Configuration

Copy `.env.example` to `.env` and edit as needed:

```env
PORT=8080        # Server port
HOST=0.0.0.0     # Bind address (0.0.0.0 = all interfaces)
DB_PATH=./data/dpd.db  # Path to DPD database
```

## API Reference

All endpoints are prefixed with `/api`. The root endpoint (`GET /`) returns a JSON index of all available endpoints.

### Word Lookup

The primary use case. Accepts both headwords (`dhamma`) and inflected forms (`dhammassa`, `dhammesu`). Inflected forms are resolved to their headwords via DPD's lookup table.

#### `GET /api/words/:word`

Full dictionary entry with all available information.

```bash
curl localhost:8080/api/words/dhamma
```

```json
{
  "query": "dhamma",
  "results": [
    {
      "id": 34626,
      "lemma": "dhamma 1.01",
      "pos": "masc",
      "grammar": "masc, from dharati",
      "meanings": {
        "primary": "nature; character",
        "literal": "",
        "buddhadatta": "nature"
      },
      "etymology": {
        "root": "√dhar 1",
        "rootSign": "a",
        "rootBase": "",
        "derivedFrom": "dharati",
        "sanskrit": "dharma [dhṛ]",
        "cognate": "",
        "nonIa": "",
        "construction": "√dhar + ma"
      },
      "examples": [
        {
          "source": "SN22.97",
          "sutta": "nakhasikhāsuttaṃ",
          "text": "atthi nu kho bhante kiñci rūpaṃ..."
        }
      ],
      "inflections": {
        "list": ["dhamma", "dhammo", "dhammā", "dhammāse", "dhammaṃ", "..."],
        "html": "..."
      },
      "related": {
        "synonyms": [],
        "antonyms": [],
        "variants": [],
        "familyRoot": "dhar dhamma",
        "familyWord": "dhamma",
        "familyCompound": [],
        "familyIdioms": [],
        "familySet": []
      },
      "construction": {
        "construction": "√dhar + ma",
        "derivative": "kita",
        "suffix": "ma",
        "phonetic": "",
        "compoundType": "",
        "compoundConstruction": ""
      },
      "frequency": { "ebtCount": "", "html": "..." },
      "verb": { "type": "", "trans": "", "neg": "", "plusCase": "" },
      "commentary": "",
      "notes": "",
      "link": ""
    }
  ]
}
```

Inflected forms resolve automatically:

```bash
curl localhost:8080/api/words/dhammassa   # genitive form → resolves to dhamma headwords
curl localhost:8080/api/words/dhammesu    # locative plural → resolves to dhamma headwords
```

#### Sub-endpoints

Each returns a subset of the full entry:

| Endpoint | Returns |
|----------|---------|
| `GET /api/words/:word/grammar` | Part of speech, grammatical description, verb type, transitivity |
| `GET /api/words/:word/meanings` | Primary meaning, literal meaning, Buddhadatta's definition |
| `GET /api/words/:word/etymology` | Root, Sanskrit cognate, English cognate, derivation, construction |
| `GET /api/words/:word/examples` | Sutta citations with source, sutta name, and Pali text |
| `GET /api/words/:word/related` | Synonyms, antonyms, variants, word families |
| `GET /api/words/:word/construction` | Compound type, construction breakdown, derivative, suffix |

#### `GET /api/words/id/:id`

Direct lookup by DPD headword ID.

```bash
curl localhost:8080/api/words/id/34626
```

### Declension Tables

#### `GET /api/words/:word/declension`

Returns structured declension/conjugation tables parsed from DPD's inflection data. Cases are broken down by singular and plural with all variant forms.

```bash
curl localhost:8080/api/words/dhamma/declension
```

```json
{
  "query": "dhamma",
  "results": [
    {
      "lemma": "dhamma 1.01",
      "pos": "masc",
      "pattern": "a masc",
      "inflections": ["dhamma", "dhammo", "dhammā", "..."],
      "table": {
        "nominative": { "singular": "dhammo", "plural": ["dhammā", "dhammāse"] },
        "accusative": { "singular": "dhammaṃ", "plural": "dhamme" },
        "instrumental": { "singular": ["dhammā", "dhammena"], "plural": ["dhammebhi", "dhammehi"] },
        "dative": { "singular": ["dhammassa", "dhammāya"], "plural": "dhammānaṃ" },
        "ablative": { "singular": ["dhammato", "dhammamhā", "dhammasmā", "dhammā"], "plural": ["dhammato", "dhammebhi", "dhammehi"] },
        "genitive": { "singular": "dhammassa", "plural": ["dhammāna", "dhammānaṃ"] },
        "locative": { "singular": ["dhammamhi", "dhammasmiṃ", "dhamme"], "plural": "dhammesu" },
        "vocative": { "singular": ["dhamma", "dhammā"], "plural": "dhammā" },
        "in_compounds": { "singular": "dhamma" }
      },
      "html": "..."
    }
  ]
}
```

### Compound Deconstruction

#### `GET /api/compounds/:word`

Breaks compound words into their constituent parts with individual meanings.

```bash
curl localhost:8080/api/compounds/dhammacakka
```

```json
{
  "query": "dhammacakka",
  "results": [
    {
      "word": "dhammacakka",
      "isCompound": true,
      "compoundType": "kammadhāraya",
      "construction": "dhamma + cakka",
      "compoundConstruction": "dhamma + cakka",
      "components": [
        { "word": "dhamma 1.01", "meaning": "nature; character", "pos": "masc" },
        { "word": "cakka 1", "meaning": "wheel", "pos": "nt" }
      ]
    }
  ]
}
```

### Sutta Cross-References

#### `GET /api/suttas`

List all sutta sources referenced in the dictionary.

```bash
curl 'localhost:8080/api/suttas?limit=10'
```

#### `GET /api/suttas/:source`

Find all words that cite a specific sutta as an example.

```bash
curl localhost:8080/api/suttas/DN1    # All words with examples from Dīgha Nikāya 1
```

#### `GET /api/words/:word/suttas`

All sutta references for a specific word.

```bash
curl localhost:8080/api/words/buddha/suttas
```

### Search

#### `GET /api/search`

Universal search endpoint with multiple modes.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `q` | Search term (required) | — |
| `mode` | Search mode (see below) | `exact` |
| `limit` | Results per page (1-100) | `20` |
| `offset` | Pagination offset | `0` |
| `pos` | Filter by part of speech | — |

**Search modes:**

| Mode | Description | Example |
|------|-------------|---------|
| `exact` | Match in the lookup table (handles inflected forms) | `?q=dhammassa&mode=exact` |
| `prefix` | Headwords starting with the term | `?q=bodhi&mode=prefix` |
| `fuzzy` | Approximate match using edit distance | `?q=dhama&mode=fuzzy` |
| `english` | Full-text search across English meanings (FTS5) | `?q=suffering&mode=english` |
| `root` | Find all words derived from a Pali root | `?q=√bhū&mode=root` |

```bash
# Find Pali words meaning "suffering"
curl 'localhost:8080/api/search?q=suffering&mode=english&limit=5'

# Fuzzy match (typo-tolerant)
curl 'localhost:8080/api/search?q=dhama&mode=fuzzy'

# All verbs starting with "pa"
curl 'localhost:8080/api/search?q=pa&mode=prefix&pos=pr&limit=10'
```

### Roots

#### `GET /api/roots`

List all 753 Pali roots with pagination.

```bash
curl 'localhost:8080/api/roots?limit=10'
```

#### `GET /api/roots/:root`

Root details and all derived words. Accepts roots with or without the `√` prefix.

```bash
curl 'localhost:8080/api/roots/√bhū'    # 438 derived words
curl 'localhost:8080/api/roots/gam'      # also works without √
```

### Browse

#### `GET /api/browse`

Browse the dictionary alphabetically.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `letter` | Starting letter(s) | `a` |
| `pos` | Filter by part of speech | — |
| `limit` | Results per page (1-100) | `20` |
| `offset` | Pagination offset | `0` |

```bash
curl 'localhost:8080/api/browse?letter=b&limit=10'
curl 'localhost:8080/api/browse?letter=ni&pos=nt&limit=20'
```

### Stats & Health

```bash
curl localhost:8080/api/health   # Server status and DB counts
curl localhost:8080/api/stats    # Detailed stats including part-of-speech distribution
```

## Project Structure

```
pali-api/
├── scripts/
│   └── setup-db.ts           # Database download + FTS index builder
├── data/
│   └── dpd.db                # DPD SQLite database (gitignored)
├── src/
│   ├── index.ts              # Express server entry point
│   ├── config.ts             # Environment configuration
│   ├── db/
│   │   └── connection.ts     # SQLite connection (node:sqlite)
│   ├── models/
│   │   └── types.ts          # TypeScript interfaces
│   ├── services/
│   │   ├── word-service.ts   # Word lookup + inflection resolution
│   │   ├── search-service.ts # Search (exact, prefix, fuzzy, FTS, root)
│   │   ├── root-service.ts   # Root queries
│   │   ├── declension-service.ts  # Inflection table parser
│   │   ├── compound-service.ts    # Compound deconstruction
│   │   └── sutta-service.ts       # Sutta cross-references
│   ├── routes/
│   │   ├── words.ts, search.ts, roots.ts, compounds.ts, suttas.ts, health.ts
│   │   └── index.ts          # Route aggregator
│   └── middleware/
│       ├── cors.ts           # CORS (enabled for all origins)
│       └── error-handler.ts  # Global error handler
├── package.json
├── tsconfig.json
└── .env.example
```

## Tech Stack

- **Runtime**: Node.js 24 with built-in `node:sqlite` (no native modules to compile)
- **Language**: TypeScript
- **Framework**: Express.js 5
- **Database**: SQLite (DPD's own database, read-only)
- **Search**: SQLite FTS5 for English meaning full-text search

## Data Source

[Digital Pali Dictionary](https://digitalpalidictionary.github.io/) by the DPD project, licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

- 88,613 headwords
- 1,277,984 lookup entries (inflected forms)
- 753 roots
- 5,026 sutta sources referenced
- 25,917 compound words
- Comprehensive grammar, etymology, inflection tables, and sutta citations

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm setup` | Download DPD database and build FTS5 search index |
| `pnpm dev` | Start dev server with auto-reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled production build |

## License

ISC (server code). Dictionary data is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
