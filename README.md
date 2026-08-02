# 🧬 Lucineer Vector

Semantic skill search powered by Cloudflare Vectorize.

**Worker:** https://lucineer-vector.casey-digennaro.workers.dev
**Index:** `lucineer-skills` (384-dim cosine, bge-small-en-v1.5)

## Skills Seeded (10)

Each skill has real executable Luau code:

1. **Scrap Tower** — Scrapcraft landmark
2. **Crafting Workbench** — interactive station with ProximityPrompt
3. **Robot Follower** — ScrapBot NPC with pathfinding
4. **Race Track** — oval with checkpoints + barriers
5. **Forge/Smelting Station** — particle effects, fire glow
6. **Foundation Platform** — modular grid tiles
7. **Wall Section** — snap-build with door variant
8. **Resource Node** — harvestable with cooldown timer
9. **Light Beacon** — rotating sweep light landmark
10. **Garden/Planter** — randomized plants with sway animation

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/health | Health check |
| POST | /api/embed | Generate embedding for text |
| POST | /api/skills/upsert | Store a skill with embedding |
| POST | /api/skills/query | Semantic search |
| POST | /api/skills/seed | Batch seed skills |

Part of the [Lucineer system](https://github.com/SuperInstance/lucineer-system).
