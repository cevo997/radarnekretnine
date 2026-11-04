// Only reviewed classifieds portals belong here. A matching word in an agency
// or news article never grants that site's domain access to listing ingestion.
export const additionalPortals=[
 {domain:'kupujemprodajem.com',name:'KupujemProdajem'},
 {domain:'mojtrg.rs',name:'Mojtrg'},
 {domain:'imovina.net',name:'Imovina.net'},
 {domain:'sasomange.rs',name:'Sasomange'}
];
export function publicDomain(value){
 try{const u=new URL(value),h=u.hostname.replace(/^www\./,'').toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port)return '';
  return additionalPortals.some(s=>s.domain===h)?h:'';
 }catch{return ''}
}
export function genericListingURL(value){
 const domain=publicDomain(value);if(!domain)return false;
 const p=decodeURIComponent(new URL(value).pathname).toLowerCase();
 switch(domain){
  case 'kupujemprodajem.com':return /^\/nekretnine-(?:prodaja|izdavanje)\/.+\/oglas\/\d+\/?$/.test(p);
  case 'mojtrg.rs':return /^\/oglas\/[^/]+\/\d+\/?$/.test(p);
  case 'sasomange.rs':return /^\/p\/\d{5,}\/[^/]+\/?$/.test(p)||/^\/nekretnine\/[^?#]*\d{5,}[^/]*\/?$/.test(p);
  case 'imovina.net':return /^\/nekretnin[ae]\/[^?#]*\/(?:[a-z-]*\d{4,}[a-z\d-]*)(?:\.html)?\/?$/.test(p)&&!/^\/nekretnine\/.*\/l\d/i.test(p);
  default:return false;
 }
}
export function extraQueries(turn=0){
 const nearby=['Veternik','Futog','Petrovaradin','Sremska Kamenica','Rumenka','Bukovac','Kać','Ledinci','Rakovac'];
 const location=nearby[((turn%nearby.length)+nearby.length)%nearby.length];
 const queries=additionalPortals.flatMap(s=>[
  {id:s.domain,query:`site:${s.domain} "Novi Sad" prodaja nekretnine vlasnik privatno lice`,domains:[s.domain],targeted:true},
  {id:s.domain,query:`site:${s.domain} "Novi Sad" izdavanje hala magacin poslovni prostor vlasnik`,domains:[s.domain],targeted:true}
 ]);
 const portal=additionalPortals[((turn%additionalPortals.length)+additionalPortals.length)%additionalPortals.length];
 queries.push({id:portal.domain,query:`site:${portal.domain} "${location}" prodaja vlasnik nekretnine`,domains:[portal.domain],targeted:true});
 return queries;
}
export function selectSearchQueries(queries,selected){return queries.map(q=>q.targeted?q:{...q,domains:q.domains.filter(d=>d==='facebook.com'||selected.has(d))}).filter(q=>q.domains.length)}
export const extraCollectionSeeds=[
 {id:'kupujemprodajem.com',url:'https://www.kupujemprodajem.com/nekretnine-prodaja/stanovi/pretraga?categoryId=2821&groupId=2822&realEstateAdvertiserType=179&realEstateLocation=4605&so=1'},
 {id:'mojtrg.rs',url:'https://www.mojtrg.rs/oglasi/nekretnine/stanovi-apartmani/novi-sad/q-prodaja-stana?Private=True'},
 {id:'imovina.net',url:'https://imovina.net/nekretnine/novi-sad/stanovi/prodaja/1/l25-t39-c1-p1.html'}
];
export function portalRun(source){return ['internet','commercial-web','4zida','nekretnine','halo','oglasi','nadjidom','facebook',...additionalPortals.map(s=>s.domain)].some(id=>source===id||source===id+'-web')}
