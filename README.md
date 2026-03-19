# Pali API

A self-hosted REST API for Pali language analysis, powered by the [Digital Pali Dictionary](https://digitalpalidictionary.github.io/) (DPD).

Two services in one:

- **`/dpd/`** — Dictionary lookup: words, inflections, declensions, compounds, roots, suttas, and full-text search
- **`/analyzer/`** — Morphological analyzer: tokenize sentences, resolve sandhi, detect compounds, disambiguate grammar, and produce interlinear glosses

Backed by DPD's SQLite database (88,600+ headwords, 1.28M inflected forms, 753 roots) and Node.js 24's built-in `node:sqlite` module. No external database services required.

**Live API:** [api.paa.li](https://api.paa.li)

## Quick Start

```bash
# Prerequisites: Node.js >= 24, pnpm

pnpm install
pnpm setup     # Downloads DPD database (~144MB download, ~1.9GB extracted)
pnpm dev       # Starts at http://0.0.0.0:8080
```

## Configuration

Copy `.env.example` to `.env`:

```env
PORT=8080
HOST=0.0.0.0
DB_PATH=./data/dpd.db
```

---

## Analyzer API — `/analyzer/`

The analyzer performs morphological analysis of Pali text. It tokenizes sentences, looks up inflected forms, resolves sandhi (phonological merging), detects compounds, and uses 17 disambiguation heuristics to rank the best grammatical reading.

### `POST /analyzer/sentence`

Full sentence analysis — the main endpoint. Tokenizes, analyzes each word, and applies sentence-level disambiguation.

```bash
curl -X POST https://api.paa.li/analyzer/sentence \
  -H "Content-Type: application/json" \
  -d '{"text": "Naro ca devo ca gacchanti."}'
```

```json
{
  "original": "Naro ca devo ca gacchanti.",
  "tokens": [
    {
      "surface": "Naro",
      "analyses": [{
        "lemma": "nara",
        "pos": "noun",
        "inflection": "masc nom sg",
        "tag": "[N.m.sg.nom]",
        "gloss": "man; person"
      }],
      "isPunctuation": false,
      "isSandhi": false,
      "isCompound": false
    },
    {
      "surface": "ca",
      "analyses": [{
        "lemma": "ca",
        "pos": "ind",
        "tag": "[Ind.conj]",
        "gloss": "and"
      }]
    },
    {
      "surface": "devo",
      "analyses": [{
        "lemma": "deva",
        "pos": "noun",
        "inflection": "masc nom sg",
        "tag": "[N.m.sg.nom]",
        "gloss": "god; deity"
      }]
    },
    {
      "surface": "ca",
      "analyses": [{ "tag": "[Ind.conj]" }]
    },
    {
      "surface": "gacchanti",
      "analyses": [{
        "lemma": "gacchati",
        "pos": "verb",
        "inflection": "pr 3rd pl",
        "tag": "[V.pres.act.3pl]",
        "gloss": "goes; walks; moves"
      }]
    },
    { "surface": ".", "isPunctuation": true }
  ]
}
```

### `GET /analyzer/word/:word`

Single-word analysis without sentence-level disambiguation. Returns all possible readings.

```bash
curl https://api.paa.li/analyzer/word/dhammassa
```

Returns analyses for all matching headwords (dative singular, genitive singular, etc.).

### `GET /analyzer/sandhi/:form`

Sandhi resolution only. Splits a merged form into its constituent words.

```bash
curl https://api.paa.li/analyzer/sandhi/tatrāyaṃ
```

```json
{
  "query": "tatrāyaṃ",
  "original": "tatrāyaṃ",
  "parts": ["tatra", "ayaṃ"],
  "analyses": [
    [{ "lemma": "tatra", "tag": "[Ind.spat]", "gloss": "there" }],
    [{ "lemma": "ayaṃ", "tag": "[Pron.m.sg.nom]", "gloss": "this" }]
  ]
}
```

### `GET /analyzer/compound/:word`

Compound analysis — identifies compound type and breaks it into components.

```bash
curl https://api.paa.li/analyzer/compound/dhammacakka
```

```json
{
  "query": "dhammacakka",
  "compoundType": "Kammadhāraya",
  "construction": "dhamma + cakka",
  "components": [
    ["dhamma", "adj", "of such nature"],
    ["cakka", "adj", "having a wheel"]
  ]
}
```

### `GET /analyzer/tag`

Generate a textbook-style grammar tag from parameters.

```bash
curl 'https://api.paa.li/analyzer/tag?pos=noun&inflection=masc+nom+sg&lemma=nara'
```

```json
{ "tag": "[N.m.sg.nom]", "pos": "noun", "inflection": "masc nom sg", "lemma": "nara" }
```

### Grammar Tag Format

Tags follow textbook Pali grammar notation:

| Tag | Meaning |
|-----|---------|
| `[N.m.sg.nom]` | Noun, masculine, singular, nominative |
| `[N.f.pl.acc]` | Noun, feminine, plural, accusative |
| `[V.pres.act.3sg]` | Verb, present tense, active voice, 3rd person singular |
| `[V.aor.act.3pl]` | Verb, aorist, active voice, 3rd person plural |
| `[PP.m.sg.nom]` | Past participle, masculine, singular, nominative |
| `[Part.m.sg.nom]` | Present participle, masculine, singular, nominative |
| `[FPP.m.sg.nom]` | Future passive participle |
| `[Ger]` | Gerund / absolutive |
| `[Inf]` | Infinitive |
| `[Ind.conj]` | Indeclinable, conjunction |
| `[Ind.neg]` | Indeclinable, negative particle |
| `[Ind.emph]` | Indeclinable, emphatic particle |
| `[Kammadh.n.sg.acc]` | Kammadhāraya compound, neuter, singular, accusative |

### Disambiguation Heuristics

When a word has multiple possible readings, the analyzer ranks them using:

1. **Indeclinable priority** — particles (`ca`, `na`, `eva`) are preferred over rare noun readings
2. **POS coherence** — avoids duplicate verb readings when another token is the verb
3. **Verb-number agreement** — singular verb → prefer singular nominative for subject
4. **Case governance** — verb's `+acc`/`+dat` boosts matching case readings
5. **Transitivity** — transitive verbs boost accusative objects
6. **Passive agent** — passive voice boosts instrumental readings
7. **Gen/dat proximity** — genitive near nouns, dative near verbs
8. **Position** — sentence-initial favors nominative
9. **Frequency** — higher EBT corpus frequency ranks higher
10. **Subject-predicate agreement** — PP/adj predicates agree with subject gender/number

### Sandhi Resolution

The analyzer resolves sandhi (phonological merging) using three strategies:

1. **Deconstructor** — DPD's own sandhi split data (highest accuracy)
2. **Particle stripping** — detects common suffixed particles (`-ti` → `iti`, `-pi` → `api`, `-va` → `eva`)
3. **Rule-based engine** — reverses vowel sandhi, niggahīta assimilation, consonant gemination, and elision

---

## Dictionary API — `/dpd/`

### Word Lookup

```bash
curl https://api.paa.li/dpd/words/dhamma       # Headword lookup
curl https://api.paa.li/dpd/words/dhammassa     # Inflected form → resolves to headwords
curl https://api.paa.li/dpd/words/id/34626      # By ID
```

### Sub-endpoints

| Endpoint | Returns |
|----------|---------|
| `GET /dpd/words/:word/grammar` | POS, grammatical description, verb type |
| `GET /dpd/words/:word/meanings` | Primary, literal, and Buddhadatta meanings |
| `GET /dpd/words/:word/etymology` | Root, Sanskrit cognate, derivation, construction |
| `GET /dpd/words/:word/examples` | Sutta citations with source and Pali text |
| `GET /dpd/words/:word/related` | Synonyms, antonyms, variants, word families |
| `GET /dpd/words/:word/construction` | Compound type, construction, derivative, suffix |
| `GET /dpd/words/:word/declension` | Full declension/conjugation table |
| `GET /dpd/words/:word/suttas` | All sutta references |

### Search

```bash
curl 'https://api.paa.li/dpd/search?q=suffering&mode=english'  # English meaning search
curl 'https://api.paa.li/dpd/search?q=bodhi&mode=prefix'       # Prefix match
curl 'https://api.paa.li/dpd/search?q=dhama&mode=fuzzy'        # Fuzzy/typo-tolerant
curl 'https://api.paa.li/dpd/search?q=√bhū&mode=root'          # By root
```

| Mode | Description |
|------|-------------|
| `exact` | Exact match in lookup table (handles inflected forms) |
| `prefix` | Headwords starting with the term |
| `fuzzy` | Approximate match using edit distance |
| `english` | Full-text search across English meanings (FTS5) |
| `root` | All words derived from a Pali root |

### Compounds, Roots, Suttas

```bash
curl https://api.paa.li/dpd/compounds/dhammacakka   # Compound deconstruction
curl https://api.paa.li/dpd/roots                    # All 753 roots
curl https://api.paa.li/dpd/roots/√bhū               # Root detail + derived words
curl https://api.paa.li/dpd/suttas                   # All sutta sources
curl https://api.paa.li/dpd/suttas/DN1               # Words citing a sutta
```

### Browse, Stats, Health

```bash
curl 'https://api.paa.li/dpd/browse?letter=b&limit=10'
curl https://api.paa.li/dpd/health
curl https://api.paa.li/dpd/stats
```

**Diacritical normalization:** `ṁ` (dot above) and `ṃ` (dot below) are treated as interchangeable across all endpoints.

---

## Project Structure

```
pali-api/
├── src/
│   ├── index.ts                    # Express server, route mounting
│   ├── config.ts                   # Environment configuration
│   ├── db/
│   │   └── connection.ts           # SQLite connection (node:sqlite)
│   ├── models/
│   │   └── types.ts                # All TypeScript interfaces
│   ├── dpd/                        # Dictionary API (/dpd/)
│   │   ├── routes/
│   │   │   ├── index.ts            # DPD route aggregator
│   │   │   ├── words.ts, search.ts, roots.ts, compounds.ts, suttas.ts, health.ts
│   │   └── services/
│   │       ├── word-service.ts     # Word lookup + inflection resolution
│   │       ├── search-service.ts   # Multi-mode search
│   │       ├── root-service.ts     # Root queries
│   │       ├── declension-service.ts # Inflection table parser
│   │       ├── compound-service.ts # Compound deconstruction (DPD)
│   │       └── sutta-service.ts    # Sutta cross-references
│   ├── analyzer/                   # Morphological Analyzer API (/analyzer/)
│   │   ├── routes/
│   │   │   └── index.ts            # /analyzer/* routes
│   │   └── services/
│   │       ├── analyzer-service.ts # Pipeline orchestrator
│   │       ├── tokenizer.ts        # Sentence → WordToken[]
│   │       ├── lookup-service.ts   # DB queries for analyzer
│   │       ├── tagger.ts           # Grammar tag generation
│   │       ├── sandhi-service.ts   # Deconstructor-based sandhi
│   │       ├── sandhi-rules.ts     # Rule-based sandhi engine
│   │       ├── compound-analyzer.ts # Compound detection
│   │       └── disambiguator.ts    # 17 disambiguation heuristics
│   ├── utils/
│   │   └── normalize.ts            # Pali diacritical normalization
│   └── middleware/
│       ├── cors.ts
│       └── error-handler.ts
├── scripts/
│   └── setup-db.ts                 # Database download + FTS index builder
├── package.json
├── tsconfig.json
└── .env.example
```

## Tech Stack

- **Runtime:** Node.js 24 with built-in `node:sqlite`
- **Language:** TypeScript
- **Framework:** Express.js 5
- **Database:** SQLite (DPD's own database, read-only)
- **Search:** SQLite FTS5 for English meaning full-text search

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm setup` | Download DPD database and build FTS5 search index |
| `pnpm dev` | Start dev server with auto-reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled production build |

## Data Source

[Digital Pali Dictionary](https://digitalpalidictionary.github.io/) by the DPD project, licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

- 88,613 headwords
- 1,277,984 lookup entries (inflected forms)
- 753 roots
- 5,026 sutta sources referenced
- 25,917 compound words

## License

ISC (server code). Dictionary data is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
