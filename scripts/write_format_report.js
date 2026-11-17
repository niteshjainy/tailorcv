// node scripts/write_format_report.js Company [master.png before.png after.png]
const fs=require('fs'),path=require('path');
const company=process.argv[2]||'Example',slug=company.replace(/[^A-Za-z0-9_-]+/g,'_');
const read=name=>JSON.parse(fs.readFileSync(path.join('work',slug+name),'utf8'));
const after=read('_format_audit.json'),build=read('_build_report.json');
const images=process.argv.slice(3);if(images.length!==3)throw new Error('Provide three image paths: master, previous output, upgraded output.');
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pictures=images.map((file,i)=>`<section><h2>${['Master','Previous output','Upgraded output'][i]}</h2><img src="${escape(path.relative('work',file).replace(/\\/g,'/'))}"></section>`).join('');
fs.writeFileSync('work/format_comparison.html',`<!doctype html><html lang="en"><meta charset="utf-8"><title>Formatting comparison</title><style>body{font:16px system-ui;margin:30px;background:#f4f5f7}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}section{background:white;padding:12px}img{width:100%}@media(max-width:900px){.grid{grid-template-columns:1fr}}</style><h1>${escape(company)} — reference comparison</h1><p>${after.passed}/${after.total} measured style checks passed. ${build.pages} page(s). This is measured style conformance, not global visual or pixel accuracy.</p><div class="grid">${pictures}</div><p>Final visual acceptance belongs to the user. See ${escape(slug)}_format_audit.json for individual properties and tolerances.</p></html>`);
console.log('Saved work/format_comparison.html');
