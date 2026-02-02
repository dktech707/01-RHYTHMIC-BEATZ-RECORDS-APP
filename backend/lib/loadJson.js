'use strict';

const fs = require('fs');
const path = require('path');

function errorEnvelope(code, message, details) {
  return { error: { code, message, details } };
}

function loadJson(dataDir, filename) {
  const fullPath = path.join(dataDir, filename);
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    const reason = e && e.message ? e.message : String(e);
    const err = new Error(`Failed to load JSON: ${filename} (${reason})`);
    err.public = errorEnvelope('DATA_LOAD_FAILED', `Cannot read ${filename}`, { filename });
    err.statusCode = 500;
    throw err;
  }
}

module.exports = { loadJson, errorEnvelope };
