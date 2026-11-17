// Shared Word style adapter: every element uses its own extracted properties.
const { Paragraph,TextRun,AlignmentType,BorderStyle,LevelFormat,TabStopType } = require('docx');
const { getColor } = require('./design_loader');
function renderer(spec) {
  const numbering=[];
  function style(key,override={}) {return {...spec.elements[key],...override};}
  function run(t,s,override={}) {return new TextRun({text:t,font:s.font||spec.fonts.primary,size:s.size?.halfPoints||spec.baseFontSize.halfPoints,color:getColor(spec,s.color||'black'),bold:s.weight==='bold',italics:!!s.italic,...override});}
  function richRuns(t,key,s){
    const phrases=spec.inlineEmphasis?.[key]||[];if(!phrases.length||s.weight==='bold')return [run(t,s)];
    const escaped=phrases.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length);
    const re=new RegExp('(?<![A-Za-z0-9])(?:'+escaped.join('|')+'|\\d+(?:[.+]\\d+)?[+%]?)(?![A-Za-z0-9])','gi');
    const parts=[];let cursor=0;for(const m of t.matchAll(re)){if(m.index>cursor)parts.push(run(t.slice(cursor,m.index),s));parts.push(run(m[0],s,{bold:true}));cursor=m.index+m[0].length;}if(cursor<t.length)parts.push(run(t.slice(cursor),s));return parts;
  }
  function paragraph(key,t,override={},runs) {
    const s=style(key,override),options={alignment:AlignmentType[(s.alignment||'left').toUpperCase()]||AlignmentType.LEFT,spacing:s.spacing,indent:s.indent,keepNext:s.keepWithNext??false,children:runs||richRuns(t,key,s),tabStops:s.tabStops};
    if(s.border?.bottom){const b=s.border.bottom;options.border={bottom:{...b,color:getColor(spec,b.color),style:BorderStyle[b.style.toUpperCase()]||BorderStyle.SINGLE}};}
    if(s.bullet){const b=s.bullet,reference='bullet-'+numbering.length;numbering.push({reference,levels:[{level:0,format:LevelFormat.BULLET,text:b.character,alignment:AlignmentType.LEFT,style:{paragraph:{indent:b.indent},run:{font:b.font||s.font||spec.fonts.primary,size:b.size?.halfPoints||b.glyphSize?.halfPoints||spec.baseFontSize.halfPoints}}}]});options.numbering={reference,level:0};}
    return new Paragraph(options);
  }
  function row(label,items,override={}) {const s=style('skillRow',override);if(s.itemSeparator)items=items.split(/,\s*/).join(s.itemSeparator);return paragraph('skillRow','',override,[...(label?[run(label+': ',s,{bold:s.labelWeight==='bold'})]:[]),run(items,s,{bold:s.itemsWeight==='bold'})]);}
  function paired(key,left,rightKey,right) {const width=spec.page.size.width-spec.margins.normal.left-spec.margins.normal.right-(spec.pairedRightInset||0);return paragraph(key,'',{tabStops:[{type:TabStopType.RIGHT,position:width}]},[run(left,style(key)),run('\t'+right,style(rightKey))]);}
  const titles={professionalSummary:'Professional Summary',technicalSkills:'Technical Skills',professionalExperience:'Professional Experience',education:'Education',certifications:'Certifications'};
  function heading(key,title) {const h=key==='extraSections'?spec.extraHeadings?.[title]:spec.sectionHeadings?.[key];return paragraph('sectionHeading',title||h?.text||titles[key],{keepWithNext:true,...h});}
  return {paragraph,row,heading,paired,numbering,run,style};
}
module.exports={renderer};
