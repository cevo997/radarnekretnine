import {collectionCandidates,portalPages,balancedCandidates} from './portal-readers.mjs';
import {kpCollection,kpPages} from './kp-reader.mjs';
import {publicDomain,genericListingURL} from './public-source.mjs';
import {byPublicationDesc} from './publication-order.mjs';
import {canonicalDiscoveryURL,internetSources} from './discovery.mjs';
import {clean} from './rules.mjs';
export function listingSource(value){try{const u=new URL(canonicalDiscoveryURL(value));return internetSources.find(s=>u.hostname.replace(/^www\./,'')===s.domain)?.id||publicDomain(u.href)}catch{return ''}}
export function isListingURL(value){try{const u=new URL(canonicalDiscoveryURL(value));const p=decodeURIComponent(u.pathname);switch(listingSource(value)){case'4zida':return /\/[a-f\d]{24}$/i.test(p);case'nekretnine':return /\/oglasi\/\d+\/?$/.test(p);case'halo':return /^\/nekretnine\/[^/]+\/[^/]+\/\d{8,}\/?$/.test(p);case'nadjidom':return /^\/(sr|hr|en|de)\/details\/\d+\//.test(p);case'oglasi':return /^\/oglas\/\d+-\d+\//.test(p);case'facebook':return /\/(posts|photos|videos)\//.test(p)||p.endsWith('/permalink.php');default:return genericListingURL(value)}}catch{return false}}
// A collection contributes links only. Its mixed prices/owners/dates never become listing data.
export function collectionLinks(raw,base){const links=new Map();const own=listingSource(base);const text=String(raw||'').slice(0,600000).replace(/!\[[^\]]*\]\([^)]*\)/g,'');function add(label,href){try{const url=canonicalDiscoveryURL(new URL(href.replace(/&amp;/g,'&'),base).href);if(!own||listingSource(url)!==own||!isListingURL(url))return;const title=clean(label).slice(0,250);if(links.has(url)&&links.get(url).title)return;links.set(url,{url,title})}catch{}}
 for(const m of text.matchAll(/\[([^\]]{0,2000})\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g))add(m[1],m[2]);
 for(const m of text.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))add(m[2],m[1]);
 return [...links.values()]}
