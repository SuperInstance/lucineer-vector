/**
 * Tests for lucineer-vector — Semantic Skill Library
 * 
 * Tests the pure functions (slug, buildEmbeddingText, requireAuth, json, err, cors)
 * and routing logic without needing Workers AI or Vectorize bindings.
 */

import { describe, it, expect } from 'vitest';

// Import the worker module to access exported internals
// Since the worker doesn't export its helpers, we test via the fetch handler
// with mock environments.

// ─── Mock helpers ──────────────────────────────────────

function makeMockEnv(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    AI: {
      run: async () => ({ data: [0.1, 0.2, 0.3] }),
    },
    SKILLS_INDEX: {
      upsert: async () => ({}),
      query: async () => ({ matches: [{ id: 'test-1', score: 0.95, metadata: { name: 'Test' } }] }),
    },
    EMBEDDING_MODEL: '@cf/baai/bge-small-en-v1.5',
    LUCINEER_SHARED_SECRET: 'test-secret',
    ...overrides,
  };
}

function makeRequest(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Request {
  const url = `https://test.example.com${path}`;
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json', ...headers };
  }
  return new Request(url, init);
}

// We need to import the worker. Since it uses `export default`,
// we'll dynamically import it.
const worker = await import('../src/index.ts');

// ─── Tests ─────────────────────────────────────────────

