/**
 * Tests for lucineer-vector — Semantic Skill Library
 *
 * Tests the pure functions: slug, buildEmbeddingText, auth logic,
 * request validation, and response shapes. Mocks Workers AI and
 * Vectorize bindings.
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Import the worker (it's a default export) ────────

// We need to test the internal functions. Since they're not exported,
// we'll test through the fetch handler with mocked bindings.

// Recreate the pure functions for testing
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildEmbeddingText(skill: { name: string; description: string; luau_source: string }): string {
  return `${skill.name}\n${skill.description}\n${skill.luau_source}`;
}

function cors(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "https://lucineer-relay.casey-digennaro.workers.dev",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Lucineer-Key",
  };
}

// ─── slug() tests ─────────────────────────────────────

describe('slug', () => {
  it('lowercases the input', () => {
    expect(slug('HelloWorld')).toBe('helloworld');
  });

  it('replaces spaces with hyphens', () => {
    expect(slug('build a wall')).toBe('build-a-wall');
  });

  it('replaces special characters with hyphens', () => {
    expect(slug('Build: A Wall!')).toBe('build-a-wall');
  });

  it('collapses multiple non-alphanumeric into single hyphen', () => {
    expect(slug('a   b')).toBe('a-b');
    expect(slug('a---b')).toBe('a-b');
    expect(slug('a !@# b')).toBe('a-b');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slug('  hello  ')).toBe('hello');
    expect(slug('!!!hello!!!')).toBe('hello');
  });

  it('handles already-slugified input', () => {
    expect(slug('already-slugified')).toBe('already-slugified');
  });

  it('handles numbers', () => {
    expect(slug('build v2 step 3')).toBe('build-v2-step-3');
  });

  it('handles empty string', () => {
    expect(slug('')).toBe('');
  });

  it('handles only special characters', () => {
    expect(slug('!!!')).toBe('');
  });

  it('handles unicode by stripping non-ASCII', () => {
    // Non-ASCII letters are not in a-z0-9 so they become hyphens
    expect(slug('café')).toBe('caf');  // é gets stripped, trailing f stays
  });
});

// ─── buildEmbeddingText() tests ───────────────────────

describe('buildEmbeddingText', () => {
  it('combines name, description, and source', () => {
    const text = buildEmbeddingText({
      name: 'Build Wall',
      description: 'Creates a wall',
      luau_source: 'local wall = Instance.new("Part")',
    });
    expect(text).toBe('Build Wall\nCreates a wall\nlocal wall = Instance.new("Part")');
  });

  it('separates fields with newlines', () => {
    const text = buildEmbeddingText({
      name: 'A',
      description: 'B',
      luau_source: 'C',
    });
    expect(text).toContain('A\nB\nC');
  });

  it('preserves code formatting in source', () => {
    const text = buildEmbeddingText({
      name: 'Test',
      description: 'Desc',
      luau_source: 'function foo()\n  print("hi")\nend',
    });
    expect(text).toContain('function foo()\n  print("hi")\nend');
  });

  it('handles empty description', () => {
    const text = buildEmbeddingText({
      name: 'A',
      description: '',
      luau_source: 'code',
    });
    expect(text).toContain('A\n\ncode');
  });
});

// ─── cors() tests ─────────────────────────────────────

describe('cors', () => {
  it('returns the relay origin', () => {
    const c = cors();
    expect(c).toHaveProperty('Access-Control-Allow-Origin');
    expect(c['Access-Control-Allow-Origin']).toContain('workers.dev');
  });

  it('includes necessary methods', () => {
    const c = cors();
    const methods = c['Access-Control-Allow-Methods'] as string;
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('OPTIONS');
  });

  it('includes the auth header', () => {
    const c = cors();
    const headers = c['Access-Control-Allow-Headers'] as string;
    expect(headers).toContain('X-Lucineer-Key');
    expect(headers).toContain('Content-Type');
  });
});

// ─── Worker integration tests with mocked env ────────

// Mock types
interface MockEnv {
  AI: { run: ReturnType<typeof vi.fn> };
  SKILLS_INDEX: { upsert: ReturnType<typeof vi.fn>; query: ReturnType<typeof vi.fn> };
  EMBEDDING_MODEL: string;
  LUCINEER_SHARED_SECRET: string;
}

function makeMockEnv(overrides: Partial<MockEnv> = {}): MockEnv {
  return {
    AI: {
      run: vi.fn(async () => ({ data: [0.1, 0.2, 0.3] })),
    },
    SKILLS_INDEX: {
      upsert: vi.fn(async () => undefined),
      query: vi.fn(async () => ({
        matches: [
          { id: 'skill-test', score: 0.95, metadata: { name: 'Test' } },
        ],
      })),
    },
    EMBEDDING_MODEL: '@cf/baai/bge-small-en-v1.5',
    LUCINEER_SHARED_SECRET: 'test-secret',
    ...overrides,
  };
}

// Import the worker
import worker from '../src/index';

describe('Worker endpoints', () => {
  it('GET /api/health returns ok without auth', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/health');
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(200);
    const data: any = await resp.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('lucineer-vector');
  });

  it('POST /api/embed requires auth', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/embed', {
      method: 'POST',
      body: JSON.stringify({ text: 'hello' }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(401);
  });

  it('POST /api/embed works with valid auth', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/embed', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(200);
    const data: any = await resp.json();
    expect(data.dimensions).toBe(3);
    expect(data.vector).toEqual([0.1, 0.2, 0.3]);
  });

  it('POST /api/embed rejects empty text', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/embed', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(400);
  });

  it('POST /api/skills/upsert creates a skill', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/skills/upsert', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Build Wall',
        description: 'Creates a wall part',
        luau_source: 'local p = Instance.new("Part")',
      }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(200);
    const data: any = await resp.json();
    expect(data.status).toBe('upserted');
    expect(data.id).toBe('skill-build-wall');
    expect(env.SKILLS_INDEX.upsert).toHaveBeenCalledOnce();
  });

  it('POST /api/skills/upsert rejects missing fields', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/skills/upsert', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }), // missing description and luau_source
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(400);
  });

  it('POST /api/skills/query returns matches', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/skills/query', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'how to build' }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(200);
    const data: any = await resp.json();
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].id).toBe('skill-test');
  });

  it('POST /api/skills/query rejects empty query', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/skills/query', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(400);
  });

  it('POST /api/skills/seed batch upserts', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/skills/seed', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { name: 'Build A', description: 'A', luau_source: 'code_a' },
        { name: 'Build B', description: 'B', luau_source: 'code_b' },
        { name: 'Skip Me' }, // missing luau_source, should be skipped
      ]),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(200);
    const data: any = await resp.json();
    expect(data.status).toBe('seeded');
    expect(data.count).toBe(2); // only 2 valid skills
  });

  it('POST /api/skills/seed rejects non-array', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/skills/seed', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ not: 'an array' }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(400);
  });

  it('returns 404 for unknown routes', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/unknown', {
      headers: { 'X-Lucineer-Key': 'test-secret' },
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(404);
  });

  it('OPTIONS returns CORS headers', async () => {
    const env = makeMockEnv();
    const req = new Request('https://test.com/api/embed', { method: 'OPTIONS' });
    const resp = await worker.fetch(req, env as any);
    expect(resp.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('returns 500 when secret not configured', async () => {
    const env = makeMockEnv({ LUCINEER_SHARED_SECRET: '' });
    const req = new Request('https://test.com/api/embed', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(500);
  });

  it('returns 500 on embedding failure', async () => {
    const env = makeMockEnv({
      AI: { run: vi.fn(async () => { throw new Error('AI failed'); }) },
    });
    const req = new Request('https://test.com/api/embed', {
      method: 'POST',
      headers: { 'X-Lucineer-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    });
    const resp = await worker.fetch(req, env as any);
    expect(resp.status).toBe(500);
  });
});
