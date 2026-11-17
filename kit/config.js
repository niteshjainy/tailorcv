// Loads config.json from the project root and fills in defaults.
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DEFAULTS = {
  outputRoot: 'output', outputFileName: '{first}_{last}_resume.pdf', coverLetterFileName: '{first}_{last}_cover_letter.pdf',
  maxPages: 'auto', fallbackFont: 'auto', downloadFonts: true, summaryEnding: '', lockTitle: true, requireAiToolsBullet: false, minNumberCoveragePercent: 85,
  skillRows: [11, 14], recentJobBullets: [10, 13], extraTools: [],
  formatAudit: true, minFormatConformancePercent: 98,
};
function load() {
  let user = {};
  const p = path.join(ROOT, 'config.json');
  if (fs.existsSync(p)) user = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { ...DEFAULTS, ...user };
}
function resolveRoot(cfg) {
  let r = process.env.RESUME_ROOT || cfg.outputRoot;
  if (r.startsWith('~')) r = path.join(os.homedir(), r.slice(1));
  return path.isAbsolute(r) ? r : path.join(ROOT, r);
}
function fileName(pattern, name) {
  const parts = String(name || 'resume').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const first = parts[0] || 'resume', last = parts.length > 1 ? parts[parts.length - 1] : '';
  return pattern.replace('{first}', first).replace('{last}', last).replace('{name}', parts.join('_')).replace(/__+/g, '_').replace(/_\./, '.');
}
const personalBase = path.join(ROOT, 'resume', 'base_resume.json');
const BASE = process.env.RESUME_BASE ? path.resolve(process.env.RESUME_BASE) : fs.existsSync(personalBase) ? personalBase : path.join(ROOT, 'resume', 'base_resume.example.json');
module.exports = { ROOT, load, resolveRoot, fileName, BASE };