describe('lucineer-vector worker', () => {

  // ─── Health Check ────────────────────────────────────

  describe('GET /api/health', () => {
    it('returns ok status without auth', async () => {
      const req = makeRequest('GET', '/api/health');
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('lucineer-vector');
      expect(data.index).toBe('lucineer-skills');
      expect(data.model).toBe('@cf/baai/bge-small-en-v1.5');
    });
  });

  // ─── Auth ────────────────────────────────────────────

  describe('Authentication', () => {
    it('rejects requests without X-Lucineer-Key', async () => {
      const req = makeRequest('POST', '/api/embed', { text: 'hello' });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('rejects requests with wrong key', async () => {
      const req = makeRequest('POST', '/api/embed', { text: 'hello' }, {
        'X-Lucineer-Key': 'wrong-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(401);
    });

    it('returns 500 when secret is not configured', async () => {
      const req = makeRequest('POST', '/api/embed', { text: 'hello' }, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv({ LUCINEER_SHARED_SECRET: '' }) as any);
      
      expect(res.status).toBe(500);
    });

    it('accepts requests with correct key', async () => {
      const req = makeRequest('POST', '/api/embed', { text: 'hello' }, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(200);
    });
  });

  // ─── POST /api/embed ─────────────────────────────────

  describe('POST /api/embed', () => {
    it('returns embedding vector with correct key', async () => {
      const req = makeRequest('POST', '/api/embed', { text: 'build a house' }, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.dimensions).toBe(3);
      expect(data.vector).toEqual([0.1, 0.2, 0.3]);
    });

    it('rejects empty text', async () => {
      const req = makeRequest('POST', '/api/embed', { text: '' }, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expect(data.error).toContain('Missing');
    });

    it('rejects missing text field', async () => {
      const req = makeRequest('POST', '/api/embed', {}, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /api/skills/upsert ─────────────────────────

  describe('POST /api/skills/upsert', () => {
    it('upserts a valid skill', async () => {
      const skill = {
        name: 'Build House',
        description: 'Builds a house',
        luau_source: 'local house = Instance.new("Model")',
      };
      const req = makeRequest('POST', '/api/skills/upsert', skill, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.status).toBe('upserted');
      expect(data.id).toBe('skill-build-house');
      expect(data.name).toBe('Build House');
    });

    it('rejects skill without name', async () => {
      const req = makeRequest('POST', '/api/skills/upsert', {
        description: 'test',
        luau_source: 'code',
      }, { 'X-Lucineer-Key': 'test-secret' });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(400);
    });

    it('rejects skill without description', async () => {
      const req = makeRequest('POST', '/api/skills/upsert', {
        name: 'Test',
        luau_source: 'code',
      }, { 'X-Lucineer-Key': 'test-secret' });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(400);
    });

    it('rejects skill without luau_source', async () => {
      const req = makeRequest('POST', '/api/skills/upsert', {
        name: 'Test',
        description: 'test',
      }, { 'X-Lucineer-Key': 'test-secret' });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(400);
    });

    it('includes metadata when provided', async () => {
      const skill = {
        name: 'Build Tower',
        description: 'Builds a tower',
        luau_source: 'code here',
        metadata: { difficulty: 'hard', uses: 5 },
      };
      const req = makeRequest('POST', '/api/skills/upsert', skill, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.id).toBe('skill-build-tower');
    });
  });

  // ─── POST /api/skills/query ──────────────────────────

  describe('POST /api/skills/query', () => {
    it('queries skills with valid text', async () => {
      const req = makeRequest('POST', '/api/skills/query', {
        query: 'how to build a wall',
      }, { 'X-Lucineer-Key': 'test-secret' });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.query).toBe('how to build a wall');
      expect(data.matches).toHaveLength(1);
      expect(data.matches[0].id).toBe('test-1');
      expect(data.matches[0].score).toBe(0.95);
    });

    it('rejects empty query', async () => {
      const req = makeRequest('POST', '/api/skills/query', {
        query: '',
      }, { 'X-Lucineer-Key': 'test-secret' });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /api/skills/seed ───────────────────────────

  describe('POST /api/skills/seed', () => {
    it('seeds multiple skills', async () => {
      const skills = [
        { name: 'Skill A', description: 'A skill', luau_source: 'code-a' },
        { name: 'Skill B', description: 'B skill', luau_source: 'code-b' },
      ];
      const req = makeRequest('POST', '/api/skills/seed', skills, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.status).toBe('seeded');
      expect(data.count).toBe(2);
      expect(data.ids).toEqual(['skill-skill-a', 'skill-skill-b']);
    });

    it('rejects non-array body', async () => {
      const req = makeRequest('POST', '/api/skills/seed', { name: 'not array' }, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(400);
    });

    it('skips skills without name or luau_source', async () => {
      const skills = [
        { name: 'Good Skill', description: 'yes', luau_source: 'code' },
        { name: 'No Source', description: 'missing source' }, // skipped
      ];
      const req = makeRequest('POST', '/api/skills/seed', skills, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      const data = await res.json();
      
      expect(data.count).toBe(1);
    });
  });

  // ─── CORS preflight ──────────────────────────────────

  describe('OPTIONS (CORS)', () => {
    it('returns CORS headers for preflight', async () => {
      const req = makeRequest('OPTIONS', '/api/health');
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(200);
      // CORS header check
      const headers = res.headers;
      expect(headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });

  // ─── 404 ─────────────────────────────────────────────

  describe('Unknown routes', () => {
    it('returns 404 for unknown paths', async () => {
      const req = makeRequest('GET', '/api/unknown', undefined, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, makeMockEnv() as any);
      
      expect(res.status).toBe(404);
    });
  });

  // ─── Error handling ──────────────────────────────────

  describe('Error handling', () => {
    it('handles AI embedding failures gracefully', async () => {
      const badEnv = makeMockEnv({
        AI: {
          run: async () => { throw new Error('AI service unavailable'); },
        },
      });
      const req = makeRequest('POST', '/api/embed', { text: 'test' }, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, badEnv as any);
      const data = await res.json();
      
      expect(res.status).toBe(500);
      expect(data.error).toBeTruthy();
    });

    it('handles unexpected AI response shape', async () => {
      const weirdEnv = makeMockEnv({
        AI: {
          run: async () => ({ unexpected: true }),
        },
      });
      const req = makeRequest('POST', '/api/embed', { text: 'test' }, {
        'X-Lucineer-Key': 'test-secret',
      });
      const res = await worker.default.fetch(req, weirdEnv as any);
      
      expect(res.status).toBe(500);
    });
  });
});
