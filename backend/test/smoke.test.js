'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { fastify } = require('../server');

test('GET /api/health returns ok', async () => {
  const res = await fastify.inject({ method: 'GET', url: '/api/health' });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.ok, true);
});
