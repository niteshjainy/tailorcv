// node kit/make_resume.js resume.json "Company" [--jd jd.txt] [--pages 1|2]
// --pages is per build and must reflect the user's explicit page preference.
const fs=require('fs'),os=require('os'),path=require('path');
const {spawnSync}=require('child_process');
const cfgLib=require('./config'),cfg=cfgLib.load();
const {prepareFonts}=require('./font_manager');
const {inspectPdf}=require('./pdf_checks');
const {pageDecision}=require('./page_policy');
const args=process.argv.slice(2),jsonPath=args[0],company=args[1];
const option=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
function runNode(args,env={}){const r=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,...env}});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);if(r.status!==0||/WARNING:/.test((r.stdout||'')+(r.stderr||'')))throw new Error('Fix the build/lint errors and warnings before continuing.');}
(async()=>{
  if(!jsonPath||!company)throw new Error('Usage: node kit/make_resume.js resume.json "Company" [--jd jd.txt] [--pages 1|2]');
  const original=require('./design_loader').loadDesignSpec();
  require('./page_policy').pageLimit(cfg,original,option('--pages'));
  runNode([path.join(__dirname,'lint.js'),jsonPath,...(option('--jd')?['--jd',option('--jd')]:[])]);
  const candidates=[process.env.SOFFICE,'soffice.com','soffice','libreoffice','C:\\Program Files\\LibreOffice\\program\\soffice.com','C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com','/Applications/LibreOffice.app/Contents/MacOS/soffice'].filter(Boolean);
  const soffice=candidates.find(c=>{const r=spawnSync(c,['--version'],{encoding:'utf8',timeout:20000});return !r.error&&r.status===0;});
  if(!soffice)throw new Error('LibreOffice not found. Run npm run setup; do not use another PDF generator.');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'resume-'));
  try{
    const resolved=await prepareFonts(original,cfg),spec=resolved.spec;
    resolved.messages.forEach(m=>console.log('FONT: '+m));
    const effective=path.join(tmp,'design.json');fs.writeFileSync(effective,JSON.stringify(spec));
    const docx=path.join(tmp,'resume.docx'),pdf=path.join(tmp,'resume.pdf');
    runNode([path.join(__dirname,'build_resume.js'),jsonPath,docx],{RESUME_DESIGN:effective});
    const profile=require('url').pathToFileURL(path.join(tmp,'profile')).href;
    const r=spawnSync(soffice,['-env:UserInstallation='+profile,'--headless','--norestore','--nologo','--convert-to','pdf','--outdir',tmp,docx],{encoding:'utf8',timeout:180000});
    if(r.status!==0||!fs.existsSync(pdf))throw new Error('LibreOffice conversion failed: '+(r.stderr||r.stdout));
    const resume=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
    const required=[resume.name,resume.email,resume.phone,spec.sectionHeadings?.technicalSkills?.text||'Technical Skills',...resume.jobs.map(j=>j.company)];
    if(spec.summaryPlacement!=='header'&&resume.summary&&!(resume.summary===resume.title&&!spec.sectionHeadings?.professionalSummary))required.push(spec.sectionHeadings?.professionalSummary?.text||'Professional Summary');
    let check;
    try{check=await inspectPdf(pdf,spec,required);}
    catch(e){
      // A renderer may reject an embedded font despite its license flags. Rebuild
      // with the known installed default, and disclose that runtime fallback.
      if(!/fonts were substituted/.test(e.message))throw e;
      const fallback=await prepareFonts(original,{...cfg,downloadFonts:false},{forceFallback:true});
      if(JSON.stringify(fallback.spec.elements)===JSON.stringify(spec.elements)&&!spec.embeddedFonts.length)throw e;
      resolved.messages.push('Embedded/reference font could not be rendered: '+e.message,...fallback.messages);
      resolved.messages.slice(-fallback.messages.length-1).forEach(m=>console.log('FONT: '+m));
      resolved.resolutions=fallback.resolutions;Object.assign(spec,fallback.spec);fs.writeFileSync(effective,JSON.stringify(spec));
      runNode([path.join(__dirname,'build_resume.js'),jsonPath,docx],{RESUME_DESIGN:effective});fs.unlinkSync(pdf);
      const again=spawnSync(soffice,['-env:UserInstallation='+profile,'--headless','--norestore','--nologo','--convert-to','pdf','--outdir',tmp,docx],{encoding:'utf8',timeout:180000});
      if(again.status!==0||!fs.existsSync(pdf))throw new Error('LibreOffice default-font rebuild failed.');
      check=await inspectPdf(pdf,spec,required);
    }
    const calibration=[];
    if(original.source?.path&&fs.existsSync(original.source.path))for(let pass=0;pass<3;pass++){
      const adjustments=await require('./calibrate_spacing').calibrateSpacing(original.source.path,pdf,JSON.parse(fs.readFileSync(cfgLib.BASE,'utf8')),resume,spec);
      if(!adjustments.length)break;calibration.push({pass:pass+1,adjustments});
      console.log('FORMAT: calibrating '+adjustments.length+' fixed gaps against reference (pass '+(pass+1)+').');
      fs.writeFileSync(effective,JSON.stringify(spec));runNode([path.join(__dirname,'build_resume.js'),jsonPath,docx],{RESUME_DESIGN:effective});fs.unlinkSync(pdf);
      const again=spawnSync(soffice,['-env:UserInstallation='+profile,'--headless','--norestore','--nologo','--convert-to','pdf','--outdir',tmp,docx],{encoding:'utf8',timeout:180000});
      if(again.status!==0||!fs.existsSync(pdf))throw new Error('LibreOffice spacing-calibration rebuild failed.');
      check=await inspectPdf(pdf,spec,required);
    }
    const decision=pageDecision(cfg,original,check.pages,option('--pages'));
    const slug=company.replace(/[^A-Za-z0-9_-]+/g,'_'),work=path.join(cfgLib.ROOT,'work');fs.mkdirSync(work,{recursive:true});
    const report={company,source:original.source,pages:check.pages,pageDecision:decision,fonts:resolved.resolutions,messages:resolved.messages,calibration};
    if(cfg.formatAudit!==false&&original.source?.path&&fs.existsSync(original.source.path)){
      const audit=await require('./format_audit').auditFormat(original.source.path,pdf,JSON.parse(fs.readFileSync(cfgLib.BASE,'utf8')),resume,spec);
      const auditPath=path.join(work,slug+'_format_audit.json');fs.writeFileSync(auditPath,JSON.stringify(audit,null,2));report.formatAudit={path:auditPath,passed:audit.passed,total:audit.total,conformancePercent:audit.conformancePercent};
      console.log(`FORMAT: ${audit.passed}/${audit.total} measured checks (${audit.conformancePercent}% conformance; not pixel accuracy)`);
      const critical=audit.failures.filter(f=>/summary|separator exists|separator count|section order|row exists|contact .*present/.test(f.name));
      if(critical.length||audit.conformancePercent<(cfg.minFormatConformancePercent||98)){fs.copyFileSync(pdf,path.join(work,slug+'_format_review.pdf'));fs.writeFileSync(path.join(work,slug+'_build_report.json'),JSON.stringify(report,null,2));throw new Error('Reference formatting audit failed. Fix '+audit.failures.map(f=>f.name).join(', ')+'. See '+auditPath);}
    }
    fs.writeFileSync(path.join(work,slug+'_build_report.json'),JSON.stringify(report,null,2));
    if(decision.status==='choice_required'){
      const preview=path.join(work,slug+'_page_choice_preview.pdf');fs.copyFileSync(pdf,preview);
      const request=path.join(work,slug+'_page_choice.json');fs.writeFileSync(request,JSON.stringify({...decision,preview,fontMessages:resolved.messages,resume:path.resolve(jsonPath),company},null,2));
      console.log('PAGE_CHOICE_REQUIRED: '+decision.question+'\nReview PDF: '+preview+'\nRequest: '+request+'\nAsk the user; rerun with --pages 1 or --pages 2 only after their answer.');process.exitCode=10;return;
    }
    if(decision.status==='shorten_required')throw new Error(decision.message);
    const base=JSON.parse(fs.readFileSync(cfgLib.BASE,'utf8')),out=path.join(cfgLib.resolveRoot(cfg),company);fs.mkdirSync(out,{recursive:true});
    const file=path.join(out,cfgLib.fileName(cfg.outputFileName,base.name));fs.copyFileSync(pdf,file);
    const pending=path.join(work,slug+'_page_choice.json');if(fs.existsSync(pending))fs.unlinkSync(pending);
    console.log(`SAVED: ${file}\n  pages: ${check.pages} (limit ${decision.limit}; reference margins) | fonts: ${check.fonts.join(', ')} | text OK`);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error('STOP: '+e.message);process.exitCode=1;});
