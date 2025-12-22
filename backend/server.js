'use strict';

const path = require('path');
const fastify = require('fastify')({ logger: true });

const { loadJson } = require('./lib/loadJson');

// JSON data files live one directory above /backend, at repo root.
const DATA_DIR = path.resolve(__dirname, '..');

fastify.get('/api/health', async () => ({ ok: true }));

// Register routes
fastify.register(require('./routes/artists'), { prefix: '/api', DATA_DIR });
fastify.register(require('./routes/releases'), { prefix: '/api', DATA_DIR });
fastify.register(require('./routes/events'), { prefix: '/api', DATA_DIR });

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

async function main() {
  try {
    await fastify.listen({ port, host });
    fastify.log.info(`API listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fastify };
