'use strict';

const { loadJson, errorEnvelope } = require('../lib/loadJson');

module.exports = async function releasesRoutes(fastify, opts) {
  const DATA_DIR = opts.DATA_DIR;

  fastify.get('/releases', async () => {
    return loadJson(DATA_DIR, 'releases.json');
  });

  fastify.get('/releases/:key', async (req, reply) => {
    const key = String(req.params.key);

    const data = loadJson(DATA_DIR, 'releases.json');
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);

    const found =
      items.find(x => String(x?.id) === key) ||
      items.find(x => String(x?.slug) === key) ||
      null;

    if (!found) {
      return reply.code(404).send(errorEnvelope('NOT_FOUND', 'Release not found', { key }));
    }
    return found;
  });
};
