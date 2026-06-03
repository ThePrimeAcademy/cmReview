// Tiny .env loader — no dotenv dependency (mirrors the quizScrape approach).
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile();

module.exports = {
  PORT: Number(process.env.PORT) || 4180,
  EXPORT_URL: process.env.EXPORT_URL || '',
  EXPORT_TOKEN: process.env.EXPORT_TOKEN || '',
  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, '../data'),
  // Optional shared password for hosted deployments — unset = auth disabled.
  APP_PASSWORD: process.env.APP_PASSWORD || '',
};
