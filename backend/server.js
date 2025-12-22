'use strict';

const path = require('path');
const fastify = require('fastify')({ logger: true });

const { errorEnvelope } = require('./lib/loadJson');

// JSON data files live one directory above /backend, at repo root.
const DATA_DIR = path.resolve(__dirname, '..');

fastify.get('/api/health', async () => ({ ok: true }));

// Register routes
fastify.register(require('./routes/artists'), { prefix: '/api', DATA_DIR });
fastify.register(require('./routes/releases'), { prefix: '/api', DATA_DIR });
fastify.register(require('./routes/events'), { prefix: '/api', DATA_DIR });

// Public error handler: return sanitized errors unless explicitly marked as public.
fastify.setErrorHandler((err, request, reply) => {
  const status = Number(err.statusCode || 500);

  if (err && err.public) {
    return reply.code(status).send(err.public);
  }

  return reply
    .code(status)
    .send(errorEnvelope('INTERNAL_ERROR', 'Internal Server Error'));
});

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
