// Download licensed full fonts into the project cache and embed them in Word.
// No administrator rights or system-wide font installation are required.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {spawnSync}=require('child_process');
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function fontClass(name){return /charter|charis|cambria|georgia|constantia|times|palatino|antiqua|baskerville|garamond|(?:^| )serif/i.test(name)&&!/sans/i.test(name)?'serif':/courier|consolas|mono/i.test(name)?'monospace':'sans-serif';}
function chooseFallback(name,installed,preferred='auto'){
  const candidates=preferred&&preferred!=='auto'?[preferred]:[];
  const group=fontClass(name);
  candidates.push(...(group==='serif'?['Charter','Cambria','Georgia','Constantia','Noto Serif','Liberation Serif','Times New Roman']:group==='monospace'?['Consolas','Liberation Mono','Courier New']:['Calibri','Carlito','Arial','Liberation Sans','DejaVu Sans']));
  candidates.push('Calibri','Carlito','Arial','Liberation Sans','DejaVu Sans');
  return candidates.find(c=>installed.some(f=>normalize(f)===normalize(c)));
}
async function downloadCharter(cache,fetcher=fetch){
  const dir=path.join(cache,'charter'),manifestPath=path.join(dir,'manifest.json');
  if(fs.existsSync(manifestPath))try{const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(m.family!=='Charter'||!m.faces?.data||!fs.readFileSync(path.join(dir,'LICENSE.txt'),'utf8').includes('Bitstream'))throw Error('Invalid Charter license');for(const f of Object.values(m.faces)){if(path.basename(f.file)!==f.file||fontInfo(fs.readFileSync(path.join(dir,f.file))).sha256!==f.sha256)throw Error('Invalid cached Charter font');}return {...m,directory:dir,cached:true};}catch{}
  const source='https://practicaltypography.com/fonts/Charter%20210112.zip';
  const zip=require('fflate').unzipSync(await fetchBytes(source,fetcher,2*1024*1024));
  const licenseEntry=Object.entries(zip).find(([k])=>/Charter license\.txt$/.test(k));
  const license=licenseEntry?Buffer.from(licenseEntry[1]).toString('utf8'):'';
  if(!/granted permission[\s\S]*use, copy, modify[\s\S]*redistribute/i.test(license)||!/Bitstream/.test(license))throw Error('Charter permission notice missing');
  const suffix={data:'Regular',bold:'Bold',italic:'Italic',boldItalic:'Bold Italic'},faces={},buffers={};
  for(const [key,style] of Object.entries(suffix)){const entry=Object.entries(zip).find(([name])=>name.endsWith('/Charter '+style+'.ttf'));if(!entry)throw Error('Charter face missing: '+style);const data=Buffer.from(entry[1]),info=fontInfo(data);if(!info.families.includes('Charter'))throw Error('Wrong Charter family');faces[key]={file:'Charter-'+style.replace(/ /g,'')+'.ttf',sha256:info.sha256};buffers[key]=data;}
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'LICENSE.txt'),license);for(const [key,data] of Object.entries(buffers))fs.writeFileSync(path.join(dir,faces[key].file),data);
  const manifest={family:'Charter',license:'Original Bitstream Charter permission notice',source,faces};fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));return {...manifest,directory:dir,cached:false};
}
function installedFonts() {
  if(process.platform==='win32'){
    const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Add-Type -AssemblyName System.Drawing; @((New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }) | ConvertTo-Json -Compress'],{encoding:'utf8',timeout:20000});
    if(r.status===0){try{return JSON.parse(r.stdout.replace(/^\uFEFF/,''));}catch{}}
  }else{
    const r=spawnSync('fc-list',['--format=%{family}\n'],{encoding:'utf8',timeout:10000});
    if(r.status===0)return [...new Set(r.stdout.split(/[\n,]/).map(s=>s.trim()).filter(Boolean))];
  }
  return [];
}
function fontInfo(buf) {
  if(buf.length<12||!['00010000','4f54544f','74727565'].includes(buf.subarray(0,4).toString('hex')))throw new Error('Downloaded file is not a supported TTF/OTF font');
  const tables={};
  for(let i=0;i<buf.readUInt16BE(4);i++){const at=12+i*16;if(at+16>buf.length)throw new Error('Invalid font table');const offset=buf.readUInt32BE(at+8),length=buf.readUInt32BE(at+12);if(offset+length>buf.length)throw new Error('Invalid font bounds');tables[buf.toString('ascii',at,at+4)]={offset,length};}
  const os=tables['OS/2'];if(!os||os.length<10)throw new Error('Font has no embedding permission flags');
  const flags=buf.readUInt16BE(os.offset+8);
  if(flags&0x0002||flags&0x0200||flags&0x0004 && !(flags&0x0008))throw new Error('Font does not permit editable outline embedding');
  const table=tables.name;if(!table)throw new Error('Font family metadata missing');
  const count=buf.readUInt16BE(table.offset+2),start=table.offset+buf.readUInt16BE(table.offset+4),names=[];
  for(let i=0;i<count;i++){
    const at=table.offset+6+i*12;if(at+12>table.offset+table.length)throw new Error('Invalid font name table');
    const platform=buf.readUInt16BE(at),id=buf.readUInt16BE(at+6),length=buf.readUInt16BE(at+8),offset=start+buf.readUInt16BE(at+10);
    if(offset+length>buf.length)throw new Error('Invalid font name bounds');
    if(id===1||id===16){const data=Buffer.from(buf.subarray(offset,offset+length));names.push(platform===0||platform===3?data.swap16().toString('utf16le'):data.toString('latin1'));}
  }
  return {families:names,sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
async function fetchBytes(url,fetcher=fetch,max=12*1024*1024) {
  const r=await fetcher(url,{signal:AbortSignal.timeout(12000),redirect:'error'});
  if(!r.ok)throw new Error('Download returned HTTP '+r.status);
  if(Number(r.headers.get('content-length')||0)>max)throw new Error('Download is too large');
  const chunks=[];let total=0;
  for await(const chunk of r.body){total+=chunk.length;if(total>max)throw new Error('Download is too large');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
async function downloadFont(name,cache,fetcher=fetch) {
  if(['bitstreamcharter','charter','charterbt'].includes(normalize(name)))return downloadCharter(cache,fetcher);
  // Google Fonts repository publishes the family metadata and its OFL together.
  // Unknown/proprietary fonts, non-OFL licenses and unsupported variable files fall back.
  const slug=normalize(name);if(!/^[a-z0-9]{1,80}$/.test(slug))throw new Error('Unsupported family name');
  const dir=path.join(cache,slug),manifestPath=path.join(dir,'manifest.json');
  if(fs.existsSync(manifestPath)){
    try{const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(m.family!==name||!fs.existsSync(path.join(dir,'OFL.txt'))||!fs.readFileSync(path.join(dir,'OFL.txt'),'utf8').includes('SIL OPEN FONT LICENSE Version 1.1'))throw new Error('Invalid cached license');for(const face of Object.values(m.faces)){if(path.basename(face.file)!==face.file)throw new Error('Invalid cache filename');const info=fontInfo(fs.readFileSync(path.join(dir,face.file)));if(info.sha256!==face.sha256||!info.families.some(f=>normalize(f)===normalize(name)))throw new Error('Invalid cached font');}return {...m,directory:dir,cached:true};}catch{/* Re-fetch a damaged cache. */}
  }
  const base='https://raw.githubusercontent.com/google/fonts/main/ofl/'+slug+'/';
  const license=(await fetchBytes(base+'OFL.txt',fetcher,100000)).toString('utf8');
  if(!license.includes('SIL OPEN FONT LICENSE Version 1.1'))throw new Error('No verified OFL embedding permission');
  const metadata=(await fetchBytes(base+'METADATA.pb',fetcher,200000)).toString('utf8');
  const faces={};
  for(const block of metadata.matchAll(/fonts\s*\{([^}]+)\}/g)){
    const t=block[1],weight=Number(t.match(/weight:\s*(\d+)/)?.[1]),style=t.match(/style:\s*"([^"]+)"/)?.[1],file=t.match(/filename:\s*"([^"]+)"/)?.[1];
    if(!file||!/^[-A-Za-z0-9]+\.ttf$/.test(file)||![400,700].includes(weight)||!['normal','italic'].includes(style))continue;
    const key=weight===400?(style==='italic'?'italic':'data'):(style==='italic'?'boldItalic':'bold');
    faces[key]={file};
  }
  if(!faces.data)throw new Error('No supported static regular TTF in the licensed source');
  const downloaded={};
  for(const [key,face] of Object.entries(faces)){const data=await fetchBytes(base+face.file,fetcher);const info=fontInfo(data);if(!info.families.some(f=>normalize(f)===normalize(name)))throw new Error('Downloaded family does not match '+name);face.sha256=info.sha256;downloaded[key]=data;}
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'OFL.txt'),license);
  for(const [key,data] of Object.entries(downloaded))fs.writeFileSync(path.join(dir,faces[key].file),data);
  const manifest={family:name,license:'SIL OFL 1.1',source:base,faces};fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
  return {...manifest,directory:dir,cached:false};
}
function replaceFamily(spec,from,to){
  const visit=o=>{if(!o||typeof o!=='object')return;for(const [k,v] of Object.entries(o)){if(['font','primary','fallback'].includes(k)&&typeof v==='string'&&normalize(v)===normalize(from))o[k]=to;else if(k!=='source'&&k!=='extraction')visit(v);}};visit(spec);
}
async function prepareFonts(original,cfg,options={}) {
  const spec=structuredClone(original),installed=options.installed||installedFonts(),has=name=>installed.some(f=>normalize(f)===normalize(name));
  const messages=[],fonts=[],cache=options.cache||path.join(__dirname,'..','work','fonts');
  const requested=[...new Set([spec.fonts.primary,...Object.values(spec.elements).map(e=>e.font),...Object.values(spec.sectionHeadings||{}).map(e=>e.font),spec.contactIcons?.font].filter(Boolean))];
  const resolutions=[];
  for(const name of requested){
    if(has(name)&&!options.forceFallback){resolutions.push({requested:name,used:name,action:'installed'});continue;}
    const fallback=chooseFallback(name,installed,cfg.fallbackFont||'auto');
    if(has(name)&&(!options.forceFallback||normalize(name)===normalize(fallback))){resolutions.push({requested:name,used:name,action:'installed'});continue;}
    let reason='Font downloads disabled';
    if(cfg.downloadFonts!==false){try{const d=await downloadFont(name,cache,options.fetcher||fetch);const used=d.family,record={name:used};if(used!==name)replaceFamily(spec,name,used);for(const [key,face] of Object.entries(d.faces))record[key]=path.join(d.directory,face.file);if(!fonts.some(f=>f.name===used))fonts.push(record);messages.push(`${name}: ${d.cached?'reused licensed local cache':'downloaded with '+d.license+' permission'} and embedded locally as ${used}.`);resolutions.push({requested:name,used,action:'embedded',source:d.source});continue;}catch(e){reason=e.message;}}
    if(!fallback)throw new Error('No usable installed fallback is available for '+name+'. Install a '+fontClass(name)+' font.');
    replaceFamily(spec,name,fallback);messages.push(`${name} → ${fallback}: ${reason}. Default font used; reference font sizes and margins retained.`);resolutions.push({requested:name,used:fallback,action:'fallback',reason});
  }
  spec.embeddedFonts=fonts;
  spec.fonts.allowedFamilies=[...new Set(resolutions.map(r=>r.used))];
  if(spec.fonts.allowedFamilies.some(f=>/^(Calibri|Carlito)$/i.test(f)))spec.fonts.allowedFamilies.push('Calibri','Carlito');
  spec.fontResolution={messages,resolutions};
  return {spec,messages,resolutions};
}
function embeddedFontOptions(spec){return (spec.embeddedFonts||[]).map(f=>Object.fromEntries(Object.entries(f).map(([key,value])=>[key,key==='name'?value:fs.readFileSync(value)])));}
module.exports={installedFonts,fontInfo,downloadFont,prepareFonts,embeddedFontOptions,fontClass,chooseFallback};
