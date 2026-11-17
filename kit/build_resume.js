// node kit/build_resume.js resume.json out.docx
const fs=require('fs');
const {Document,Packer,ExternalHyperlink}=require('docx');
const {loadDesignSpec}=require('./design_loader');
const {renderer}=require('./design_render');
const [,,jsonPath,outPath]=process.argv;
const d=JSON.parse(fs.readFileSync(jsonPath,'utf8')),spec=loadDesignSpec();
const {paragraph:p,row,heading,paired,numbering,run,style}=renderer(spec);
const values={name:d.name,titleLine:d.title,summaryParagraph:d.summary,locationLine:d.location,contactLine:(spec.contactOrder||['email','phone']).map(k=>d[k]).filter(Boolean).join(' | '),linksLine:[d.linkedin,...(d.links||[])].filter(Boolean).join(' | ')};
const summaryInHeader=spec.summaryPlacement==='header';
function headerRuns(k){
  if(k==='linksLine'&&d.linkedin)return [new ExternalHyperlink({link:d.linkedin,children:[run(spec.linkDisplay||d.linkedin,style(k))]}),...(d.links||[]).flatMap(link=>[run(' | ',style(k)),new ExternalHyperlink({link,children:[run(link,style(k))]})])];
  if(k==='contactLine'&&spec.contactIcons)return (spec.contactOrder||['email','phone']).filter(key=>d[key]).flatMap((key,i)=>[...(i?[run(' | ',style(k))]:[]),run(spec.contactIcons[key]+' ',style(k),{font:spec.contactIcons.font}),run(d[key],style(k))]);
  return [run(values[k],style(k))];
}
const job=j=>{
  const values={companyName:j.company,jobTitle:j.title,datesLine:j.dates,keyProjectsLine:j.keyProjects};
  return [...(spec.jobOrder||Object.keys(values)).filter(k=>values[k]&&!(spec.inlineDates&&k==='datesLine')).map(k=>spec.inlineDates&&k==='jobTitle'?paired(k,j.title,'datesLine',j.dates):spec.inlineJobLocation&&k==='companyName'&&j.location?paired(k,j.company,'jobLocation',j.location):p(k,values[k])),...j.bullets.map(t=>p('experienceBullet',t))];
};
const sections={
  header:()=> (spec.headerRows|| (spec.headerOrder||['name','titleLine','locationLine','contactLine','linksLine']).map(k=>({keys:[k]}))).map(r=>r.keys.filter(k=>values[k]&&!((summaryInHeader||spec.titleRole==='summary')&&k==='titleLine')&&!(k==='summaryParagraph'&&!summaryInHeader))).filter(r=>r.length).map(keys=>p(keys[0],'',{},keys.flatMap((k,i)=>[...(i?[run(' | ',style(k))]:[]),...headerRuns(k)]))),
  professionalSummary:()=>!summaryInHeader&&d.summary&&!(d.summary===d.title&&!spec.sectionHeadings?.professionalSummary)?[heading('professionalSummary'),p('summaryParagraph',d.summary)]:[],
  extraSections:()=> (d.extraSections||[]).flatMap(s=>[heading('extraSections',s.heading),...s.rows.map(([l,i])=>row(l,i,spec.extraRows?.[s.heading]||{}))]),
  technicalSkills:()=>[heading('technicalSkills'),...d.skills.map(([l,i])=>row(l,i))],
  professionalExperience:()=>[heading('professionalExperience'),...d.jobs.flatMap(job)],
  education:()=>[heading('education'),...(d.education.dates?[paired('educationDegree',d.education.degree,'datesLine',d.education.dates)]:[p('educationDegree',d.education.degree)]),p('educationSchool',d.education.school),...(d.education.cgpa?[p('educationCgpa',d.education.cgpa)]:[])],
  certifications:()=>d.certifications?.length?[heading('certifications'),...d.certifications.map(t=>p('certificationBullet',t))]:[]
};
const order=spec.sectionOrder||Object.keys(sections);
if(new Set(order).size!==order.length||order.some(k=>!sections[k]))throw new Error('Invalid or repeated design section order');
const children=order.flatMap(k=>sections[k]());
const doc=new Document({fonts:require('./font_manager').embeddedFontOptions(spec),styles:{default:{document:{run:{font:spec.fonts.primary,size:spec.baseFontSize.halfPoints}}}},numbering:{config:numbering},sections:[{properties:{page:{size:spec.page.size,margin:spec.margins.normal}},children}]});
Packer.toBuffer(doc).then(b=>fs.writeFileSync(outPath,b)).catch(e=>{console.error(e);process.exitCode=1;});
