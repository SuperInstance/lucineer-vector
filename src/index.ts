/**
 * Lucineer Vector — Semantic Skill Library
 *
 * Provides embedding generation, skill upsert, and semantic query
 * for Lucineer's Roblox build patterns.
 *
 * Bindings:
 *   AI           — Workers AI (bge-small-en-v1.5, 384-dim)
 *   SKILLS_INDEX — Vectorize index "lucineer-skills"
 */

export interface Env {
  AI: Ai;
  SKILLS_INDEX: VectorizeIndex;
  EMBEDDING_MODEL: string;
  LUCINEER_KEY: string;
}

// ─── Types ─────────────────────────────────────────────

interface SkillInput {
  name: string;
  description: string;
  luau_source: string;
  metadata?: Record<string, string | number | boolean>;
}

interface EmbedRequest {
  text: string;
}

interface QueryRequest {
  query: string;
  top_k?: number;
  return_metadata?: boolean;
}

// ─── Embedding Helper ──────────────────────────────────

async function embed(env: Env, text: string): Promise<number[]> {
  const res = await env.AI.run(env.EMBEDDING_MODEL as AiModel, { text });
  // Workers AI returns { shape: [1, dims], data: number[][] }
  if (res.data && Array.isArray(res.data)) {
    // bge models return number[][] — flatten first row
    if (Array.isArray(res.data[0])) {
      return res.data[0] as unknown as number[];
    }
    return res.data as number[];
  }
  throw new Error("Embedding failed: unexpected AI response shape");
}

/** Combine name + description + source for a rich semantic embedding */
function buildEmbeddingText(skill: SkillInput): string {
  return `${skill.name}\n${skill.description}\n${skill.luau_source}`;
}

// ─── Router ────────────────────────────────────────────

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: cors(),
      });
    }

    // Auth gate — health check is open, everything else requires X-Lucineer-Key
    const isHealthCheck = (path === "/api/health" || path === "/" || path === "/health") && method === "GET";
    if (!isHealthCheck) {
      const key = req.headers.get("X-Lucineer-Key");
      const expected = env.LUCINEER_KEY;
      if (!expected || key !== expected) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    try {
      // GET /api/health
      if (path === "/api/health" && method === "GET") {
        return json({ status: "ok", service: "lucineer-vector", index: "lucineer-skills", model: env.EMBEDDING_MODEL });
      }

      // POST /api/embed
      if (path === "/api/embed" && method === "POST") {
        const body = await req.json<EmbedRequest>();
        if (!body.text?.trim()) return err("Missing 'text' field", 400);
        const vector = await embed(env, body.text);
        return json({ dimensions: vector.length, vector });
      }

      // POST /api/skills/upsert
      if (path === "/api/skills/upsert" && method === "POST") {
        const skill = await req.json<SkillInput>();
        if (!skill.name?.trim()) return err("Missing 'name'", 400);
        if (!skill.description?.trim()) return err("Missing 'description'", 400);
        if (!skill.luau_source?.trim()) return err("Missing 'luau_source'", 400);

        const embeddingText = buildEmbeddingText(skill);
        const vector = await embed(env, embeddingText);

        const vectorId = `skill-${slug(skill.name)}-${Date.now()}`;
        const metadata: VectorizeVectorMetadata = {
          name: skill.name,
          description: skill.description,
          ...(skill.metadata ?? {}),
        };

        await env.SKILLS_INDEX.upsert([
          {
            id: vectorId,
            values: vector,
            metadata,
          },
        ]);

        return json({
          status: "upserted",
          id: vectorId,
          name: skill.name,
          dimensions: vector.length,
        });
      }

      // POST /api/skills/query
      if (path === "/api/skills/query" && method === "POST") {
        const body = await req.json<QueryRequest>();
        if (!body.query?.trim()) return err("Missing 'query'", 400);

        const topK = body.top_k ?? 5;
        const queryVector = await embed(env, body.query);

        const results = await env.SKILLS_INDEX.query(queryVector, {
          topK,
          returnMetadata: body.return_metadata ?? true,
        });

        return json({
          query: body.query,
          matches: results.matches?.map((m) => ({
            id: m.id,
            score: m.score,
            metadata: m.metadata,
          })) ?? [],
        });
      }

      // POST /api/skills/seed — batch upsert from an array of skills
      if (path === "/api/skills/seed" && method === "POST") {
        const skills = await req.json<SkillInput[]>();
        if (!Array.isArray(skills)) return err("Expected array of skills", 400);

        const vectors: VectorizeVector[] = [];
        for (const skill of skills) {
          if (!skill.name || !skill.luau_source) continue;
          const vec = await embed(env, buildEmbeddingText(skill));
          vectors.push({
            id: `skill-${slug(skill.name)}`,
            values: vec,
            metadata: {
              name: skill.name,
              description: skill.description,
              ...(skill.metadata ?? {}),
            },
          });
        }

        await env.SKILLS_INDEX.upsert(vectors);

        return json({
          status: "seeded",
          count: vectors.length,
          ids: vectors.map((v) => v.id),
        });
      }

      return err("Not found", 404);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return err(msg, 500);
    }
  },
};

// ─── Utils ─────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}

function err(message: string, status: number): Response {
  return json({ error: message }, status);
}

function cors(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "https://lucineer-relay.casey-digennaro.workers.dev",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Lucineer-Key",
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
