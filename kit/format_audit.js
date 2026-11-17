// Independently compare rendered PDF properties with the original reference.
// This is a style/structure conformance report, NOT a pixel-similarity score.
const fs=require('fs');
const {readPdf,readDocx}=require('./extract_design_lib');
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const equivalent=s=>clean(s).replace(/^bitstreamcharter$/,'charter');
const find=(raw,t)=>raw.paras.find(p=>clean(p.text)===clean(t))||raw.paras.find(p=>clean(p.text).startsWith(clean(t)))||raw.paras.find(p=>clean(t).startsWith(clean(p.text))&&clean(p.text).length>15);
const dominant=runs=>runs?.slice().sort((a,b)=>b.text.length-a.text.length)[0];
const spanFor=(p,text)=>p?.runs.find(r=>clean(r.text)===clean(text))||p?.runs.find(r=>clean(r.text).startsWith(clean(text)))||dominant(p?.runs);
async function auditFormat(reference,pdf,base,resume,spec){
  const source=/\.docx$/i.test(reference)?await readDocx(reference):await readPdf(reference),out=await readPdf(pdf);
  const checks=[],notes=[],measure=(name,actual,expected,tolerance=0)=>checks.push({name,pass:typeof expected==='number'?Math.abs(actual-expected)<=tolerance:actual===expected,actual,expected,tolerance});
  const style=(name,actual,expected)=>{if(!expected)return;measure(name+' font size',actual?.size?.pt,expected.size.pt,.26);measure(name+' weight',actual?.weight,expected.weight);measure(name+' color',actual?.color?.toUpperCase(),expected.color.toUpperCase());const resolved=spec.fontResolution?.resolutions.find(r=>equivalent(r.requested)===equivalent(expected.font));measure(name+' family',equivalent(actual?.font),equivalent(resolved?.used||expected.font));};
  measure('page width',out.page.width,source.page.width,1);measure('page height',out.page.height,source.page.height,1);
  const srcName=find(source,base.name),newName=find(out,resume.name);style('name',dominant(newName?.runs),dominant(srcName?.runs));
  if(srcName?.box&&newName?.box){measure('name center',(newName.box.x+newName.box.right)/2,(srcName.box.x+srcName.box.right)/2,.5);measure('name baseline',newName.box.y,srcName.box.y,.6);}
  const allText=out.paras.map(p=>p.text).join(' '),normalized=clean(allText),summary=clean(resume.summary);
  const sourceContact=source.paras.find(p=>p.text.includes(base.email)),outputContact=out.paras.find(p=>p.text.includes(resume.email));
  measure('contact email present',!!outputContact,true);measure('contact phone present',!!outputContact&&clean(outputContact.text).includes(clean(resume.phone)),true);
  if(sourceContact&&outputContact){style('contact row',dominant(outputContact.runs),dominant(sourceContact.runs));measure('contact separators',(outputContact.text.match(/\|/g)||[]).length,(sourceContact.text.match(/\|/g)||[]).length);if(sourceContact.box)measure('contact center',(outputContact.box.x+outputContact.box.right)/2,(sourceContact.box.x+sourceContact.box.right)/2,1);}
  measure('summary exactly once',summary?normalized.split(summary).length-1:0,1);
  if(spec.summaryPlacement==='header'){
    measure('no duplicate summary heading',out.paras.some(p=>/^professional summary$/i.test(p.text.trim())),false);
    if(clean(base.title)!==summary)measure('old header prose removed',normalized.includes(clean(base.title)),false);
    const summaryPara=find(out,resume.summary),contact=out.paras.find(p=>p.text.includes(resume.email));
    measure('summary occupies original header position',!!summaryPara&&out.paras.indexOf(summaryPara)>out.paras.indexOf(newName)&&out.paras.indexOf(summaryPara)<out.paras.indexOf(contact),true);
    const sourceSummary=find(source,base.summary||base.title);if(sourceSummary&&summaryPara)style('header summary',dominant(summaryPara.runs),dominant(sourceSummary.runs));
  }
  const sections=[['education','Education'],['professionalExperience','Work Experience'],...(base.extraSections||[]).map(x=>['extraSections',x.heading]),['technicalSkills','Technical Skills']];
  const anchors=[];
  for(const [key,fallback] of sections){
    const label=key==='extraSections'?fallback:spec.sectionHeadings?.[key]?.text||fallback;
    const s=source.paras.find(p=>clean(p.text)===clean(label)),g=out.paras.find(p=>clean(p.text)===clean(label));
    if(!s)continue;anchors.push({label,s,g});style(label,dominant(g?.runs),dominant(s.runs));
    if(s.box){measure(label+' left edge',g?.box?.x,s.box.x,.35);const sr=source.rules?.find(r=>r.page===s.box.page&&r.y>s.box.y&&r.y-s.box.y<9),gr=g?.box?out.rules?.find(r=>r.page===g.box.page&&r.y>g.box.y&&r.y-g.box.y<9):null;if(sr){measure(label+' separator exists',!!gr,true);measure(label+' separator width',gr?gr.right-gr.x:undefined,sr.right-sr.x,.3);measure(label+' separator stroke',gr?.width,sr.width,.06);measure(label+' separator color',gr?.color,sr.color);measure(label+' separator gap',gr?gr.y-g.box.y:undefined,sr.y-s.box.y,.6);}}
    if(s.box){const si=source.paras.indexOf(s),gi=out.paras.indexOf(g),sp=source.paras[si-1],gp=gi>=0?out.paras[gi-1]:null,sn=source.paras[si+1],gn=gi>=0?out.paras[gi+1]:null;if(sp?.box.page===s.box.page)measure(label+' preceding baseline gap',gp&&g?.box&&gp.box.page===g.box.page?g.box.y-gp.box.y:undefined,s.box.y-sp.box.y,.4);if(sn?.box.page===s.box.page)measure(label+' following baseline gap',gn&&g?.box&&gn.box.page===g.box.page?gn.box.y-g.box.y:undefined,sn.box.y-s.box.y,.4);}
  }
  if(source.rules)measure('horizontal separator count',out.rules.length,source.rules.length);
  const sourceOrder=anchors.slice().sort((a,b)=>source.paras.indexOf(a.s)-source.paras.indexOf(b.s)).map(x=>x.label);
  const outputOrder=anchors.slice().sort((a,b)=>out.paras.indexOf(a.g)-out.paras.indexOf(b.g)).map(x=>x.label);measure('section order',JSON.stringify(outputOrder),JSON.stringify(sourceOrder));
  for(const [name,value] of [['job title',base.jobs[0].title],['company',base.jobs[0].company],['degree',base.education.degree]]){
    const s=find(source,value),g=find(out,value);style(name,spanFor(g,value),spanFor(s,value));
    if(s?.box&&g?.box){const ss=spanFor(s,value),gs=spanFor(g,value);if(gs?.x!==undefined&&ss?.x!==undefined)measure(name+' left indent',gs.x,ss.x,.35);}
  }
  const sourceSkill=source.paras.find(p=>clean(p.text.split(':')[0])===clean(base.skills[0][0]));
  for(const [label] of resume.skills){const p=out.paras.find(p=>clean(p.text.split(':')[0])===clean(label));measure(label+' row exists',!!p,true);if(!p||!sourceSkill)continue;
    const labelRun=p.runs.find(r=>r.text.includes(':')),sourceLabel=sourceSkill.runs.find(r=>r.text.includes(':'));
    if(sourceLabel){style(label+' label',labelRun,sourceLabel);if(sourceLabel.x!==undefined)measure(label+' indent',labelRun?.x,sourceLabel.x,.35);}
    const regular=p.runs.filter(r=>!r.text.includes(':')&&clean(r.text));const sourceRegular=sourceSkill.runs.filter(r=>!r.text.includes(':')&&clean(r.text));if(sourceRegular.length)style(label+' items',dominant(regular),dominant(sourceRegular));
    measure(label+' bullet policy',/^[•●▪]/.test(p.text.trim()),source.format==='docx'?!!sourceSkill.style.bullet:/^[•●▪]/.test(sourceSkill.text.trim()));
  }
  // Dates must keep the source's inset from the right page edge.
  for(let i=0;i<base.jobs.length;i++){
    const s=source.paras.find(p=>clean(p.text).includes(clean(base.jobs[i].dates))),g=out.paras.find(p=>clean(p.text).includes(clean(resume.jobs[i].dates)));
    const ss=s?.runs.filter(r=>/\d/.test(r.text)),gs=g?.runs.filter(r=>/\d/.test(r.text));
    if(ss?.length&&gs?.length&&ss[0].x!==undefined){measure('job '+(i+1)+' dates right edge',Math.max(...gs.map(r=>r.x+r.width)),Math.max(...ss.map(r=>r.x+r.width)),.5);}
  }
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const bulletRows=raw=>raw.paras.filter(p=>/^[•●▪]/.test(p.text.trim())&&p.style.size.pt<10.5);
  const srcBullets=bulletRows(source),outBullets=bulletRows(out);
  if(srcBullets.length&&outBullets.length){
    const s=srcBullets.find(p=>p.text.includes('Owned'))||srcBullets[0],g=outBullets.find(p=>p.text.includes('Owned'))||outBullets[0];
    const marker=p=>p.runs.find(r=>/^[•●▪]$/.test(r.text.trim())),body=p=>dominant(p.runs.filter(r=>!marker(p)||r!==marker(p)));
    style('experience body',body(g),body(s));
    if(marker(s)&&marker(g)){measure('bullet marker size',marker(g).size.pt,marker(s).size.pt,.26);measure('bullet marker indent',marker(g).x,marker(s).x,.35);}
    measure('bullet text indent',body(g).x,body(s).x,.35);
  }
  // Unchanged older-job text provides an independent baseline-spacing fixture.
  if(base.jobs.length>1){const old=base.jobs[1].bullets,src=old.map(t=>find(source,t)),got=old.map(t=>find(out,t));
    for(let i=1;i<old.length;i++)if(src[i]?.box&&src[i-1]?.box&&got[i]?.box&&got[i-1]?.box)measure('older-job bullet gap '+i,got[i].box.y-got[i-1].box.y,src[i].box.y-src[i-1].box.y,.35);
  }
  const sourceSkillStarts=base.skills.map(([l])=>source.paras.find(p=>clean(p.text.split(':')[0])===clean(l))).filter(Boolean);
  const outputSkillStarts=resume.skills.map(([l])=>out.paras.find(p=>clean(p.text.split(':')[0])===clean(l))).filter(Boolean);
  const gaps=starts=>starts.slice(1).map((p,i)=>p.box&&starts[i].box&&p.box.page===starts[i].box.page?p.box.y-starts[i].box.y:0).filter(x=>x>0&&x<20);
  if(gaps(sourceSkillStarts).length&&gaps(outputSkillStarts).length)measure('skill row baseline spacing',median(gaps(outputSkillStarts)),median(gaps(sourceSkillStarts)),.3);
  for(const extra of resume.extraSections||[]){const si=source.paras.findIndex(p=>clean(p.text)===clean(extra.heading)),gi=out.paras.findIndex(p=>clean(p.text)===clean(extra.heading));const s=source.paras[si+1],g=gi>=0?out.paras[gi+1]:null;if(si>=0&&s?.box&&/^[•●▪]/.test(s.text)){measure(extra.heading+' marker indent',g?.box?.x,s.box.x,.35);const continuation=source.paras[si+2],bodyRun=g?.runs.find(r=>!/^\s*[•●▪]\s*$/.test(r.text));if(continuation?.box&&continuation.box.y-s.box.y<16)measure(extra.heading+' text indent',bodyRun?.x,continuation.box.x,.35);}}
  notes.push('Conformance counts only these explicitly listed formatting properties; it is not overall visual accuracy or pixel similarity. Text and section heights intentionally change with JD content.');
  notes.push('Charter is a licensed conversion of the original family; its names and Word half-point sizes differ slightly from the source PDF.');
  const passed=checks.filter(x=>x.pass).length;
  return {kind:'measured-style-conformance',reference,pdf,passed,total:checks.length,conformancePercent:Number((100*passed/checks.length).toFixed(2)),checks,failures:checks.filter(x=>!x.pass),notes};
}
module.exports={auditFormat};
if(require.main===module){const [reference,pdf,json,output]=process.argv.slice(2);auditFormat(reference,pdf,JSON.parse(fs.readFileSync(require('./config').BASE,'utf8')),JSON.parse(fs.readFileSync(json,'utf8')),require('./design_loader').loadDesignSpec()).then(r=>{fs.writeFileSync(output||'work/format_audit.json',JSON.stringify(r,null,2));console.log(JSON.stringify({passed:r.passed,total:r.total,conformancePercent:r.conformancePercent,failures:r.failures},null,2));}).catch(e=>{console.error(e);process.exitCode=1;});}
