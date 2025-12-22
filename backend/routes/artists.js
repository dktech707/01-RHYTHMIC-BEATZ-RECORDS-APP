'use strict';

const { loadJson, errorEnvelope } = require('../lib/loadJson');

module.exports = async function artistsRoutes(fastify, opts) {
  const DATA_DIR = opts.DATA_DIR;

  fastify.get('/artists', async () => {
    return loadJson(DATA_DIR, 'artists.json');
  });

  // Supports either "id" or "slug" field if present; otherwise falls back to array index match.
  fastify.get('/artists/:key', async (req, reply) => {
    const key = String(req.params.key);

    const data = loadJson(DATA_DIR, 'artists.json');
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);

    const found =
      items.find(x => String(x?.id) === key) ||
      items.find(x => String(x?.slug) === key) ||
      null;

    if (!found) {
      return reply.code(404).send(errorEnvelope('NOT_FOUND', 'Artist not found', { key }));
    }
    return found;
  });
};
