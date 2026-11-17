// Calibrate fixed structural gaps against actual LibreOffice output. Content
// heights may differ; only adjacent baseline gaps within the same page are used.
const {readPdf}=require('./extract_design_lib');
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const find=(raw,t)=>raw.paras.find(p=>clean(p.text)===clean(t))||raw.paras.find(p=>clean(p.text).startsWith(clean(t)));
async function calibrateSpacing(reference,pdf,base,resume,spec){
  if(!/\.pdf$/i.test(reference))return [];
  const [source,out]=await Promise.all([readPdf(reference),readPdf(pdf)]),changes=[];
  function change(style,field,delta,label){if(!style||Math.abs(delta)<.12)return;const previous=Number(style.spacing?.[field]||0),next=Math.max(0,Math.round(previous+delta*20));if(next!==previous){style.spacing={...style.spacing,[field]:next};changes.push({label,field,before:previous,after:next,deltaPoints:(next-previous)/20});}}
  const entries=[['education','Education','contactLine'],['professionalExperience','Work Experience','educationSchool'],...(resume.extraSections||[]).map(x=>['extraSections',x.heading,'experienceBullet']),['technicalSkills','Technical Skills','extraRows']];
  for(const [key,fallback,previousKey] of entries){const label=key==='extraSections'?fallback:spec.sectionHeadings?.[key]?.text||fallback,s=find(source,label),g=find(out,label);if(!s||!g)continue;
    const sourceIndex=source.paras.indexOf(s),outIndex=out.paras.indexOf(g),sp=source.paras[sourceIndex-1],gp=out.paras[outIndex-1],sn=source.paras[sourceIndex+1],gn=out.paras[outIndex+1];
    const h=key==='extraSections'?spec.extraHeadings?.[label]:spec.sectionHeadings?.[key];
    if(sp?.box.page===s.box.page&&gp?.box.page===g.box.page){const delta=(s.box.y-sp.box.y)-(g.box.y-gp.box.y),before=Number(h?.spacing?.before||0);if(before+delta*20>=0)change(h,'before',delta,label+' preceding gap');else if(['contactLine','educationSchool'].includes(previousKey))change(spec.elements[previousKey],'after',delta,label+' preceding paragraph');}
    if(sn?.box.page===s.box.page&&gn?.box.page===g.box.page)change(h,'after',(sn.box.y-s.box.y)-(gn.box.y-g.box.y),label+' following gap');
  }
  for(const [left,right,styleKey,label] of [[base.education.degree,base.education.school,'educationDegree','degree to school'],[base.jobs[0].title,base.jobs[0].company,'jobTitle','role to company']]){
    const sl=find(source,left),sr=source.paras.find(p=>clean(p.text).includes(clean(right))),gl=find(out,left),gr=out.paras.find(p=>clean(p.text).includes(clean(right)));
    if(sl&&sr&&gl&&gr&&sl.box.page===sr.box.page&&gl.box.page===gr.box.page)change(spec.elements[styleKey],'after',(sr.box.y-sl.box.y)-(gr.box.y-gl.box.y),label);
  }
  const sc=find(source,base.jobs[0].company),gc=find(out,resume.jobs[0].company),sb=source.paras.find(p=>clean(p.text).startsWith(clean(base.jobs[0].bullets[0]).slice(0,32))),gb=out.paras.find(p=>clean(p.text).startsWith(clean(resume.jobs[0].bullets[0]).slice(0,32)));
  if(sc&&gc&&sb&&gb&&sc.box.page===sb.box.page&&gc.box.page===gb.box.page)change(spec.elements.companyName,'after',(sb.box.y-sc.box.y)-(gb.box.y-gc.box.y),'company to first bullet');
  return changes;
}
module.exports={calibrateSpacing};
