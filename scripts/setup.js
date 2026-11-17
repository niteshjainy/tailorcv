// Usage: node scripts/setup.js [--check] [--yes]
//   (no flag)  check everything and offer to install what is missing
//   --check    only check, change nothing ("npm run doctor")
//   --yes      install missing things without asking
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path'), readline = require('readline');
const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check'), YES = process.argv.includes('--yes');
const plat = process.platform;
const ok = (m) => console.log('  [ok]      ' + m), miss = (m) => console.log('  [missing] ' + m), info = (m) => console.log('  [info]    ' + m);
const run = (cmd, args, opt = {}) => spawnSync(cmd, args, { encoding: 'utf8', shell: plat === 'win32', ...opt });
const has = (cmd, args = ['--version']) => { const r = run(cmd, args, { timeout: 60000, shell: false }); return !r.error && r.status === 0; };
const ask = (q) => YES ? Promise.resolve(true) : new Promise((res) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q + ' [y/N] ', (a) => { rl.close(); res(/^y/i.test(a.trim())); }); });

function findSoffice() {
  const c = [process.env.SOFFICE, 'soffice.com', 'soffice', 'libreoffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.com', 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe', '/Applications/LibreOffice.app/Contents/MacOS/soffice'].filter(Boolean);
  return c.find((x) => has(x));
}
function fontsOk() {
  if (plat !== 'linux') return true; // Windows ships Calibri; the Mac LibreOffice build bundles Carlito
  const r = run('fc-list', [], { shell: false });
  return !r.error && /carlito|calibri/i.test(r.stdout || '');
}

(async () => {
  console.log('\nResume agent: environment check\n');
  let problems = 0;
  const personalBase = path.join(ROOT, 'resume', 'base_resume.json');
  const exampleBase = path.join(ROOT, 'resume', 'base_resume.example.json');
  if (!fs.existsSync(personalBase) && fs.existsSync(exampleBase)) {
    if (!CHECK) { fs.copyFileSync(exampleBase, personalBase); info('Created your git-ignored base_resume.json from the fictional example.'); }
    else info('Run npm run setup to create your private base resume from the example.');
  }
  if (!CHECK) { fs.mkdirSync(path.join(ROOT, 'work'), { recursive: true }); fs.mkdirSync(path.join(ROOT, 'resume', 'source'), { recursive: true }); }

  // 1) Node
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major > 22 || major === 22 && minor >= 13) ok('Node.js ' + process.version); else { miss('Node.js 22.13 or newer is required for PDF design extraction (found ' + process.version + ').'); problems++; }

  // 2) npm packages
  let depsOk = false; try { for (const name of ['docx', 'pdfjs-dist/package.json', 'fast-xml-parser', 'fflate']) require.resolve(name, { paths: [ROOT] }); depsOk = true; } catch (e) {}
  if (depsOk) ok('npm packages installed');
  else {
    miss('npm packages (run "npm install")'); problems++;
    if (!CHECK && await ask('  Run "npm install" now?')) { const r = run('npm', ['install'], { cwd: ROOT, stdio: 'inherit' }); if (r.status === 0) { ok('npm packages installed'); problems--; } }
  }

  // 3) LibreOffice
  let soffice = findSoffice();
  if (soffice) ok('LibreOffice found (' + soffice + ')');
  else {
    miss('LibreOffice (needed to create the PDF)'); problems++;
    let cmd = null;
    if (plat === 'win32') cmd = has('winget') ? ['winget', ['install', '--id', 'TheDocumentFoundation.LibreOffice', '-e', '--accept-source-agreements', '--accept-package-agreements']] : has('choco') ? ['choco', ['install', 'libreoffice-fresh', '-y']] : null;
    else if (plat === 'darwin') cmd = has('brew') ? ['brew', ['install', '--cask', 'libreoffice']] : null;
    else if (has('apt-get')) cmd = ['sudo', ['apt-get', 'install', '-y', 'libreoffice', 'fonts-crosextra-carlito']];
    else if (has('dnf')) cmd = ['sudo', ['dnf', 'install', '-y', 'libreoffice', 'google-carlito-fonts']];
    else if (has('pacman', ['-V'])) cmd = ['sudo', ['pacman', '-S', '--noconfirm', 'libreoffice-fresh', 'ttf-carlito']];
    if (!cmd) info('Install it manually from https://www.libreoffice.org/download (free), then run this check again.');
    else if (!CHECK && await ask('  Install LibreOffice now with "' + cmd[0] + ' ' + cmd[1].join(' ') + '"?')) {
      const r = run(cmd[0], cmd[1], { stdio: 'inherit' });
      soffice = findSoffice();
      if (r.status === 0 && soffice) { ok('LibreOffice installed'); problems--; }
      else info('Install did not finish. Close and reopen your terminal, then run "npm run doctor". If it still fails, install LibreOffice manually from libreoffice.org.');
    } else if (CHECK) info('To install: ' + cmd[0] + ' ' + cmd[1].join(' '));
  }

  // 4) Fonts
  if (fontsOk()) ok('Calibri/Carlito font available'); else {
    miss('Carlito font (Calibri-compatible). Linux: sudo apt-get install fonts-crosextra-carlito'); problems++;
    if (!CHECK && has('apt-get') && await ask('  Install fonts-crosextra-carlito now?')) { const r = run('sudo', ['apt-get', 'install', '-y', 'fonts-crosextra-carlito'], { stdio: 'inherit' }); if (r.status === 0) { ok('font installed'); problems--; } }
  }
  try { const design = JSON.parse(fs.readFileSync(path.join(ROOT, 'kit', 'DESIGN_SPEC.json'), 'utf8')); info('Active reference font: ' + design.fonts.primary + ' (build checks installed fonts, tries licensed downloads, then reports any default-font replacement)'); } catch (e) {}

  // 5) Optional: poppler (extra PDF text checks)
  if (has('pdftotext', ['-v'])) ok('pdftotext found (extra text checks enabled)'); else info('Optional: install poppler for an extra PDF text check (Windows: winget install poppler, Mac: brew install poppler, Linux: sudo apt-get install poppler-utils)');

  // 6) base resume
  try {
    const base = JSON.parse(fs.readFileSync(fs.existsSync(personalBase) ? personalBase : exampleBase, 'utf8'));
    if (/example\.com$/.test(base.email || '') || base.name === 'ALEX MORGAN') info('resume/base_resume.json is still the SAMPLE resume. See docs/02-CONFIGURE-YOUR-RESUME.md to replace it with yours.');
    else ok('resume/base_resume.json is set up for ' + base.name);
  } catch (e) { miss('resume/base_resume.json is missing or not valid JSON'); problems++; }

  console.log(problems ? `\n${problems} problem(s) left. Fix them and run "npm run doctor" again.\n` : '\nAll set. Next: docs/03-CONNECT-AN-LLM.md, then docs/04-USAGE.md.\n');
  process.exit(problems ? 1 : 0);
})();
