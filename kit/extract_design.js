// node kit/extract_design.js [reference.pdf|reference.docx] [design.json] [--base resume.json]
const fs = require('fs'), path = require('path');
const { extractDesign } = require('./extract_design_lib');
const args = process.argv.slice(2), at = args.indexOf('--base');
const basePath = at < 0 ? require('./config').BASE : args[at + 1];
const positional = args.filter((x, i) => at < 0 || i !== at && i !== at + 1);
(async () => {
  let input = positional[0];
  if (!input) {
    const dir = path.join(__dirname, '..', 'resume', 'source');
    const files = fs.readdirSync(dir).filter(f => /\.(pdf|docx)$/i.test(f));
    if (files.length !== 1) throw new Error('Specify a PDF/DOCX reference explicitly; auto-selection needs exactly one in resume/source.');
    input = path.join(dir, files[0]);
  }
  if (!/\.(pdf|docx)$/i.test(input)) throw new Error('Use the original PDF or DOCX. Resume JSON contains no visual styles.');
  const output = path.resolve(positional[1] || path.join(__dirname, 'DESIGN_SPEC.json'));
  if (!/\.json$/i.test(output) || output.toLowerCase() === path.resolve(basePath).toLowerCase() || output.toLowerCase() === path.resolve(input).toLowerCase()) throw new Error('Choose a separate design .json output; source documents and base content must not be overwritten.');
  const { spec, report } = await extractDesign(path.resolve(input), JSON.parse(fs.readFileSync(basePath, 'utf8')));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(spec, null, 2) + '\n');
  const reportPath = output.replace(/\.json$/i, '') + '.report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Design saved: ${output}\nExtraction report: ${reportPath}\nReference pages: ${spec.source.pageCount}`);
  report.warnings.forEach(w => console.log('REVIEW: ' + w));
})().catch(e => { console.error('STOP: ' + e.message); process.exitCode = 1; });
