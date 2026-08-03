# lucineer-vector

**Semantic skill library powered by Cloudflare Vectorize and Workers AI embeddings.**

Provides embedding generation, skill upsert/query, and batch seeding for Lucineer's Roblox build pattern library. Player messages are semantically matched against a corpus of Luau build skills to inject relevant context into the brain pipeline.

---

## Architecture

```
Player Message ──POST /api/skills/query──▶  Worker  ──▶  Workers AI (bge-small-en-v1.5)
                                                │              │
                                                │      384-dim embedding
                                                │              │
                                                │      ▼
                                                └──▶  Vectorize Index (lucineer-skills)
                                                         │
                                                    topK query
                                                         │
                                                         ▼
                                              Matches with score + metadata
```

### Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `AI` | Workers AI | Embedding model inference |
| `SKILLS_INDEX` | Vectorize Index | Vector similarity search |
| `EMBEDDING_MODEL` | Var | `@cf/baai/bge-small-en-v1.5` (384 dimensions) |
| `LUCINEER_SHARED_SECRET` | Secret | Shared-secret authentication |

### Wrangler Configuration

```jsonc
{
  "name": "lucineer-vector",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-01",
  "compatibility_flags": ["nodejs_compat"],
  "ai": { "binding": "AI", "remote": true },
  "vectorize": [{
    "binding": "SKILLS_INDEX",
    "index_name": "lucineer-skills"
  }],
  "vars": { "EMBEDDING_MODEL": "@cf/baai/bge-small-en-v1.5" }
}
```

---

## Embedding Model

The system uses **BAAI/bge-small-en-v1.5** via Cloudflare Workers AI, producing **384-dimensional** vectors.

### Embedding Text Construction

Embeddings are generated from a composite text combining three signal sources:

```
embedding_text = f"{skill.name}\n{skill.description}\n{skill.luau_source}"
```

This ensures the vector captures semantic meaning from the skill's name, its human-readable description, and the actual Luau source code — enabling matches on both intent ("I want to build a tower") and implementation patterns (part shapes, materials, lighting).

---

## Authentication

**Uniform shared-secret auth.** Every endpoint except `GET /api/health` requires the `X-Lucineer-Key` header matching `LUCINEER_SHARED_SECRET`. If the secret is unset, the server returns 500 (fail-closed).

---

## API Reference

### `GET /api/health`

Unauthenticated health check.

```json
{
  "status": "ok",
  "service": "lucineer-vector",
  "index": "lucineer-skills",
  "model": "@cf/baai/bge-small-en-v1.5"
}
```

### `POST /api/embed`

Generate an embedding vector for arbitrary text.

**Request:** `{ "text": "string" }`
**Response:** `{ "dimensions": 384, "vector": [0.0123, -0.0456, ...] }`

### `POST /api/skills/upsert`

Insert or update a single skill in the Vectorize index.

**Request:**
```json
{
  "name": "Castle Builder",
  "description": "Builds a stone castle with 4 corner towers, walls, keep, and gate",
  "luau_source": "-- Luau source code for the skill",
  "metadata": { "category": "medieval", "difficulty": "advanced" }
}
```

**Process:**
1. Construct embedding text from `name + description + luau_source`
2. Generate 384-dim embedding via Workers AI
3. Generate vector ID: `skill-{slug(name)}-{timestamp}`
4. Upsert into Vectorize index with metadata

**Response:**
```json
{
  "status": "upserted",
  "id": "skill-castle-builder-1722640000000",
  "name": "Castle Builder",
  "dimensions": 384
}
```

### `POST /api/skills/query`

Semantic search against the skill library.

**Request:**
```json
{
  "query": "build me a spooky tower with a beacon",
  "top_k": 3,
  "return_metadata": true
}
```

**Response:**
```json
{
  "query": "build me a spooky tower with a beacon",
  "matches": [
    {
      "id": "skill-lighthouse-builder-...",
      "score": 0.892,
      "metadata": { "name": "Lighthouse Builder", "description": "..." }
    }
  ]
}
```

**Score threshold:** The processor applies a client-side threshold of **0.50** (`SKILL_SCORE_THRESHOLD`). Matches below this score are filtered out.

### `POST /api/skills/seed`

Batch upsert an array of skills. Intended for initial library population.

**Request:** Array of `SkillInput` objects (same schema as upsert).

**Response:**
```json
{
  "status": "seeded",
  "count": 35,
  "ids": ["skill-castle-builder", "skill-house-builder", ...]
}
```

---

## Skill Format

```typescript
interface SkillInput {
  name: string;                    // Human-readable skill name
  description: string;             // What the skill builds/does
  luau_source: string;             // Luau source code
  metadata?: Record<string, string | number | boolean>;  // Optional tags
}
```

### Metadata Conventions

The processor reads these metadata fields from query results:

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Display name in processor logs |
| `description` | string | Injected into brain pipeline context |
| `category` | string | Optional classification (medieval, modern, nature, ...) |
| `difficulty` | string | Optional skill level (beginner, intermediate, advanced) |

---

## Seeding

The `scripts/seed_skills.py` CLI pushes batch JSON files to the Worker:

```bash
python3 scripts/seed_skills.py scripts/skills_batch2.json
```

Batch files (`skills_batch2.json`, `skills_batch3.json`, `skills_batch4.json`) contain arrays of `SkillInput` objects. The current library contains **35+ skills** covering structures (castle, house, tower, lighthouse, dock, garden, bridge), terrain operations, and lighting patterns.

---

## CORS

CORS is configured to allow requests from the relay Worker origin:

```
Access-Control-Allow-Origin: https://lucineer-relay.casey-digennaro.workers.dev
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Lucineer-Key
```

Preflight `OPTIONS` requests return `null` body with CORS headers.

---

## Processor Integration

The `process_v2.py` processor queries this service for every incoming job:

```python
# From process_v2.py
def search_skills(player_message, top_k=3):
    result = vector_post("/api/skills/query", {
        "query": player_message,
        "top_k": top_k,
        "return_metadata": True,
    })
    # Filter by score >= 0.50
    # Format as context string for brain pipeline
```

Matches are formatted into a context block and injected into the brain pipeline's enhanced prompt alongside world state and player memory.

---

## File Layout

```
src/
└── index.ts                # Worker: router, auth, embedding, Vectorize queries
scripts/
├── seed_skills.py          # Batch seeding CLI
├── seed.js                 # Node.js seeding alternative
├── skills_batch2.json      # Skill batch data
├── skills_batch3.json
└── skills_batch4.json
wrangler.jsonc              # Cloudflare Workers configuration
```

---

## Production

**URL:** `https://lucineer-vector.casey-digennaro.workers.dev`

```bash
npx wrangler deploy
npx wrangler secret put LUCINEER_SHARED_SECRET
```

---

## Related Repositories

| Repository | Role |
|-----------|------|
| [lucineer-worker](../lucineer-worker) | Job relay, calls this service for skill lookup |
| [lucineer-memory](../lucineer-memory) | D1 player profiles and build history |
| [lucineer-brain](../lucineer-brain) | Multi-model pipeline consuming skill context |
| [lucineer-system](../lucineer-system) | Design docs and architecture specs |

---

## License

MIT
