import {clean} from './rules.mjs';
import {classifyDiscovery} from './discovery.mjs';
import {collectionLinks,collectionListings,collectionPageURLs,listingDocument,listingSource} from './portal-discovery.mjs';

export function htmlMarkdown(html){return String(html).replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<img\b[^>]*>/gi,'').replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,(_,n,t)=>'\n'+'#'.repeat(Number(n))+' '+clean(t)+'\n').replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,(_,url,t)=>'['+clean(t).replace(/[\[\]]/g,'')+']('+url.replace(/ /g,'%20')+')').replace(/<(?:br|\/(?:p|div|li|section|article|ul|tr))\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&euro;/g,'€').replace(/&sup2;/g,'²').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n')}

export async function readPublicPage(url,source,fetcher=fetch){
 let next=new URL(url);if(next.protocol!=='https:'||listingSource(next.href)!==source)throw Error('Nedozvoljen izvor.');
 for(let i=0;i<3;i++){
  const r=await fetcher(next.href,{headers:{'User-Agent':'XpertRadar/1.0 (public property listings)'},redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(r.status>=300&&r.status<400){const location=r.headers.get('location');if(!location)throw Error('Preusmeravanje nema adresu.');next=new URL(location,next);if(next.protocol!=='https:'||listingSource(next.href)!==source)throw Error('Portal je preusmerio van izvora.');continue}
  if(!r.ok)throw Error('Direktan pristup: HTTP '+r.status);
  const html=await r.text();if(html.length>5000000)throw Error('Prevelika stranica.');if(/cf-chl-|captcha|just a moment/i.test(html.slice(0,12000)))throw Error('Portal zahteva proveru pristupa.');return {url:next.href,raw_content:htmlMarkdown(html),html};
 }throw Error('Previše preusmeravanja.');
}

// Direct reads never turn an unlabelled collection into an owner contact.
export async function crawlDirectSource({id,urls,rotation=0,knownURLs=new Set(),fetcher=fetch,deadlineAt=Date.now()+80000}){
 const rows=new Map(),links=new Map(),errors=[];let pages=0,details=0,blocked=false;
 const add=doc=>{for(const x of collectionLinks(doc.raw_content,doc.url))links.set(x.url,x);for(const x of collectionListings(doc.raw_content,doc.url))rows.set(x.url,x)};
 const seeds=urls.length>1?[urls[0],urls[1+rotation%(urls.length-1)]]:urls.slice(0,1);
 for(const seed of seeds){if(Date.now()>deadlineAt)break;try{
  const doc=await readPublicPage(seed,id,fetcher);pages++;add(doc);
  for(const url of collectionPageURLs(doc.raw_content,seed,12,rotation).slice(0,1)){if(Date.now()>deadlineAt)break;try{add(await readPublicPage(url,id,fetcher));pages++}catch(e){errors.push(e.message)}}
 }catch(e){errors.push(e.message);if(/403|429|proveru pristupa/.test(e.message)){blocked=true;break}}}
 const candidates=[...links.values()].sort((a,b)=>Number(knownURLs.has(a.url))-Number(knownURLs.has(b.url))).slice(0,4);
 await Promise.all(candidates.map(async x=>{if(Date.now()>deadlineAt)return;try{
  const doc=await readPublicPage(x.url,id,fetcher);details++;const parsed=listingDocument(doc.raw_content,x.title);if(!parsed)return;
  const tel=doc.raw_content.match(/\]\(tel:([+\d ()-]+)\)/)?.[1]||'';
  const lead=classifyDiscovery({url:x.url,...parsed,phone:tel,verified:true});if(lead.ready)rows.set(x.url,{...lead,description:lead.content,verified:true});
 }catch(e){if(!/agencij|obuhvat|potražnja|oglašivača/.test(e.message))errors.push(e.message)}}));
 const contacts=[];for(const row of rows.values()){if(row.ready&&row.verified){contacts.push(row);continue}try{const x=classifyDiscovery({...row,verified:!!row.verified,cardVerified:!!row.cardVerified});if(x.ready)contacts.push(x)}catch{}}
 return {contacts,links:[...links.values()].map(x=>({...x,source:id})),pages,details,blocked,errors:[...new Set(errors)],read:pages>0};
}
