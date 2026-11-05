import {clean,normalize} from './rules.mjs';

export const agencyEvidence=value=>/agencijsk[aiue] (?:provizij|oznak|sifr|broj|id)|sifra agencije|registar posrednika|registru posrednika|ugovor o posredovanju|agencija za nekretnine|agencija .{0,50}prodaje|oglasivac\s*[:–-]?\s*(?:agencija|prodavnica)/.test(normalize(value).replace(/(?:bez|nema) agencijske provizije/g,''));

export function sourceDate(value){
 const text=clean(value),label=text.match(/(?:objavljen[oa]?|ažuriran[oa]?|azuriran[oa]?|obnovljen[oa]?|datum objave|datum ažuriranja|datum azuriranja|postavljeno|published|updated)\s*[:*–-]*\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}(?:T[^\s]+)?)/i);
 if(!label){const imovina=text.match(/ažurirano u \d{1,2}:\d{2}h, dana (\d{1,2}\.\d{1,2}\.\d{4})/i);return imovina?.[1]||'';}
 const date=label[1],parts=date.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/);
 return parts?`${parts[1]}.${parts[2]}.${parts[3].length===2?'20'+parts[3]:parts[3]}`:date;
}

// Segments never cross a different listing URL. Hints are queued for a detail
// read; unlabelled cards from mixed agency/owner lists cannot create contacts.
export function collectionCandidates(raw,base,{isListingURL,canonicalURL}){
 const text=String(raw||'').slice(0,600000).replace(/!\[[^\]]*\]\([^)]*\)/g,'');
 const host=new URL(base).hostname.replace(/^www\./,'');const groups=[];
 for(const m of text.matchAll(/\[([^\]]{0,2000})\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)){
  try{const u=new URL(m[2].replace(/&amp;/g,'&'),base);if(u.hostname.replace(/^www\./,'')!==host||!isListingURL(u.href))continue;
   const url=canonicalURL(u.href);if(groups.at(-1)?.url===url)continue;groups.push({url,start:m.index,label:clean(m[1])});
  }catch{}
 }
 const out=new Map();
 for(let i=0;i<groups.length;i++){
  const g=groups[i];if(out.has(g.url))continue;
  const body=text.slice(g.start,groups[i+1]?.start||Math.min(text.length,g.start+20000));
  const title=clean(body.match(/^#{1,4}\s+\[([^\]]+)\]/m)?.[1]||(!/^\d|^gold$|^premium$/i.test(g.label)?g.label:'')||decodeURIComponent(new URL(g.url).pathname.split('/').filter(Boolean).slice(-2,-1)[0]||'Oglas').replace(/[-_+]/g,' ')).slice(0,250);
  const published=sourceDate(body)||((host==='nadjidom.com'?body.match(/(?:^|\n)\s*(\d{1,2})\/(\d{1,2})\/(\d{2})\s+\d+/m):null)?.slice(1).join('.')||'');
  out.set(g.url,{url:g.url,title,content:clean(body).slice(0,1600),published,excluded:agencyEvidence(body),ownerHint:/privatno lice|fizicko lice|direktno od vlasnika|oglasivac\s*[:–-]?\s*vlasnik/.test(normalize(body))});
 }
 return [...out.values()];
}

// Only follow links belonging to the exact same collection and filters.
export function portalPages(raw,base,source,rotation=0,cardCount=0){
 const u=new URL(base),pages=new Map();const key={halo:'page',nekretnine:'pag',nadjidom:'page','mojtrg.rs':'Page','4zida':'strana'}[source];
 const pathKey=p=>p.replace(/stanovi-apartmani/g,'stanovi').replace(/\/\d+\/([^/]*-p)\d+(\.html)$/,'/PAGE/$1PAGE$2');
 const filters=url=>[...url.searchParams].filter(([k])=>k!==key).sort(([a],[b])=>a.localeCompare(b)).map(x=>x.join('=')).join('&');
 for(const m of String(raw||'').matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)){
  try{const next=new URL(m[1].replace(/&amp;/g,'&'),base);if(next.origin!==u.origin||pathKey(next.pathname)!==pathKey(u.pathname)||filters(next)!==filters(u))continue;
   const n=key?Number(next.searchParams.get(key)):Number(next.pathname.match(/-p(\d+)\.html$/)?.[1]);
   if(Number.isInteger(n)&&n>1&&n<=200&&next.href!==u.href)pages.set(n,next.href);
  }catch{}
 }
 if(source==='nadjidom'&&cardCount){const total=Number(String(raw).match(/Pronađeno je\s*\*\*(\d+)\*\*\s*rezultata/i)?.[1]);if(total)for(let n=2;n<=Math.min(40,Math.ceil(total/cardCount));n++){const next=new URL(u);next.searchParams.set('page',String(n));pages.set(n,next.href)}}
 if(source==='4zida'){
  const total=Number(String(raw).match(/(?:\*\*)?(\d[\d.,]*)(?:\*\*)?\s*oglasa\b/i)?.[1]?.replace(/[.,]/g,''));
  if(total&&cardCount)for(let n=2;n<=Math.min(40,Math.ceil(total/cardCount));n++){const next=new URL(u);next.searchParams.set('strana',String(n));pages.set(n,next.href);}
 }
 // Halo does not always expose navigation in extracted Markdown. Probe only
 // page 2; repeated listing signatures are detected by the crawler.
 if(source==='halo'&&!pages.size&&cardCount>=20&&!u.searchParams.has('page')){const next=new URL(u);next.searchParams.set('page','2');pages.set(2,next.href);}
 const all=[...pages].sort(([a],[b])=>a-b).map(([,url])=>url);if(!all.length)return [];
 const offset=((rotation%all.length)+all.length)%all.length;
 return [all[offset],all[(offset+1)%all.length]].filter((x,i,a)=>a.indexOf(x)===i);
}

export function balancedCandidates(links,limit=54,perSource=8){
 const queues=new Map();for(const x of links){if(!queues.has(x.source))queues.set(x.source,[]);queues.get(x.source).push(x);}
 const selected=[];while(selected.length<limit){let changed=false;for(const q of queues.values()){if(q.length&&selected.filter(x=>x.source===q[0].source).length<perSource){selected.push(q.shift());changed=true;if(selected.length===limit)break}}if(!changed)break}return selected;
}
