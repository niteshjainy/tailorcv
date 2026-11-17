// Usage: node kit/lint.js work/<company>.json [--jd work/<company>_jd.txt] [--base resume/base_resume.json]
// ERROR   = build stops. WARNING = fix before sending. NOTE = tell the user (for example new estimated numbers).
const fs = require('fs');
const cfgLib = require('./config');
const cfg = cfgLib.load();

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const jsonPath = args[0];
const jdPath = opt('--jd');
const basePath = opt('--base') || cfgLib.BASE;
if (!jsonPath) { console.error('Usage: node kit/lint.js resume.json [--jd jd.txt]'); process.exit(1); }

const d = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const errors = [], warns = [], notes = [];
const design = require('./design_loader').loadDesignSpec();
// Onboarding preserves source wording; tailoring targets apply to work copies.
const isBase = require('path').resolve(jsonPath) === require('path').resolve(basePath);
const E = (m) => errors.push(m), W = (m) => (isBase ? notes : warns).push(m), N = (m) => notes.push(m);
if (design.summaryPlacement === 'header') {
  const keys = (design.headerRows || []).flatMap(r => r.keys);
  if (keys.filter(k => k === 'summaryParagraph').length !== 1) E('Header-summary design must contain exactly one summaryParagraph row. Re-extract or fix the design.');
  if (keys.includes('titleLine') && design.titleRole === 'summary') E('The prose header must not be rendered as a fixed title alongside the tailored summary.');
}

// ---- fixed facts: must equal the base resume ----
for (const k of ['name', 'email', 'phone', 'linkedin']) if ((d[k] || '') !== (base[k] || '')) E(`${k} must stay exactly "${base[k] || ''}" (found "${d[k] || ''}")`);
if (cfg.lockTitle && d.title !== base.title) E(`title line must stay "${base.title}" (found "${d.title}")`);
if (!Array.isArray(d.jobs) || d.jobs.length !== base.jobs.length) E(`There must be exactly ${base.jobs.length} jobs, same order as the base resume`);
else base.jobs.forEach((b, i) => {
  const j = d.jobs[i];
  for (const k of ['company', 'title', 'dates', 'keyProjects']) if ((j[k] || '') !== (b[k] || '')) E(`Job ${i + 1} ${k} must stay "${b[k] || ''}" (found "${j[k] || ''}")`);
});
if (JSON.stringify(d.education) !== JSON.stringify(base.education)) E('Education must stay exactly as in the base resume');
if (JSON.stringify(d.certifications || []) !== JSON.stringify(base.certifications || [])) E('Certifications must stay exactly as in the base resume');
if (JSON.stringify(d.links || []) !== JSON.stringify(base.links || [])) E('Links must stay exactly as in the base resume');

// ---- text rules ----
if (cfg.summaryEnding && !(d.summary || '').trim().endsWith(cfg.summaryEnding)) E(`Summary must end with "${cfg.summaryEnding}"`);
const bad = /\b(efficient(ly)?|framework|toolkit)\b/i;
const allBullets = d.jobs.flatMap((j) => j.bullets || []);
allBullets.forEach((b) => { if (bad.test(b)) E(`Banned buzzword in bullet: "${b.slice(0, 60)}..."`); });
const txt = JSON.stringify(d);
if (/[ƟŌƫƞ]|\(cid:/.test(txt)) E('Broken ligature characters found');
if (/ {2,}/.test(txt)) W('Double spaces found');
if (!d.location) W('Location line is empty. Set it to match the JD (Remote / Hybrid / Relocation).');

// ---- structure ----
const [sMin, sMax] = cfg.skillRows, [bMin, bMax] = cfg.recentJobBullets;
if (d.skills.length < sMin || d.skills.length > sMax) W(`Skills rows: ${d.skills.length} (aim for ${sMin}-${sMax})`);
const g = d.jobs[0].bullets || [];
if (g.length < bMin || g.length > bMax) W(`Most recent job bullets: ${g.length} (aim for ${bMin}-${bMax})`);
const aiBullet = g.find((b) => /Copilot|Claude|Codex|Cursor|ChatGPT|Gemini/.test(b) && /review|correctness|security|validat/i.test(b));
if (cfg.requireAiToolsBullet && !aiBullet) W('Most recent job needs an AI-tools bullet (tools + reviewing output for correctness and security)');
d.skills.forEach(([l, i]) => { if (!l || !i) E('Every skills row needs a label and items'); if ((l + i).length > 200) W(`Skills row too long (${(l + i).length} chars): ${l}`); });

// ---- bullet quality ----
const verbs = g.map((b) => b.split(' ')[0].toLowerCase());
const dup = verbs.filter((v, i) => verbs.indexOf(v) !== i);
if (dup.length) (isBase ? N : E)(`Most recent job repeats starting verbs: ${[...new Set(dup)].join(', ')}`);
const noNum = allBullets.filter((b) => !/\d/.test(b));
const cov = Math.round(100 * (allBullets.length - noNum.length) / Math.max(1, allBullets.length));
if (cov < cfg.minNumberCoveragePercent) { W(`Only ${cov}% of bullets contain a number (target ${cfg.minNumberCoveragePercent}%+). Add a number to:`); noNum.forEach((b) => W('   - ' + b.slice(0, 90))); }

// ---- metrics must stay with their original achievement ----
const pct = (s) => [...s.matchAll(/(\d+)\s?%/g)].map((m) => m[1] + '%');
const STOP = new Set(['about', 'using', 'across', 'through', 'applications', 'application', 'engineers', 'delivery', 'production', 'enterprise', 'development', 'quality', 'improving', 'resulting', 'reducing', 'shortening', 'speeding', 'cutting', 'trimming', 'lifting', 'resolving', 'accelerating', 'delivering', 'through', 'faster', 'feature', 'features']);
const sig = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 6 && !STOP.has(w)));
const baseBullets = base.jobs.flatMap((j) => j.bullets || []);
const basePct = new Map();
baseBullets.forEach((b) => pct(b).forEach((p) => { if (!basePct.has(p)) basePct.set(p, []); basePct.get(p).push(b); }));
allBullets.forEach((b) => pct(b).forEach((p) => {
  if (!basePct.has(p)) { N(`New estimated number ${p}: "${b.slice(0, 70)}..." (not in the base resume, mention it as an estimate)`); return; }
  const mine = sig(b);
  const related = basePct.get(p).some((bb) => [...sig(bb)].some((w) => mine.has(w)));
  if (!related) W(`${p} appears in a bullet unrelated to the base bullet it came from. Keep each metric with its original achievement: "${b.slice(0, 70)}..."`);
}));

