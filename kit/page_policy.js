function pageLimit(cfg,spec,choice) {
  if(choice!==undefined){const n=Number(choice);if(![1,2].includes(n))throw new Error('--pages must be 1 or 2, reflecting the user’s explicit choice.');return n;}
  const limit=cfg.maxPages==='auto'?(spec.source?.pageCount||spec.maxPages||2):Number(cfg.maxPages);
  if(!Number.isInteger(limit)||limit<1)throw new Error('maxPages must be auto or a positive integer.');
  return limit;
}
function pageDecision(cfg,spec,pages,choice) {
  const limit=pageLimit(cfg,spec,choice);
  if(pages<=limit)return {status:'accepted',limit,pages};
  if(cfg.maxPages==='auto'&&limit===1&&choice===undefined)return {status:'choice_required',limit,pages,question:'The master resume is 1 page, and this version needs '+pages+' pages. Are you comfortable with a two-page resume, or should I keep it to one page?',options:[{pages:1,label:'Keep one page; shorten the content'},{pages:2,label:'Allow two pages'+(pages>2?'; shorten the content to fit':'')}]};
  return {status:'shorten_required',limit,pages,message:`This resume has ${pages} pages; the chosen limit is ${limit}. Shorten the content without shrinking fonts or margins.`};
}
module.exports={pageLimit,pageDecision};
