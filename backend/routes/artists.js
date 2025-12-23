'use strict';

const { loadJson, errorEnvelope } = require('../lib/loadJson');

function normalizeKey(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (čćžšđ -> cczsd)
    .replace(/[^a-z0-9]/g, '');
}

function getItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

module.exports = async function artistsRoutes(fastify, opts) {
  const DATA_DIR = opts.DATA_DIR;

  fastify.get('/artists', async () => {
    return loadJson(DATA_DIR, 'artists.json');
  });

  // Detail lookup supports: id, slug, and (fallback) normalized name.
  fastify.get('/artists/:key', async (req, reply) => {
    const key = String(req.params.key);
    const nKey = normalizeKey(key);

    const data = loadJson(DATA_DIR, 'artists.json');
    const items = getItems(data);

    // Exact matches first
    let found =
      items.find(x => String(x?.id) === key) ||
      items.find(x => String(x?.slug) === key) ||
      null;

    // Fallback: normalized name match (current artists.json ships name/location without id/slug)
    if (!found && nKey) {
      found =
        items.find(x => normalizeKey(x?.name) === nKey) ||
        items.find(x => normalizeKey(x?.artist) === nKey) ||
        null;
    }

    if (!found) {
      return reply.code(404).send(errorEnvelope('NOT_FOUND', 'Artist not found', { key }));
    }
    return found;
  });
};
