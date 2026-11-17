const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');
const { unzipSync, strFromU8 } = require('fflate');
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
const mode = xs => [...xs.reduce((m,x)=>m.set(x,(m.get(x)||0)+1),new Map())].sort((a,b)=>b[1]-a[1])[0]?.[0];
const size = pt => ({pt,halfPoints:Math.round(pt*2)});
const family = s => String(s || 'Calibri').replace(/^[A-Z]{6}\+/, '').replace(/(?:[-,]?(?:BoldItalic|BoldOblique|Bold|Italic|Oblique|Regular|Roman|MT))+$/ig, '').replace(/PS$/, '').replace(/^CharterBT$/, 'Bitstream Charter') || 'Calibri';
function descendants(node,key) {
  if(!node || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([k,v])=>k===key?arr(v):arr(v).flatMap(x=>descendants(x,key)));
}
function text(node) {
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(!node)return '';
  return Object.entries(node).filter(([k])=>!k.startsWith('@_')).map(([k,v])=>k==='t'?arr(v).map(x=>typeof x==='object'?x['#text']||'':x).join(''):arr(v).map(text).join('')).join('');
}
const merge = (...xs) => xs.filter(Boolean).reduce((a,b)=>{for(const [k,v] of Object.entries(b))a[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(a[k],v):v;return a;},{});
async function readDocx(input) {
  const zip=unzipSync(new Uint8Array(fs.readFileSync(input)));
  const parser=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,trimValues:false});
  const xml=name=>zip[name]?parser.parse(strFromU8(zip[name])):{};
  const doc=xml('word/document.xml'), styles=xml('word/styles.xml').styles||{}, theme=xml('word/theme/theme1.xml');
  const themeFonts={};
  for(const [type,key] of [['majorFont','majorHAnsi'],['minorFont','minorHAnsi']])themeFonts[key]=descendants(theme,type)[0]?.latin?.['@_typeface'];
  const byId=new Map(arr(styles.style).map(s=>[s['@_styleId'],s]));
  const inherited=(id,seen=new Set())=>{if(!id||seen.has(id))return {};seen.add(id);const s=byId.get(id);return s?merge(inherited(s.basedOn?.['@_val'],seen),s):{};};
  const defaults={pPr:styles.docDefaults?.pPrDefault?.pPr||{},rPr:styles.docDefaults?.rPrDefault?.rPr||{}};
  const defaultStyle=arr(styles.style).find(s=>s['@_type']==='paragraph'&&s['@_default']==='1');
  const num=xml('word/numbering.xml').numbering||{};
  const numbering=new Map(arr(num.num).map(n=>[n['@_numId'],n.abstractNumId?.['@_val']]));
  const abstract=new Map(arr(num.abstractNum).map(n=>[n['@_abstractNumId'],n]));
  const enabled=x=>x!==undefined&&!['0','false','off'].includes(x?.['@_val']);
  function runStyle(pr) {
    const f=pr.rFonts||{}, pt=Number(pr.sz?.['@_val']||22)/2;
    return {font:f['@_ascii']||f['@_hAnsi']||themeFonts[f['@_asciiTheme']]||themeFonts[f['@_hAnsiTheme']]||'Calibri',size:size(pt),weight:enabled(pr.b)?'bold':'regular',italic:enabled(pr.i),color:/^[0-9A-F]{6}$/i.test(pr.color?.['@_val'])?pr.color['@_val']:'000000'};
  }
  const paras=descendants(doc.document?.body,'p').map(p=>{
    const s=merge(defaults,inherited(p.pPr?.pStyle?.['@_val']||defaultStyle?.['@_styleId']),{pPr:p.pPr||{}}),pp=s.pPr||{};
    const runs=descendants(p,'r').map(r=>({text:text(r),...runStyle(merge(s.rPr,inherited(r.rPr?.rStyle?.['@_val']).rPr,r.rPr))})).filter(r=>r.text.trim());
    const dominant=runs.slice().sort((a,b)=>b.text.length-a.text.length)[0];
    const spacing=Object.fromEntries(['before','after','line','lineRule'].filter(k=>pp.spacing?.['@_'+k]!==undefined).map(k=>[k,k==='lineRule'?pp.spacing['@_'+k]:Number(pp.spacing['@_'+k])]));
    const indent=Object.fromEntries(['left','right','firstLine','hanging'].filter(k=>pp.ind?.['@_'+k]!==undefined).map(k=>[k,Number(pp.ind['@_'+k])]));
    let bullet=null;
    if(pp.numPr){const a=abstract.get(numbering.get(pp.numPr.numId?.['@_val']));const level=arr(a?.lvl).find(l=>l['@_ilvl']===(pp.numPr.ilvl?.['@_val']||'0'));if(level?.numFmt?.['@_val']!=='bullet')throw new Error('Numbered lists need a separate layout adapter.');bullet={character:level?.lvlText?.['@_val']||'•',indent:{left:Number(level?.pPr?.ind?.['@_left']||0),hanging:Number(level?.pPr?.ind?.['@_hanging']||0)},size:size(Number(level?.rPr?.sz?.['@_val']||dominant?.size.halfPoints||22)/2)};}
    const border=pp.pBdr?.bottom;
    return {text:text(p),runs,style:{...dominant,text:undefined,alignment:pp.jc?.['@_val']==='both'?'justified':pp.jc?.['@_val']||'left',spacing:{before:0,after:0,...spacing},indent,keepWithNext:enabled(pp.keepNext),bullet,border:border?{bottom:{style:border['@_val'],size:Number(border['@_sz']||8),color:border['@_color']||'000000',space:Number(border['@_space']||0)}}:null}};
  }).filter(p=>p.text.trim());
  const sects=descendants(doc,'sectPr');
  if(sects.length!==1||descendants(doc,'tbl').length||Number(sects[0]?.cols?.['@_num']||1)>1||descendants(doc,'drawing').length||descendants(doc,'txbxContent').length)throw new Error('Reference contains tables, columns, graphics or multiple page sections; exact reproduction needs a separate layout adapter. No design was saved.');
  const sect=sects[0];if(!sect?.pgSz||!sect?.pgMar)throw new Error('DOCX does not define page size and margins.');
  return {paras,page:{width:Number(sect.pgSz['@_w']),height:Number(sect.pgSz['@_h'])},margins:Object.fromEntries(['top','bottom','left','right'].map(k=>[k,Number(sect.pgMar['@_'+k])])),pageCount:Number(xml('docProps/app.xml').Properties?.Pages||1),format:'docx',warnings:['DOCX page count uses saved metadata; verify pagination after conversion.']};
}
async function readPdf(input) {
  const {getDocument,OPS}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(fs.readFileSync(input)),useSystemFonts:true,disableFontFace:true,fontExtraProperties:true});
  const pdf=await task.promise;
  const pageCount=pdf.numPages, lines=[],rules=[];let pageSize;
  for(let n=1;n<=pageCount;n++) {
    const page=await pdf.getPage(n),v=page.getViewport({scale:1});if(v.rotation)throw new Error('Rotated pages need a separate layout adapter.');
    const current={width:Math.round(v.width*20),height:Math.round(v.height*20)};
    if(pageSize&&JSON.stringify(pageSize)!==JSON.stringify(current))throw new Error('Mixed page sizes need a separate layout adapter.');pageSize=current;
    const ops=await page.getOperatorList(),painted=[],stack=[];let color='000000',stroke='000000',matrix=[1,0,0,1,0,0],lineWidth=1;
    const multiply=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
    const point=(x,y)=>[matrix[0]*x+matrix[2]*y+matrix[4],v.height-(matrix[1]*x+matrix[3]*y+matrix[5])];
    const rgb=a=>{const vals=Array.from(a);if(vals.length===1&&typeof vals[0]==='string')return vals[0].replace('#','').toUpperCase();return vals.slice(0,3).map(x=>Math.round(x<=1?x*255:x).toString(16).padStart(2,'0')).join('').toUpperCase();};
    for(let i=0;i<ops.fnArray.length;i++) {
      const f=ops.fnArray[i],a=ops.argsArray[i];
      if(f===OPS.save)stack.push({color,stroke,matrix:[...matrix],lineWidth});if(f===OPS.restore&&stack.length)({color,stroke,matrix,lineWidth}=stack.pop());
      if(f===OPS.transform)matrix=multiply(matrix,a);
      if(f===OPS.setLineWidth)lineWidth=a[0];
      if(f===OPS.setStrokeRGBColor)stroke=rgb(a);if(f===OPS.setStrokeGray)stroke=rgb([a[0],a[0],a[0]]);
      if(f===OPS.setFillRGBColor)color=rgb(a);if(f===OPS.setFillGray)color=rgb([a[0],a[0],a[0]]);
      if(f===OPS.constructPath&&a[2]?.length===4){const b=Array.from(a[2]),p1=point(b[0],b[1]),p2=point(b[2],b[3]);if(Math.abs(p2[0]-p1[0])>40&&Math.abs(p2[1]-p1[1])<1.5){const rule={page:n,x:Math.min(p1[0],p2[0]),right:Math.max(p1[0],p2[0]),y:(p1[1]+p2[1])/2,width:lineWidth,color:a[0]===OPS.stroke?stroke:color};if(!rules.some(r=>r.page===rule.page&&Math.abs(r.y-rule.y)<.1&&Math.abs(r.x-rule.x)<.1&&Math.abs(r.right-rule.right)<.1))rules.push(rule);}}
      if(f===OPS.showText||f===OPS.showSpacedText)painted.push({text:arr(a).flat(2).filter(x=>x&&typeof x==='object'&&x.unicode).map(x=>x.unicode).join(''),color});
    }
    const content=await page.getTextContent();let cursor=0;
    for(const item of content.items) {
      if(!item.str?.trim())continue;
      const font=page.commonObjs.has(item.fontName)?page.commonObjs.get(item.fontName):null;
      let index=painted.slice(cursor).findIndex(p=>norm(p.text)&&(norm(p.text).includes(norm(item.str))||norm(item.str).includes(norm(p.text))));
      if(index>=0)index+=cursor;const pc=index>=0?painted[index]:null;if(index>=0)cursor=index;
      const fontName=font?.name||content.styles[item.fontName]?.fontFamily,pt=Math.round(Math.hypot(item.transform[2],item.transform[3])*100)/100,x=item.transform[4],y=v.height-item.transform[5];
      let line=lines.findLast(l=>l.page===n&&Math.abs(l.y-y)<Math.min(pt*.25,2));
      if(!line){line={page:n,y,x,right:x,spans:[]};lines.push(line);}line.x=Math.min(line.x,x);line.right=Math.max(line.right,x+item.width);
      line.spans.push({text:item.str,x,y,width:item.width,font:family(fontName),size:size(pt),color:pc?.color||'000000',weight:/bold|black|semibold/i.test(fontName)?'bold':'regular',italic:/italic|oblique/i.test(fontName)});
    }
  }
  await task.destroy();lines.sort((a,b)=>a.page-b.page||a.y-b.y||a.x-b.x);
  if(!lines.length)throw new Error('Scanned PDF has no selectable text. OCR is required; no design was saved.');
  for(const l of lines){l.spans.sort((a,b)=>a.x-b.x);l.text=l.spans.map(s=>s.text).join(' ');l.y=l.spans.slice().sort((a,b)=>b.text.length-a.text.length)[0].y;}
  const margins={left:Math.round(Math.min(...lines.map(l=>l.x),...rules.map(r=>r.x))*20),right:Math.round(pageSize.width-Math.max(...lines.map(l=>l.right),...rules.map(r=>r.right))*20),top:Math.round(Math.min(...lines.map(l=>l.y-l.spans[0].size.pt))*20),bottom:Math.round(pageSize.height-Math.max(...lines.map(l=>l.y))*20)};
  const paras=lines.map((l,i)=>{const runs=l.spans,d=runs.slice().sort((a,b)=>b.text.length-a.text.length)[0],next=lines[i+1],gap=next?.page===l.page?Math.max(0,next.y-l.y-d.size.pt*1.15):0;return {text:l.text,runs,box:{x:l.x,y:l.y,right:l.right,page:l.page},style:{font:d.font,size:d.size,color:d.color,weight:d.weight,italic:d.italic,alignment:Math.abs((l.x+l.right)/2-pageSize.width/40)<8?'center':'left',spacing:{before:0,after:Math.round(Math.min(gap,18)*20)},border:null,bullet:null}};});
  return {paras,rules,page:pageSize,margins,pageCount,format:'pdf',warnings:['PDF has glyph coordinates, not Word paragraph settings: margins, spacing and indents are inferred. Review the preview.','Single-column text and horizontal separators are supported. Complex graphics/tables still require a layout adapter.']};
}
function matchParagraph(paras,value) {
  const target=norm(value);if(!target)return null;
  return paras.find(p=>norm(p.text)===target)
    || paras.find(p=>{const t=norm(p.text);return t.startsWith(target)||target.startsWith(t)&&t.length>=Math.min(18,target.length);})
    || paras.find(p=>norm(p.text).includes(target)) || null;
}
function matchingRuns(p,value) {
  if(!p||!value)return p;
  const target=norm(value);let best;
  for(let a=0;a<p.runs.length;a++)for(let b=a+1;b<=p.runs.length;b++){
    const runs=p.runs.slice(a,b),t=norm(runs.map(r=>r.text).join(' '));
    if(t===target||target.startsWith(t)&&t.length>=Math.min(18,target.length)){
      if(!best||t.length>best.length)best={runs,length:t.length};
    }
  }
  if(!best)return p;
  const d=best.runs.slice().sort((a,b)=>b.text.length-a.text.length)[0];
  return {...p,runs:best.runs,style:{...p.style,font:d.font,size:d.size,color:d.color,weight:d.weight,italic:d.italic}};
}
async function extractDesign(input,base) {
  const raw=/\.docx$/i.test(input)?await readDocx(input):await readPdf(input);
  const spec=JSON.parse(fs.readFileSync(require('path').join(__dirname,'design_defaults.json'),'utf8'));
  const report={source:input,format:raw.format,warnings:raw.warnings,matched:{},fallbacks:[]},all=raw.paras;
  const sourceStyle=p=>{
    const s=structuredClone(p.style);delete s.text;
    if(raw.format==='pdf') {
      const meaningful=p.runs.filter(r=>!/^\s*[•●▪◦·]\s*$/.test(r.text));
      const x=Math.min(...meaningful.map(r=>r.x));
      s.indent={left:Math.max(0,Math.round((x-raw.margins.left/20)*20))};
      const following=raw.rules.filter(r=>r.page===p.box.page&&r.y>=p.box.y&&r.y-p.box.y<8).sort((a,b)=>a.y-b.y)[0];
      if(following){const space=Math.max(0,Math.round(following.y-p.box.y-p.style.size.pt*.25));s.border={bottom:{style:'single',size:Math.max(2,Math.round(following.width*8)),color:following.color,space}};s.spacing.after=Math.max(0,s.spacing.after-space*20);}
      const first=p.runs[0];
      if(/^[•●▪◦·\-–]$/.test(first?.text.trim())&&p.runs.length>1){const indent=Math.max(0,Math.round((p.runs[1].x-raw.margins.left/20)*20));s.bullet={character:first.text.trim(),size:first.size,indent:{left:indent,hanging:Math.round((p.runs[1].x-first.x)*20)}};}
      else if(/^[•●▪◦·]\s*/.test(p.text))s.bullet={character:p.text.trim()[0],size:p.runs[0].size,indent:{left:360,hanging:240}};
    }
    return s;
  };
  const assign=(key,p)=>{if(!p){report.fallbacks.push(key);return;}report.fallbacks=report.fallbacks.filter(k=>k!==key);spec.elements[key]=merge(spec.elements[key],sourceStyle(p));report.matched[key]={text:p.text,style:sourceStyle(p)};};
  const fields={name:base.name,titleLine:base.title,locationLine:base.location,contactLine:base.email,linksLine:base.linkedin,summaryParagraph:base.summary,companyName:base.jobs?.[0]?.company,jobTitle:base.jobs?.[0]?.title,datesLine:base.jobs?.[0]?.dates,keyProjectsLine:base.jobs?.[0]?.keyProjects,educationDegree:base.education?.degree,educationSchool:base.education?.school,educationCgpa:base.education?.cgpa,experienceBullet:base.jobs?.[0]?.bullets?.[0],skillRow:base.skills?.[0]?.[0],certificationBullet:base.certifications?.[0]};
  const workStart=all.findIndex(p=>/^(professional\s+|work\s+)?experience$|^employment( history)?$/i.test(p.text.trim()));
  const fieldParagraph=(key,value)=>key==='skillRow'?all.find(p=>norm(p.text.split(':')[0])===norm(value))||matchParagraph(all,value):matchParagraph(workStart>=0&&['companyName','jobTitle','datesLine','keyProjectsLine','experienceBullet'].includes(key)?all.slice(workStart+1):all,value);
  for(const [key,value] of Object.entries(fields)){
    const p=fieldParagraph(key,value);
    assign(key,['experienceBullet','skillRow','educationSchool'].includes(key)?p:matchingRuns(p,value));
  }
  if(!report.matched.name)throw new Error('Reference name does not match base resume. Supply its matching --base JSON to map styles safely.');
  const sections=[['professionalSummary',/^(professional\s+)?summary$|^profile$|^about( me)?$/i],['technicalSkills',/^(technical\s+)?skills$|^technologies$/i],['professionalExperience',/^(professional\s+|work\s+)?experience$|^employment( history)?$/i],['education',/^education$/i],['certifications',/^certifications?$/i]];
  spec.sectionHeadings={};const found=[];
  for(const [key,re] of sections){const i=all.findIndex(p=>re.test(p.text.trim()));if(i>=0){spec.sectionHeadings[key]={text:all[i].text.trim(),...sourceStyle(all[i])};found.push({key,i});}}
  const extraAt=all.findIndex(p=>(base.extraSections||[]).some(x=>norm(x.heading)===norm(p.text)));if(extraAt>=0)found.push({key:'extraSections',i:extraAt});
  spec.extraHeadings=Object.fromEntries((base.extraSections||[]).map(s=>[s.heading,all.find(p=>norm(p.text)===norm(s.heading))]).filter(([,p])=>p).map(([h,p])=>[h,sourceStyle(p)]));
  spec.extraRows=Object.fromEntries((base.extraSections||[]).map(s=>{const at=all.findIndex(p=>norm(p.text)===norm(s.heading));return [s.heading,at>=0&&all[at+1]?sourceStyle(all[at+1]):null];}).filter(([,s])=>s));
  for(const s of base.extraSections||[]){const at=all.findIndex(p=>norm(p.text)===norm(s.heading));if(at>=0&&spec.extraRows[s.heading]&&(all[at+1]?.text.match(/•/g)||[]).length>2)spec.extraRows[s.heading].itemSeparator=' • ';}
  if(raw.format==='pdf')for(const s of base.extraSections||[]){const at=all.findIndex(p=>norm(p.text)===norm(s.heading)),first=all[at+1],continued=all[at+2],row=spec.extraRows[s.heading];if(row&&first&&continued&&row.itemSeparator&&continued.box.page===first.box.page){const marker=first.box.x,textX=continued.box.x;if(textX>marker&&continued.box.y-first.box.y<row.size.pt*1.5){const indent={left:Math.round((textX-raw.margins.left/20)*20),hanging:Math.round((textX-marker)*20)};row.indent=indent;row.bullet={...row.bullet,character:'•',size:row.size,indent};row.spacing={before:0,after:0,line:Math.round((continued.box.y-first.box.y)*20),lineRule:'exact'};}}}
  spec.sectionOrder=['header',...found.sort((a,b)=>a.i-b.i).map(x=>x.key)];for(const [key] of sections)if(!spec.sectionOrder.includes(key))spec.sectionOrder.push(key);
  if(!spec.sectionOrder.includes('extraSections'))spec.sectionOrder.splice(spec.sectionOrder.indexOf('technicalSkills'),0,'extraSections');
  if(!spec.sectionHeadings.professionalSummary){spec.sectionOrder=spec.sectionOrder.filter(k=>k!=='professionalSummary');spec.sectionOrder.splice(1,0,'professionalSummary');}
  const firstHeading=Math.min(...found.map(x=>x.i),all.length);
  spec.headerOrder=Object.keys(fields).filter(k=>['name','titleLine','locationLine','contactLine','linksLine'].includes(k)&&report.matched[k]&&all.indexOf(matchParagraph(all,fields[k]))<firstHeading).sort((a,b)=>all.indexOf(matchParagraph(all,fields[a]))-all.indexOf(matchParagraph(all,fields[b])));
  const firstSection=Object.values(spec.sectionHeadings)[0];
  if(firstSection)spec.elements.sectionHeading=merge(spec.elements.sectionHeading,firstSection);
  const body=report.matched.experienceBullet?.style||report.matched.summaryParagraph?.style;
  spec.baseFontSize=body?.size||size(mode(all.map(p=>p.style.size.pt)));spec.fonts.primary=body?.font||mode(all.map(p=>p.style.font));spec.fonts.fallback=spec.fonts.primary;
  spec.fonts.allowedFamilies=[...new Set(all.flatMap(p=>p.runs.map(r=>r.font)))];if(spec.fonts.allowedFamilies.some(f=>/calibri|carlito/i.test(f)))spec.fonts.allowedFamilies.push('Calibri','Carlito');spec.fonts.allowedFamilies=[...new Set(spec.fonts.allowedFamilies)];
  const skill=fieldParagraph('skillRow',fields.skillRow);if(skill){const label=skill.runs.find(r=>norm(r.text).includes(norm(fields.skillRow))),items=skill.runs.findLast(r=>r.text.includes(','));spec.elements.skillRow.labelWeight=label?.weight||skill.style.weight;spec.elements.skillRow.itemsWeight=items?.weight||'regular';}
  // Use actual consecutive baselines, not font-size heuristics, for repeated rows.
  if(raw.format==='pdf'){
    const median=xs=>xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)];
    const sourceBullets=base.jobs.flatMap(j=>j.bullets||[]).map(t=>matchParagraph(all,t)).filter(Boolean);
    const bodySteps=[];
    for(const p of sourceBullets){const i=all.indexOf(p),next=all[i+1];if(next?.box.page===p.box.page){const delta=next.box.y-p.box.y;if(delta>p.style.size.pt*.9&&delta<p.style.size.pt*1.45)bodySteps.push(delta);}}
    if(bodySteps.length)spec.elements.experienceBullet.spacing={before:0,after:0,line:Math.round(median(bodySteps)*20),lineRule:'exact'};
    const skillRows=base.skills.map(([label])=>fieldParagraph('skillRow',label)).filter(Boolean),skillSteps=[];
    for(const p of skillRows){const next=all[all.indexOf(p)+1];if(next?.box.page===p.box.page){const delta=next.box.y-p.box.y;if(delta>p.style.size.pt*.9&&delta<p.style.size.pt*1.5)skillSteps.push(delta);}}
    if(skillSteps.length)spec.elements.skillRow.spacing={before:0,after:0,line:Math.round(median(skillSteps)*20),lineRule:'exact'};
  }
  spec.page={...spec.page,size:raw.page,orientation:raw.page.width>raw.page.height?'landscape':'portrait'};spec.margins={normal:raw.margins,tight:raw.margins,coverLetter:raw.margins};spec.maxPages=raw.pageCount;
  spec.source={path:input,format:raw.format,pageCount:raw.pageCount,sha256:require('crypto').createHash('sha256').update(fs.readFileSync(input)).digest('hex'),extractedAt:new Date().toISOString()};
  spec.description='Reference-derived design. See extraction report for inferred and unmatched properties.';spec.version='2.0';spec.coverLetter.bodyFontSize=spec.baseFontSize;
  // Newly added content uses the reference body style, rather than the old template.
  const titleIsSummary=!!base.title&&(norm(base.title)===norm(base.summary)||base.title.split(/\s+/).length>18);
  spec.summaryPlacement=titleIsSummary?'header':'section';
  spec.titleRole=titleIsSummary?'summary':'title';
  if(titleIsSummary){spec.elements.summaryParagraph=merge(spec.elements.titleLine,{bullet:null,border:null,indent:{left:0}});report.warnings.push('Long header prose is the professional summary: replace it with the tailored summary once; do not repeat a fixed title and summary section.');}
  if(raw.format==='pdf'&&titleIsSummary){const start=all.indexOf(matchParagraph(all,base.title)),end=all.findIndex((p,i)=>i>start&&norm(p.text).includes(norm(base.email)));const summaryLines=all.slice(start,end>start?end:start+1);const maxWidth=Math.max(...summaryLines.map(p=>p.box.right-p.box.x));const inset=Math.max(0,Math.round((raw.page.width/20-raw.margins.left/20-raw.margins.right/20-maxWidth)*10));spec.elements.summaryParagraph.indent={left:inset,right:inset};}
  const idx=k=>all.indexOf(fieldParagraph(k,fields[k]));
  spec.jobOrder=['companyName','jobTitle','datesLine','keyProjectsLine'].sort((a,b)=>(idx(a)<0?999:idx(a))-(idx(b)<0?999:idx(b)));
  spec.inlineDates=idx('jobTitle')>=0&&idx('jobTitle')===idx('datesLine');
  const headerKeys=['name','titleLine','locationLine','contactLine','linksLine'];
  if(!report.matched.linksLine){const link=all.find(p=>/linkedin/i.test(p.text)&&all.indexOf(p)<firstHeading);if(link){assign('linksLine',link);spec.headerOrder.push('linksLine');}}
  spec.headerRows=[];
  for(const key of spec.headerOrder){const p=key==='linksLine'&&!matchParagraph(all,fields[key])?all.find(p=>/linkedin/i.test(p.text)):matchParagraph(all,fields[key]);let row=spec.headerRows.find(r=>r.source===all.indexOf(p));if(!row){row={source:all.indexOf(p),keys:[]};spec.headerRows.push(row);}row.keys.push(key);}
  if(titleIsSummary){spec.headerRows=spec.headerRows.map(r=>({...r,keys:r.keys.map(k=>k==='titleLine'?'summaryParagraph':k)}));spec.headerOrder=spec.headerOrder.map(k=>k==='titleLine'?'summaryParagraph':k);spec.sectionOrder=spec.sectionOrder.filter(k=>k!=='professionalSummary');}
  const contact=matchParagraph(all,base.email);
  if(contact){const label=contact.runs.find(r=>/LinkedIn:/i.test(r.text));if(label)spec.linkDisplay=label.text;spec.contactIcons=contact.runs.some(r=>/MarVoSym/i.test(r.font))?{phone:'☎',email:'✉',font:'Segoe UI Symbol'}:null;}
  spec.contactOrder=contact&&norm(contact.text).indexOf(norm(base.phone))<norm(contact.text).indexOf(norm(base.email))?['phone','email']:['email','phone'];
  for(const row of spec.headerRows){row.keys.sort((a,b)=>{const p=all[row.source];const position=k=>k==='linksLine'?norm(p?.text).indexOf('linkedin'):k==='contactLine'?Math.min(...[base.email,base.phone].map(v=>norm(p?.text).indexOf(norm(v))).filter(x=>x>=0)):norm(p?.text).indexOf(norm(fields[k]));return position(a)-position(b);});delete row.source;}
  const companyPara=fieldParagraph('companyName',base.jobs?.[0]?.company);
  spec.inlineJobLocation=!!(base.jobs?.[0]?.location&&companyPara&&norm(companyPara.text).includes(norm(base.jobs[0].location)));
  if(spec.inlineJobLocation)spec.elements.jobLocation=sourceStyle(matchingRuns(companyPara,base.jobs[0].location));
  const datePara=matchingRuns(fieldParagraph('datesLine',base.jobs?.[0]?.dates),base.jobs?.[0]?.dates);
  if(raw.format==='pdf'&&datePara){const right=Math.max(...datePara.runs.map(r=>r.x+(r.width||0)));spec.pairedRightInset=Math.round(raw.page.width-raw.margins.right-right*20);}
  spec.inlineEmphasis={experienceBullet:[...new Set(all.flatMap(p=>p.runs.filter(r=>r.weight==='bold').map(r=>r.text.trim())).filter(t=>t.length>1))]};
  spec.elements.datesLine.spacingAfterIfNoKeyProjects=spec.elements.datesLine.spacing.after;
  // PDF geometry can center a long left-aligned line by coincidence. Body elements
  // stay left aligned; only header rows are inferred as centered.
  if(raw.format==='pdf')for(const key of Object.keys(spec.elements))if(!headerKeys.includes(key)&&!(key==='summaryParagraph'&&titleIsSummary))spec.elements[key].alignment='left';
  for(const key of headerKeys)if(spec.elements[key])spec.elements[key].indent={left:0};
  spec.referenceRules=raw.rules||[];
  if(report.fallbacks.length)report.warnings.push('No matching source paragraph: '+report.fallbacks.join(', ')+'. Defaults apply only to these absent elements.');spec.extraction={warnings:report.warnings,fallbacks:report.fallbacks};
  return {spec,report};
}
module.exports={extractDesign,readPdf,readDocx,family};
