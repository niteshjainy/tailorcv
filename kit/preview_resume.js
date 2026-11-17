// Renders an existing LibreOffice-generated PDF to PNG; never creates a PDF.
const fs=require('fs'),path=require('path');
(async()=>{
  const [input,output,pageArg]=process.argv.slice(2);if(!input||!output)throw new Error('Usage: node kit/preview_resume.js resume.pdf page.png [page=1]');
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(fs.readFileSync(input))});
  try{const doc=await task.promise,page=await doc.getPage(Number(pageArg||1)),viewport=page.getViewport({scale:1.5}),factory=doc.canvasFactory,{canvas,context}=factory.create(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:context,viewport}).promise;fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,canvas.toBuffer('image/png'));factory.destroy({canvas,context});console.log('PREVIEW: '+path.resolve(output));}finally{await task.destroy();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
