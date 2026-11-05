import {randomUUID} from 'node:crypto';
import {mkdir,open,readFile,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {openStore} from './store.mjs';
import {createReader,wait,allowedURL} from './reader.mjs';
import {categoryNavigation} from './navigation.mjs';
import {collectionLinks,collectionListings,collectionPageURLs,listingDocument} from '../lib/portal-discovery.mjs';
import {classifyDiscovery,canonicalDiscoveryURL} from '../lib/discovery.mjs';
import {parseOglasi,parseNekretnine,publicPhone} from '../lib/rules.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const base=new URL(process.env.RADAR_URL||'https://invalid.local');
const token=process.env.RADAR_WORKER_TOKEN||'';
if(base.protocol!=='https:'||base.username||base.password||base.port||token.length<32||token.length>128)throw Error('Pokrenite npm run setup i unesite javnu HTTPS adresu i ključ.');
const bounded=(key,def,min,max)=>Math.min(max,Math.max(min,Number(process.env[key])||def));
const interval=bounded('RADAR_INTERVAL_SECONDS',300,300,86400)*1000;
const pageBudget=bounded('RADAR_MAX_PAGES_PER_CYCLE',80,8,300);
const detailLimit=bounded('RADAR_DETAILS_PER_SOURCE',8,1,30),listLimit=bounded('RADAR_COLLECTIONS_PER_SOURCE',2,1,8);
const data=resolve(root,'data');await mkdir(data,{recursive:true});
const lockPath=resolve(data,'worker.lock');
let lock;
for(let attempt=0;attempt<2;attempt++){try{lock=await open(lockPath,'wx',0o600);await lock.writeFile(String(process.pid));break}catch(e){if(e.code!=='EEXIST')throw e;let active=true;try{const pid=Number(await readFile(lockPath,'utf8'));if(!Number.isInteger(pid)||pid<1||pid===process.pid)throw Error();process.kill(pid,0)}catch(err){if(err.code==='EPERM')throw Error('Ne mogu da proverim postojeći proces.');active=false}if(active)throw Error('Pretraživač je već pokrenut iz ovog foldera.');await unlink(lockPath).catch(()=>{})}}
if(!lock)throw Error('Pretraživač je već pokrenut.');
const store=await openStore(data);let reader,stopping=false,leaseLost=false,heartbeatBusy=false;let phase='Povezivanje',lastError='',lastCompleted=await store.get('lastCompleted','');
const workerId=await store.get('workerId',randomUUID());await store.set('workerId',workerId);

const redacted=value=>String(value).split(token).join('[ključ]').replace(/tvly-[\w-]+/g,'[ključ]').slice(0,1000);
function log(message){console.log(new Date().toLocaleString('sr-RS',{timeZone:'Europe/Belgrade'})+' · '+redacted(message))}
async function api(action,payload={}){const r=await fetch(new URL('/api/worker',base),{method:action?'POST':'GET',redirect:'error',headers:{Authorization:'Bearer '+token,...(action?{'Content-Type':'application/json'}:{})},body:action?JSON.stringify({action,workerId,...payload}):undefined,signal:AbortSignal.timeout(60000)});const raw=await r.text();let j;try{j=JSON.parse(raw)}catch{throw Error('Aplikacija nije vratila JSON (HTTP '+r.status+'). Proverite URL i Vercel zaštitu pristupa.')}if(!r.ok){const e=new Error(j.error||'API HTTP '+r.status);e.status=r.status;throw e}return j}
async function beat(){if(heartbeatBusy)return;heartbeatBusy=true;try{await api('heartbeat',{phase,lastError,lastCompleted,...await store.pending()})}catch(e){lastError=redacted(e.message);if(e.status===401||e.status===409)leaseLost=true;log('Veza sa aplikacijom: '+lastError)}finally{heartbeatBusy=false}}
async function flush(){for(const kind of ['rows','report']){const r=await store.db.execute({sql:'SELECT id,payload FROM outbox WHERE kind=? AND next_attempt<=? ORDER BY created ASC LIMIT ?',args:[kind,Date.now(),kind==='rows'?25:8]});if(!r.rows.length)continue;const payload=r.rows.map(x=>JSON.parse(x.payload));const result=await api(kind==='rows'?'ingest':'report',kind==='rows'?{rows:payload}:{runs:payload});
 // Rejected rows are recorded locally for review instead of silently retried forever.
 if(result.rejected)log('Server je odbacio '+result.rejected+' zapisa: '+(result.errors||[]).slice(0,2).join(' '));
 const operations=[];for(let i=0;i<r.rows.length;i++){const x=r.rows[i];const reason=(result.errors||[]).find(e=>e.startsWith('Rezultat '+(i+1)+':'));if(reason){if(/database|SQL|timeout|fetch|network|locked|UNIQUE/i.test(reason)){operations.push({sql:'UPDATE outbox SET next_attempt=?,attempts=attempts+1 WHERE id=?',args:[Date.now()+120000,x.id]});continue}operations.push({sql:'INSERT OR REPLACE INTO rejections(id,payload,reason,at) VALUES(?,?,?,?)',args:[x.id,x.payload,redacted(reason),Date.now()]})}operations.push({sql:'DELETE FROM outbox WHERE id=?',args:[x.id]})}await store.db.batch(operations,'write');
 if(kind==='rows')log('Sinhronizacija: '+(result.contacts||0)+' novih kontakata; '+(result.updated||0)+' postojećih; '+(result.rejected||0)+' odbačenih.');}}
async function emitRow(row,pages){try{const classified=classifyDiscovery(row,pages);await store.emit('row:'+classified.url,'rows',{...row,source:classified.source});return classified.ready?'owner':'review'}catch(e){return 'rejected'}}
async function cycle(config){const turn=Number(await store.get('cycle',0));let used=0;
 const acknowledged=[];for(const request of config.requestedLinks||[]){const url=request.url;const source=config.sources.find(s=>allowedURL(url,s.id,config.facebookPages))?.id||(allowedURL(url,'facebook',config.facebookPages)?'facebook':'');if(source&&await store.enqueue(url,source,'detail',{},Date.now(),5)){await store.db.execute({sql:'UPDATE jobs SET due=?,priority=5 WHERE url=?',args:[Date.now(),url]});acknowledged.push(request)}}if(acknowledged.length)await api('ackLinks',{links:acknowledged});
 const sources=[...config.sources,...config.facebookPages.map(url=>({id:'facebook',urls:[url],name:'Facebook'}))];
 const groups=new Map();for(const s of sources){const prior=groups.get(s.id);groups.set(s.id,prior?{...prior,urls:[...new Set([...prior.urls,...s.urls])]}:s)}
 for(const s of groups.values())for(const url of s.urls)if(allowedURL(url,s.id,config.facebookPages))await store.enqueue(url,s.id,'collection',{},Date.now(),0);
 const ordered=[...groups.values()];const start=turn%Math.max(ordered.length,1);ordered.push(...ordered.splice(0,start));let cursor=0;
 async function processSource(s){if(stopping||leaseLost)return;const until=await store.get('pause:'+s.id,0);if(until>Date.now())return;
  const stats={pages:0,details:0,links:0,owner:0,review:0,rejected:0};const errors=[];let blocked=false;const signatures=new Set();
  async function readJob(job){if(stopping||leaseLost||used>=pageBudget)return;used++;phase=s.name+' · '+(job.kind==='collection'?'lista oglasa':'pojedinačni oglas');let doc;
   try{doc=await reader.read(job.url,s.id);stats.pages++;
    if(job.kind==='collection'){
     const links=collectionLinks(doc.raw_content,doc.url);stats.links+=links.length;
     const signature=links.map(x=>x.url).sort().join('|');if(signature&&signatures.has(signature)){await store.finish(job.url,interval,'Ponovljena lista');return}if(signature)signatures.add(signature);
     for(const link of links)if(allowedURL(link.url,s.id,config.facebookPages))await store.enqueue(canonicalDiscoveryURL(link.url),s.id,'detail',link,Date.now(),1);
     let cards=collectionListings(doc.raw_content,doc.url);
     if(s.id==='oglasi'||s.id==='nekretnine'){try{const parsed=s.id==='oglasi'?parseOglasi(doc.html):parseNekretnine(doc.html);cards.push(...parsed.map(x=>({...x,ownerLabel:'Vlasnik',cardVerified:true,content:[x.description,x.location,x.area?x.area+' m²':'',x.price?x.price+' €':''].filter(Boolean).join('\n')})))}catch{}}
     for(const row of cards){if(!allowedURL(row.url,s.id,config.facebookPages))continue;const outcome=await emitRow(row,config.facebookPages);stats[outcome]++}
     for(const url of collectionPageURLs(doc.raw_content,doc.url,12,turn).slice(0,2))if(allowedURL(url,s.id,config.facebookPages))await store.enqueue(url,s.id,'collection',{navigationDepth:job.payload.navigationDepth||0},Date.now(),-1);
     if(!job.payload.navigationDepth)for(const url of categoryNavigation(doc.html,doc.url,s.id).slice(0,4))await store.enqueue(url,s.id,'collection',{navigationDepth:1},Date.now(),-2);
     if(!links.length&&!cards.length)errors.push('Lista je otvorena, ali nema prepoznatih oglasa. Potrebna je provera formata ili sadržaja.');
     await store.finish(job.url,interval);
    }else{
     stats.details++;const parsed=listingDocument(doc.raw_content,job.payload.title||'');if(!parsed){stats.rejected++;await store.finish(job.url,7*86400000,'Oglas neaktivan ili bez sadržaja.');return}
     const outcome=await emitRow({url:job.url,...parsed,phone:publicPhone(doc.html),verified:true},config.facebookPages);stats[outcome]++;await store.finish(job.url,86400000,outcome==='rejected'?'Nije vlasnički oglas u obuhvatu.':'');
    }
   }catch(e){const message=redacted(e.message);errors.push(message);blocked=!!e.blocked;const delay=blocked?6*3600000:Math.min(6*3600000,60000*2**Math.min(Number(job.attempts),8));await store.finish(job.url,delay,message);if(blocked){await store.set('pause:'+s.id,Date.now()+delay);log(s.name+': '+message+' Pauza 6 sati.')}}
  }
  for(const job of await store.due(s.id,'collection',listLimit)){await readJob(job);if(blocked)break}
  if(!blocked)for(const job of await store.due(s.id,'detail',detailLimit)){await readJob(job);if(blocked)break}
  const report={id:randomUUID(),source:s.id,at:new Date().toISOString(),status:errors.length?(stats.pages?'partial':'error'):stats.pages?'ok':'waiting',message:`Zaseban pretraživač: ${stats.pages} otvorenih stranica, ${stats.details} detalja, ${stats.links} linkova; vlasničkih ${stats.owner}, za proveru ${stats.review}, odbačeno ${stats.rejected}.`+(errors.length?' '+[...new Set(errors)].slice(0,2).join(' '):'')};
  await store.emit('report:'+report.id,'report',report);log(s.name+': '+report.message);
 }
 await Promise.all(Array.from({length:2},async()=>{while(cursor<ordered.length&&!stopping&&!leaseLost&&used<pageBudget)await processSource(ordered[cursor++])}));
 await store.set('cycle',turn+1);lastCompleted=new Date().toISOString();await store.set('lastCompleted',lastCompleted);await store.set('lastRequest',config.requestedAt||0);await store.set('lastCycle',Date.now());phase='Čeka sledeći prolaz';await store.prune();log('Prolaz završen: '+used+' zahteva. '+JSON.stringify(await store.pending()));
}
let timer;process.on('SIGINT',()=>{stopping=true;log('Zaustavljanje posle tekuće stranice…')});process.on('SIGTERM',()=>{stopping=true});
try{
 const binding=await store.get('appURL');if(binding&&binding!==base.origin)throw Error('Ovaj lokalni red pripada drugoj aplikaciji. Koristite novi folder za drugi projekat.');await store.set('appURL',base.origin);
 let config=await api();reader=await createReader({mode:['http','auto','browser'].includes(process.env.RADAR_READER)?process.env.RADAR_READER:'browser',headless:process.env.RADAR_HEADLESS!=='false',delay:bounded('RADAR_SOURCE_DELAY_MS',4000,2000,60000),facebookPages:config.facebookPages});
 await reader.prepare();
 if(process.argv.includes('--doctor')){log(JSON.stringify({api:true,enabled:config.enabled,sources:config.sources.length,...await reader.doctor()}));}
 else{if(!(await api('claim')).acquired)throw Error('Drugi računar već obavlja pretragu.');timer=setInterval(()=>{void beat()},30000);await beat();
  while(!stopping&&!leaseLost){try{config=await api();if(!config.enabled){phase='Pauziran u aplikaciji';await beat();if(process.argv.includes('--once'))break;await wait(15000);continue}
   // Recreate contexts on Facebook selection changes; never retain navigation permission for old pages.
   const pages=JSON.stringify(config.facebookPages);if(await store.get('pages')!==pages){await reader.close();reader=await createReader({mode:process.env.RADAR_READER||'browser',headless:process.env.RADAR_HEADLESS!=='false',delay:bounded('RADAR_SOURCE_DELAY_MS',4000,2000,60000),facebookPages:config.facebookPages});await store.set('pages',pages)}
   await flush();const due=Date.now()-await store.get('lastCycle',0)>=interval||config.requestedAt>await store.get('lastRequest',0)||process.argv.includes('--once');if(due){lastError='';await cycle(config);for(let i=0;i<10&&(await store.pending()).outbox&&!stopping&&!leaseLost;i++)await flush();await beat()}
  }catch(e){lastError=redacted(e.message);log(lastError);if(e.status===401||e.status===409)leaseLost=true;if(process.argv.includes('--once'))throw e;await wait(15000)}
  if(process.argv.includes('--once'))break;if(!stopping&&!leaseLost)await wait(15000);
  }
  if(leaseLost)throw Error('Veza ili dozvola obrade je istekla. Proverite aplikaciju i ponovo pokrenite pretraživač.');
 }
}catch(e){console.error(redacted(e.message));process.exitCode=1}finally{clearInterval(timer);await reader?.close();store.close();await lock.close();await unlink(lockPath).catch(()=>{})}
