// Check the exact tracked + unignored files that would be included by git add .
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
(async()=>{
  const result=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'});
  if(result.status!==0)throw new Error('Run this check from an initialized Git checkout.');
  const files=[...new Set(result.stdout.split('\0').filter(Boolean))],errors=[];
  const blocked=/^(?:resume\/base_resume\.json|kit\/DESIGN_SPEC(?:\.report)?\.json|output\/|node_modules\/|\.env(?:\.|$)|\.aws\/|\.codex\/|\.claude\/|\.agents\/)/;
  let personal;
  const privateFile=path.join(root,'resume','base_resume.json');
  if(fs.existsSync(privateFile)){const base=JSON.parse(fs.readFileSync(privateFile,'utf8'));if(!/example\.(com|org)$/i.test(base.email||''))personal=base;}
  for(const name of files){
    if(blocked.test(name)||name.startsWith('work/')&&name!=='work/.gitkeep'||name.startsWith('resume/source/')&&name!=='resume/source/.gitkeep'){errors.push(name+': private/generated path');continue;}
    const file=path.join(root,name);if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
    let content;
    if(/\.pdf$/i.test(name)){
      const{getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(fs.readFileSync(file))});try{const doc=await task.promise,parts=[];for(let p=1;p<=doc.numPages;p++)parts.push((await(await doc.getPage(p)).getTextContent()).items.map(i=>i.str||'').join(' '));content=parts.join('\n');}finally{await task.destroy();}
    }else if(/\.(?:js|cjs|json|md|html|txt|yml|yaml)$/.test(name)||['LICENSE','.gitignore'].includes(name))content=fs.readFileSync(file,'utf8');else continue;
    if(/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9]{35,}|AKIA[A-Z0-9]{16})/.test(content))errors.push(name+': potential access key');
    if(personal)for(const field of ['name','email','phone','linkedin']){const value=personal[field];if(value&&value.length>6&&content.toLowerCase().includes(value.toLowerCase()))errors.push(name+': contains private '+field);}
  }
  if(errors.length)throw new Error('Public-file check failed:\n'+errors.join('\n'));
  console.log('PUBLIC CHECK PASSED: '+files.length+' files; private paths excluded, no matching personal content or access-key patterns detected.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
