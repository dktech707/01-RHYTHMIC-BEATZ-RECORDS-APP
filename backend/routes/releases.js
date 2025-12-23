'use strict';

const { loadJson, errorEnvelope } = require('../lib/loadJson');

function normalizeKey(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]/g, '');
}

function getItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

module.exports = async function releasesRoutes(fastify, opts) {
  const DATA_DIR = opts.DATA_DIR;

  fastify.get('/releases', async () => {
    return loadJson(DATA_DIR, 'releases.json');
  });

  // Detail lookup supports: id, slug, and (fallback) normalized catalog code (cat) / title.
  fastify.get('/releases/:key', async (req, reply) => {
    const key = String(req.params.key);
    const nKey = normalizeKey(key);

    const data = loadJson(DATA_DIR, 'releases.json');
    const items = getItems(data);

    // Exact matches first
    let found =
      items.find(x => String(x?.id) === key) ||
      items.find(x => String(x?.slug) === key) ||
      null;

    // Fallback: match current catalog fields (cat/title)
    if (!found && nKey) {
      found =
        items.find(x => normalizeKey(x?.cat) === nKey) ||
        items.find(x => normalizeKey(x?.catalog) === nKey) ||
        items.find(x => normalizeKey(x?.title) === nKey) ||
        null;
    }

    if (!found) {
      return reply.code(404).send(errorEnvelope('NOT_FOUND', 'Release not found', { key }));
    }
    return found;
  });
};