// ---- tool consistency: tools used in summary/bullets must also be listed in Skills ----
const TOOLS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Redux Toolkit', 'Redux Saga', 'Redux Thunk', 'Redux', 'Zustand', 'React Query', 'TanStack Query',
  'Microsoft Azure', 'Azure Kubernetes Service', 'AKS', 'Java', 'Spring Boot', 'Express.js',
  'GraphQL', 'Axios', 'WebSockets', 'Server-Sent Events', 'Tailwind CSS', 'Styled Components', 'Material UI', 'Ant Design', 'Bootstrap', 'shadcn/ui',
  'Formik', 'Yup', 'Jest', 'Vitest', 'Cypress', 'Playwright', 'React Testing Library', 'Storybook', 'AWS CDK', 'AWS', 'Azure', 'GCP', 'Serverless',
  'GitHub Actions', 'Jenkins', 'GitLab CI', 'Docker', 'Kubernetes', 'Vite', 'Webpack', 'pnpm', 'Git', 'GitHub', 'Jira', 'Confluence', 'Postman', 'Figma',
  'JWT', 'OAuth', 'Azure AD', 'Okta', 'Core Web Vitals', 'Lighthouse', 'WCAG', 'ARIA', 'i18next', 'Electron', 'MCP', 'Claude Code', 'GitHub Copilot',
  'OpenAI Codex', 'Cursor', 'Recharts', 'Chart.js', 'D3.js', 'PWA', 'SSR', 'SSG', 'ISR', 'Angular', 'Vue.js', 'Django', 'Kafka', 'Sitecore', 'ESLint',
  ...(cfg.extraTools || []),
].sort((a, b) => b.length - a.length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const has = (text, tool) => new RegExp('(^|[^A-Za-z0-9])' + esc(tool) + '($|[^A-Za-z0-9])', 'i').test(text);
const skillsText = d.skills.map(([l, i]) => l + ' ' + i).join(' ; ');
const usedText = [d.summary, ...allBullets].join(' ; ');
const missing = TOOLS.filter((t) => has(usedText, t) && !has(skillsText, t));
// "Redux" is satisfied by "Redux Toolkit" etc., and "React" by "React.js"
const covered = (t) => (t === 'Redux' && /redux/i.test(skillsText)) || (t === 'React' && /react/i.test(skillsText)) || (t === 'AWS' && /aws/i.test(skillsText)) || (t === 'Azure' && /azure/i.test(skillsText));
const missing2 = missing.filter((t) => !covered(t));
if (missing2.length) W(`Tools in summary/bullets but missing from Skills: ${missing2.join(', ')}`);

// ---- summary opening ----
const first8 = (d.summary || '').split(/\s+/).slice(0, 8).join(' ');
if (/[()\[\]]/.test(first8)) W(`Summary opens with brackets/parentheses in the first 8 words (looks like a company-specific title): "${first8}"`);

// ---- optional JD check: JD-internal names must not leak into the resume ----
if (jdPath && fs.existsSync(jdPath)) {
  const jd = fs.readFileSync(jdPath, 'utf8');
  const phrases = [...new Set([...jd.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g)].map((m) => m[1]))];
  const SKIP = new Set(['Senior', 'Frontend', 'Backend', 'Engineer', 'Developer', 'Lead', 'Design', 'Remote', 'Hybrid', 'Relocation', 'Software', 'Full', 'Stack', 'Web', 'Team', 'Product', 'Engineering']);
  const baseText = JSON.stringify(base);
  const resumeText = JSON.stringify(d);
  const leaked = phrases.filter((p) => !p.split(' ').every((w) => SKIP.has(w)) && !TOOLS.some((t) => t.toLowerCase() === p.toLowerCase()) && !baseText.includes(p) && resumeText.includes(p));
  if (leaked.length) W(`Phrases from the JD appear in the resume and may be company/product names (remove them unless they are technologies): ${leaked.join(', ')}`);
}

errors.forEach((m) => console.error('ERROR:   ' + m));
warns.forEach((m) => console.error('WARNING: ' + m));
notes.forEach((m) => console.error('NOTE:    ' + m));
if (!errors.length && !warns.length) console.log('LINT OK' + (notes.length ? ' (with notes)' : ''));
process.exit(errors.length ? 1 : 0);
