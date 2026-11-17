// node kit/make_cover_letter.js work/company_cover.json "Company"
const fs=require('fs'),os=require('os'),path=require('path');
const {spawnSync}=require('child_process');
const {Document,Packer}=require('docx');
const cfgLib=require('./config'),cfg=cfgLib.load();
const {loadDesignSpec}=require('./design_loader'),{renderer}=require('./design_render');
const {inspectPdf}=require('./pdf_checks'),{prepareFonts,embeddedFontOptions}=require('./font_manager');
const [,,jsonPath,company]=process.argv;
(async()=>{
  if(!jsonPath||!company)throw new Error('Usage: node kit/make_cover_letter.js cover.json "Company"');
  const c=JSON.parse(fs.readFileSync(jsonPath,'utf8')),base=JSON.parse(fs.readFileSync(cfgLib.BASE,'utf8')),original=loadDesignSpec();
  let resolved=await prepareFonts(original,cfg),spec=resolved.spec;
  resolved.messages.forEach(m=>console.log('FONT: '+m));
  const cands=[process.env.SOFFICE,'soffice.com','soffice','libreoffice','C:\\Program Files\\LibreOffice\\program\\soffice.com','C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com','/Applications/LibreOffice.app/Contents/MacOS/soffice'].filter(Boolean);
  const soffice=cands.find(x=>{const r=spawnSync(x,['--version'],{timeout:20000});return !r.error&&r.status===0;});
  if(!soffice)throw new Error('LibreOffice not found. Run npm run setup.');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cover-'));
  try{
    const docx=path.join(tmp,'cover.docx'),pdf=path.join(tmp,'cover.pdf');
    const build=async()=>{
      const {paragraph:p,numbering}=renderer(spec);
      const values={name:base.name,titleLine:base.title,locationLine:base.location,contactLine:(spec.contactOrder||['email','phone']).map(k=>base[k]).filter(Boolean).join(' | '),linksLine:[base.linkedin,...(base.links||[])].filter(Boolean).join(' | ')};
      const body=t=>p('summaryParagraph',t,{alignment:'left',bullet:null,size:spec.coverLetter.bodyFontSize,spacing:{after:spec.coverLetter.paragraphSpacing,line:spec.coverLetter.lineSpacing}});
      const children=[...(spec.headerOrder||Object.keys(values)).filter(k=>values[k]).map(k=>p(k,values[k])),body(c.greeting||'Dear Hiring Team,'),...c.paragraphs.map(body),body('Sincerely,'),body(base.name)];
      const doc=new Document({fonts:embeddedFontOptions(spec),numbering:{config:numbering},sections:[{properties:{page:{size:spec.page.size,margin:spec.margins.coverLetter||spec.margins.normal}},children}]});
      fs.writeFileSync(docx,await Packer.toBuffer(doc));if(fs.existsSync(pdf))fs.unlinkSync(pdf);
      const profile=require('url').pathToFileURL(path.join(tmp,'profile')).href;
      const r=spawnSync(soffice,['-env:UserInstallation='+profile,'--headless','--norestore','--nologo','--convert-to','pdf','--outdir',tmp,docx],{encoding:'utf8',timeout:180000});
      if(r.status!==0||!fs.existsSync(pdf))throw new Error('LibreOffice conversion failed: '+(r.stderr||r.stdout));
    };
    await build();let check;
    try{check=await inspectPdf(pdf,spec,[base.name]);}catch(e){
      if(!/fonts were substituted/.test(e.message))throw e;
      const fallback=await prepareFonts(original,{...cfg,downloadFonts:false},{forceFallback:true});
      resolved.messages.push('Renderer could not use the reference font; rebuilt with the default.',...fallback.messages);resolved.resolutions=fallback.resolutions;
      fallback.messages.forEach(m=>console.log('FONT: '+m));spec=fallback.spec;await build();check=await inspectPdf(pdf,spec,[base.name]);
    }
    const max=cfg.maxPages==='auto'?(original.source?.pageCount||original.maxPages||2):cfg.maxPages;
    if(check.pages>max)throw new Error('Cover letter exceeds '+max+' pages; shorten the text.');
    const out=path.join(cfgLib.resolveRoot(cfg),company);fs.mkdirSync(out,{recursive:true});
    const file=path.join(out,cfgLib.fileName(cfg.coverLetterFileName,base.name));fs.copyFileSync(pdf,file);
    fs.writeFileSync(path.join(out,'cover_build_report.json'),JSON.stringify({pages:check.pages,fonts:resolved.resolutions,messages:resolved.messages},null,2));
    console.log('SAVED: '+file+'\n  pages: '+check.pages+' | fonts: '+check.fonts.join(', '));
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error('STOP: '+e.message);process.exitCode=1;});
