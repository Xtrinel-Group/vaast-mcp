import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { VaastClient, validateSession, type SessionInfo } from './client.js';

interface FakeVaast {
  server: Server;
  port: number;
  ids: number[];
}

async function startFakeVaast(
  token: string,
  handler: (body: any) => { status?: number; json?: unknown; hang?: boolean },
): Promise<FakeVaast> {
  const ids: number[] = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (req.headers.authorization !== `Bearer ${token}`) {
        res.writeHead(401).end();
        return;
      }
      const body = JSON.parse(raw);
      ids.push(body.id);
      const reply = handler(body);
      if (reply.hang) return;
      res.writeHead(reply.status ?? 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply.json ?? { jsonrpc: '2.0', id: body.id, result: {} }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: (server.address() as AddressInfo).port, ids };
}

function stop(fake: FakeVaast) {
  fake.server.closeAllConnections();
  fake.server.close();
}

test('forwards a request and returns the result', async () => {
  const fake = await startFakeVaast('t1', (body) => ({
    json: { jsonrpc: '2.0', id: body.id, result: { method: body.method } },
  }));
  try {
    const client = new VaastClient(async () => ({ port: fake.port, token: 't1' }));
    assert.deepEqual(await client.request('tools/list'), { method: 'tools/list' });
  } finally {
    stop(fake);
  }
});

test('request ids are unique even for back-to-back calls', async () => {
  const fake = await startFakeVaast('t1', () => ({}));
  try {
    const client = new VaastClient(async () => ({ port: fake.port, token: 't1' }));
    await Promise.all([client.request('a'), client.request('b'), client.request('c')]);
    assert.equal(new Set(fake.ids).size, 3);
  } finally {
    stop(fake);
  }
});

test('re-reads the session file after a 401 (VAAST restarted with a new token)', async () => {
  const fake = await startFakeVaast('new-token', () => ({}));
  try {
    const sessions: SessionInfo[] = [
      { port: fake.port, token: 'old-token' },
      { port: fake.port, token: 'new-token' },
    ];
    let loads = 0;
    const client = new VaastClient(async () => sessions[loads++]);
    await client.request('tools/list');
    assert.equal(loads, 2);
  } finally {
    stop(fake);
  }
});

test('re-reads the session file when the old port is gone', async () => {
  const dead = await startFakeVaast('t1', () => ({}));
  const deadPort = dead.port;
  stop(dead);
  const live = await startFakeVaast('t1', () => ({}));
  try {
    const sessions: SessionInfo[] = [
      { port: deadPort, token: 't1' },
      { port: live.port, token: 't1' },
    ];
    let loads = 0;
    const client = new VaastClient(async () => sessions[loads++]);
    await client.request('tools/list');
    assert.equal(loads, 2);
  } finally {
    stop(live);
  }
});

test('gives a clear error when VAAST stays unreachable', async () => {
  const client = new VaastClient(async () => ({ port: 1, token: 't1' }));
  await assert.rejects(client.request('tools/list'), /Could not reach VAAST/);
});

test('times out instead of hanging', async () => {
  const fake = await startFakeVaast('t1', () => ({ hang: true }));
  try {
    const client = new VaastClient(async () => ({ port: fake.port, token: 't1' }), 200);
    await assert.rejects(client.request('tools/list'), /did not respond/);
  } finally {
    stop(fake);
  }
});

test('passes JSON-RPC errors through', async () => {
  const fake = await startFakeVaast('t1', (body) => ({
    json: { jsonrpc: '2.0', id: body.id, error: { code: -32602, message: 'bad workspace' } },
  }));
  try {
    const client = new VaastClient(async () => ({ port: fake.port, token: 't1' }));
    await assert.rejects(client.request('tools/call'), /bad workspace/);
  } finally {
    stop(fake);
  }
});

test('validateSession rejects bad session files', () => {
  assert.throws(() => validateSession(null), /Invalid port/);
  assert.throws(() => validateSession({ port: '8080', token: 'x' }), /Invalid port/);
  assert.throws(() => validateSession({ port: 70000, token: 'x' }), /Invalid port/);
  assert.throws(() => validateSession({ port: 8080, token: '' }), /Missing token/);
  assert.deepEqual(validateSession({ port: 8080, token: 'x' }), {
    port: 8080,
    token: 'x',
    protocol_version: undefined,
  });
});
