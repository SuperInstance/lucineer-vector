# 🧬 Lucineer Vector

Semantic skill library powered by Cloudflare Vectorize.

**Index:** lucineer-skills (384 dimensions, cosine)
**Worker:** https://lucineer-vector.casey-digennaro.workers.dev

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/embed | Generate embedding for text |
| POST | /api/skills/upsert | Store a skill with embedding |
| POST | /api/skills/query | Semantic search for skills |
| GET | /api/health | Health check |

## Seeded Skills (10)

1. Scrap Tower
2. Crafting Workbench  
3. Robot Follower
4. Race Track
5. Forge/Smelting Station
6. Foundation Platform
7. Wall Section
8. Resource Node
9. Light Beacon
10. Garden/Planter

Derived from Magnus's Scrapcraft and hermes-roblox-construct.

Part of the [Lucineer system](https://github.com/SuperInstance/lucineer-system).