// Only formats verified against the portal's current public cards are decoded here.
export function collectionListings(raw,base){const id=listingSource(base),rows=[];if(id==='kupujemprodajem.com')return kpCollection(raw,base);const text=String(raw||'').slice(0,600000).replace(/!\[[^\]]*\]\([^)]*\)/g,'').split(/\n#{1,4}\s+Korisno za tebe/i)[0];
 if(id==='halo'){const headings=[...text.matchAll(/^### \[([^\]\n]+)\]\(([^\s)]+)\)/gm)];for(let i=0;i<headings.length;i++){const h=headings[i];const meta=text.slice(Math.max(0,h.index-80),h.index).match(/(\d{1,2}\.\d{1,2}\.\d{4})\.(Vlasnik|Agencija|Investitor)\s*$/);if(!meta||meta[2]!=='Vlasnik')continue;const url=new URL(h[2],base).href;if(!isListingURL(url))continue;const preceding=text.slice(headings[i-1]?.index||0,h.index);const image=[...preceding.matchAll(/\[\s*\]\(([^\s)]+)\)/g)].findLast(m=>{try{return canonicalDiscoveryURL(new URL(m[1],base).href)===canonicalDiscoveryURL(url)}catch{return false}});const prices=image?[...preceding.slice(0,image.index).matchAll(/\*([\d.,\s]+)\s*€\*/g)]:[];const ownPrice=prices.at(-1)?.[1]?.trim()||'';let body=text.slice(h.index+h[0].length,headings[i+1]?.index||text.length);body=body.split(/\n\s*(?:\[\s*\]\(|\*[\d.,\s]+\s*€\*)/)[0];rows.push({url:canonicalDiscoveryURL(url),title:clean(h[1]),content:clean(h[1]+' '+(ownPrice?ownPrice+' € ':'')+body),ownerLabel:'Vlasnik',published:meta[1],cardVerified:true})}}
 if(id==='4zida'){const anchors=[...text.matchAll(/\[([^\]]{0,2000})\]\(([^\s)]+)\)/g)];for(let i=0;i<anchors.length;i++){const h=anchors[i];if(!h[1].trim())continue;const url=new URL(h[2],base).href;if(!isListingURL(url))continue;const body=text.slice(h.index+h[0].length,anchors[i+1]?.index||text.length);const date=body.match(/A[zž]urirano\s+(\d{1,2}\.\d{1,2}\.\d{4})/i)?.[1];if(!date||!body.includes('Vlasnik')||/Agencija|Investitor/.test(body))continue;const label=clean(h[1]);rows.push({url:canonicalDiscoveryURL(url),title:label.split(/\d[\d.\s]*\s*€/)[0].trim(),content:clean(label+' '+body),ownerLabel:'Vlasnik',published:date,cardVerified:true})}}
 return [...new Map(rows.map(x=>[x.url,x])).values()]}
export function listingDocument(raw,fallback=''){if(/oglas (?:trenutno |više |vise )?nije aktivan|oglasivac je parkirao|oglašivač je parkirao|oglas nije više aktuelan/i.test(String(raw)))return null;let text=String(raw||'').slice(0,120000).replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/<img\b[^>]*>/gi,'').replace(/\[\s*\]\([^\s)]+\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?\)/gi,'');const heading=text.match(/^#\s+(.+)$/m);if(heading)text=text.slice(heading.index);const reviews=text.search(/\n(?:Najnovije ocene oglašivača|Pošaljite poruku|### Korisno|## NEKRETNINE PO LOKACIJI|Pogledajte slične oglase)/i);if(reviews>0)text=text.slice(0,reviews);const end=text.search(/\n#{1,4}\s+(?:Sli[čc]ni|Preporu[čc]eni|Povezani|Najnoviji|Ostali)\s+oglasi/i);if(end>0)text=text.slice(0,end);const title=clean(heading?.[1]||fallback);if(/^(naslov|oglas|nekretnine|prijava|login|error|access denied)$/i.test(title)||text.length<35)return null;return{title,content:text.slice(0,18000)}}
export function collectionPageURLs(raw,base,maxPages=12,rotation=0){const id=listingSource(base);return id==='kupujemprodajem.com'?kpPages(raw,base,rotation):portalPages(raw,base,id,rotation,collectionListings(raw,base).length||collectionLinks(raw,base).length)}
export function collectionSeeds(turn=0){const categories=['kuca','placeva','garaza-i-parkinga','poslovnih-prostora'];return [
 {id:'4zida',url:'https://www.4zida.rs/prodaja-stanova/novi-sad/vlasnik?sortiranje=najnoviji'},
 {id:'4zida',url:'https://www.4zida.rs/prodaja-'+categories[turn%categories.length]+'/novi-sad/vlasnik'},
 {id:'halo',url:'https://www.halooglasi.com/nekretnine/prodaja-stanova-od-vlasnika-u-novom-sadu'},
 {id:'nekretnine',url:'https://www.nekretnine.rs/prodaja-stanova/novi-sad/?criterio=privateFirst'},
 {id:'nadjidom',url:'https://www.nadjidom.com/sr/nekretnine/prodaja/Novi%2BSad'}]}
export async function discoverPortalListings({queries,seeds,key,fetcher=fetch,perSource=8,acceptURL=(_url)=>true,knownURLs=new Set(),rotation=0,priorLinks=/** @type {any[]} */([]),deadlineAt=Date.now()+180000,maxRequests=40}){
 const documents=new Map(),links=new Map(),stats={},failures=[],morePages=new Set(),attempted=[],signatures=new Map();
 let requests=0,fatal='';
 const count=id=>stats[id]||(stats[id]={source:id,searchResults:0,collections:0,links:0,verifiedPages:0,failures:0,collectionPages:0,repeatedPages:0,filteredAgencies:0});
 const failure=(id,message)=>{count(id).failures++;failures.push(id+': '+String(message).replace(/tvly-[A-Za-z0-9_-]+/g,'[ključ]').slice(0,240))};
 async function pool(items,worker,width=3){let cursor=0;await Promise.all(Array.from({length:Math.min(width,items.length)},async()=>{while(cursor<items.length){const item=items[cursor++];if(Date.now()>deadlineAt)break;await worker(item)}}))}
 async function provider(endpoint,body){
  if(fatal)throw Error(fatal);if(requests>=maxRequests||Date.now()>deadlineAt)throw Error('Dostignut budžet provere; preostali linkovi čekaju naredni prolaz.');requests++;
  const r=await fetcher('https://api.tavily.com/'+endpoint,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(Math.max(1000,Math.min(30000,deadlineAt-Date.now())))});
  if(!r.ok){const message=r.status===401?'Tavily ključ nije prihvaćen (HTTP 401).':r.status===432||r.status===433?'Dostignuta je kvota povezanog pretraživača (HTTP '+r.status+').':'Servis je vratio HTTP '+r.status;if([401,432,433].includes(r.status))fatal=message;throw Error(message)}return r.json();
 }
 function rememberLink(x,prefer=false){
  let url;try{url=canonicalDiscoveryURL(x.url)}catch{return}const id=listingSource(url);if(!id||!isListingURL(url)||!acceptURL(url))return;
  const prior=links.get(url);if(!prior)count(id).links++;
  links.set(url,{...prior,...x,url,source:id,cached:!!x.cached,priority:Math.max(prior?.priority||0,x.ownerHint?2:prefer?1:0),lastAttempt:prior?.lastAttempt||x.lastAttempt||0,nextAttempt:prior?.nextAttempt||x.nextAttempt||0});
 }
 for(const x of priorLinks)rememberLink({...x,cached:true});
 function rememberCollection(x,prefer=false){
  const id=listingSource(x.url);if(!id||!acceptURL(x.url))return false;
  const candidates=collectionCandidates(x.raw_content,x.url,{isListingURL,canonicalURL:canonicalDiscoveryURL});if(!candidates.length&&id!=='facebook')failure(id,'Lista je otvorena bez prepoznatljivih linkova oglasa (prazna lista ili promenjen format).');
  const signature=candidates.map(x=>x.url).sort().join('|');const seen=signatures.get(id)||new Set();
  if(signature&&seen.has(signature)){count(id).repeatedPages++;return false}if(signature){seen.add(signature);signatures.set(id,seen)}
  const excluded=new Set(candidates.filter(x=>x.excluded).map(x=>x.url));for(const x of candidates)if(x.excluded)rememberLink(x);count(id).filteredAgencies+=excluded.size;
  for(const link of collectionLinks(x.raw_content,x.url))if(!excluded.has(link.url))rememberLink(link,prefer);
  for(const hint of candidates)if(!hint.excluded)rememberLink(hint,prefer);
  for(const row of collectionListings(x.raw_content,x.url)){documents.set(row.url,row);rememberLink({url:row.url,title:row.title,ownerHint:true},prefer)}
  return true;
 }
 function document(x,fallback=''){
  if(!isListingURL(x.url)||!acceptURL(x.url))return false;
  const url=canonicalDiscoveryURL(x.url),id=listingSource(url),doc=listingDocument(x.raw_content||x.content,fallback||x.title);
  if(!doc?.title){if(/oglas.*nije aktivan|parkirao|oglas nije više aktuelan/i.test(x.raw_content||''))documents.delete(url);return false}
  const prior=documents.get(url);if(prior?.verified&&!x.verified)return false;
  const tel=String(x.raw_content||'').match(/\]\(tel:([+\d ()-]+)\)/)?.[1]||'';const phone=/^\+?\d[\d ()-]{7,24}$/.test(tel)?tel:'';
  documents.set(url,{url,...doc,content:doc.content+(prior?.cardVerified?'\n\nPodaci javne kartice: '+prior.content:id==='mojtrg.rs'&&links.get(url)?.content?'\n\nPodaci kartice istog oglasa: '+links.get(url).content:''),phone,published:x.published_date||prior?.published||links.get(url)?.published||'',ownerLabel:prior?.ownerLabel||'',cardVerified:!!prior?.cardVerified,verified:!!x.verified});if(x.verified)count(id).verifiedPages++;return true;
 }
 await pool(queries,async q=>{count(q.id);try{
  const j=await provider('search',{query:q.query,search_depth:'basic',max_results:10,include_answer:false,include_raw_content:'markdown',...(q.domains?.length?{include_domains:q.domains}:{}),include_published_date:true,...(q.timeRange?{time_range:q.timeRange}:{})});
  if(!Array.isArray(j.results))throw Error('Neispravan odgovor pretraživača.');
  for(const x of j.results){const id=listingSource(x.url);if(!id||!acceptURL(x.url))continue;count(id).searchResults++;if(isListingURL(x.url)){document(x);rememberLink({url:x.url,title:x.title})}else{count(id).collections++;rememberCollection(x)}}
 }catch(e){failure(q.id,e.message)}});
 // All known portals use advanced reads; this rendered KP and the six other
 // observed public collections where basic extraction missed page content.
 await pool(seeds,async s=>{count(s.id);try{
  const j=await provider('extract',{urls:[s.url],extract_depth:'advanced',format:'markdown',timeout:20});let read=false;
  for(const x of j.results||[]){if(listingSource(x.url)!==s.id)continue;count(s.id).collections++;read=true;if(rememberCollection(x,true))for(const url of collectionPageURLs(x.raw_content,s.url,12,rotation))morePages.add(url)}
  if(!read)failure(s.id,'Javna lista nije dostupna.'+(j.failed_results?.[0]?.error?' '+j.failed_results[0].error:''));
 }catch(e){failure(s.id,e.message)}});
 const pagination=[...morePages].slice(0,18);const pageBatches=[];for(let i=0;i<pagination.length;i+=4)pageBatches.push(pagination.slice(i,i+4));
 await pool(pageBatches,async batch=>{try{
  const j=await provider('extract',{urls:batch,extract_depth:'advanced',format:'markdown',timeout:20});
  for(const x of j.results||[]){const id=listingSource(x.url);if(!id||!acceptURL(x.url))continue;count(id).collections++;count(id).collectionPages++;rememberCollection(x,true)}
  for(const x of j.failed_results||[])failure(listingSource(x.url)||'internet','Naredna stranica nije dostupna. '+(x.error||''));
 }catch(e){for(const id of new Set(batch.map(listingSource)))failure(id,e.message)}});
 const due=[...links.values()].filter(x=>!x.excluded&&!documents.get(x.url)?.verified&&(!x.nextAttempt||x.nextAttempt<=Date.now())).sort((a,b)=>Number(knownURLs.has(a.url))-Number(knownURLs.has(b.url))||(b.priority||0)-(a.priority||0)||(a.lastAttempt||0)-(b.lastAttempt||0));
 const selected=balancedCandidates(due,54,perSource);const batches=[];for(let i=0;i<selected.length;i+=5)batches.push(selected.slice(i,i+5));
 await pool(batches,async batch=>{try{
  const j=await provider('extract',{urls:batch.map(x=>x.url),extract_depth:'advanced',format:'markdown',timeout:20});const done=new Set();
  for(const x of j.results||[]){let url;try{url=canonicalDiscoveryURL(x.url)}catch{continue}const original=batch.find(b=>b.url===url);if(!original)continue;const usable=document({...x,verified:true},original.title);done.add(url);attempted.push({url,ok:usable});}
  for(const x of batch)if(!done.has(x.url)){attempted.push({url:x.url,ok:false});failure(x.source,'Pojedinačni oglas nije dostupan ili je preusmeren.');}
 }catch(e){for(const x of batch)attempted.push({url:x.url,ok:false});for(const id of new Set(batch.map(x=>x.source)))failure(id,e.message)}});
 return{rows:[...documents.values()],stats:Object.values(stats),failures:[...new Set(failures)],links:[...links.values()],attempted,requests,pending:Math.max(0,due.length-attempted.length),budgetLimited:requests>=maxRequests||Date.now()>deadlineAt};
}

export function selectListings(rows,limit=100,knownURLs=new Set()){const queues=new Map();for(const row of [...rows].sort((a,b)=>Number(knownURLs.has(a.url))-Number(knownURLs.has(b.url))||byPublicationDesc(a,b))){const id=listingSource(row.url);if(!queues.has(id))queues.set(id,[]);queues.get(id).push(row)}const chosen=[];while(chosen.length<limit){let added=false;for(const queue of queues.values()){if(queue.length&&chosen.length<limit){chosen.push(queue.shift());added=true}}if(!added)break}return chosen.sort(byPublicationDesc)}
