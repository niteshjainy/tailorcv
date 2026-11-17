const fs=require('fs');
async function inspectPdf(file,spec,required=[]) {
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(fs.readFileSync(file)),fontExtraProperties:true,disableFontFace:true});
  try {
    const doc=await task.promise;const fonts=new Set(),text=[];
    for(let i=1;i<=doc.numPages;i++){
      const page=await doc.getPage(i);await page.getOperatorList();const c=await page.getTextContent();
      text.push(c.items.map(x=>x.str||'').join(' '));
      for(const item of c.items)if(item.str?.trim()&&page.commonObjs.has(item.fontName))fonts.add(page.commonObjs.get(item.fontName).name.replace(/^[A-Z]{6}\+/,''));
    }
    const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(?:(?:bolditalic|boldoblique|bold|italic|oblique|regular|roman|mt))+$/g,'').replace(/^charterbt$/,'bitstreamcharter');
    const allowed=(spec.fonts.allowedFamilies||[spec.fonts.primary]).map(normalize);
    const bad=[...fonts].filter(f=>!allowed.includes(normalize(f)));
    if(bad.length)throw new Error('Reference fonts were substituted: '+bad.join(', ')+'. Expected: '+spec.fonts.allowedFamilies.join(', ')+'. Install these fonts or explicitly update the design to an installed family.');
    const all=text.join('\n');
    if(/\(cid:|\uFFFD/.test(all))throw new Error('PDF contains unreadable characters.');
    const squash=s=>s.toLowerCase().replace(/\s+/g,'');
    for(const s of required)if(s&&!squash(all).includes(squash(s)))throw new Error('PDF text is missing: '+s);
    return {pages:doc.numPages,fonts:[...fonts],text:all};
  } finally {await task.destroy();}
}
module.exports={inspectPdf};
