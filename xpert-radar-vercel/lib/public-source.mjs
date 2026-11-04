// Additional public sources are discovered by the search provider, never fetched
// directly by our server. Existing portal parsers retain their stricter rules.
export function publicDomain(value){
 try{const u=new URL(value),h=u.hostname.replace(/^www\./,'').toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||h.length>60||!h.includes('.')||!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h)||/\.(local|internal|localhost|test|invalid|example)$/.test(h))return '';
  if(/(^|\.)(facebook\.com|instagram\.com|youtube\.com|tiktok\.com|linkedin\.com|google\.com|bing\.com|example\.com|example\.org|example\.net)$/.test(h))return '';
  return h;
 }catch{return ''}
}
export function genericListingURL(value){
 if(!publicDomain(value))return false;
 const u=new URL(value),p=decodeURIComponent(u.pathname).toLowerCase();
 if(/\/(blog|vesti|news|search|pretraga|kategorija|category|tag|login|kontakt|contact|agents?|agencije)(\/|$)/.test(p)||/\.(pdf|jpg|png|webp|zip)$/.test(p))return false;
 const parts=p.split('/').filter(Boolean),last=parts.at(-1)||'';
 return parts.length>=2&&parts.some(part=>/\d{4,}|[a-f\d]{16,}/.test(part))||last.length>=25&&/(prodaj|izdav|oglas|nekretnin)/.test(p)&&/(stan|kuc|plac|njiv|garaz|hal[ae]|magacin|lokal|poslov|vikend|sup[ae])/.test(p);
}
export function extraQueries(turn=0){
 const locations=['Novi Sad','Veternik Futog Rumenka','Petrovaradin Sremska Kamenica Bukovac','Kać Kisač Čenej Ledinci Rakovac'];
 const location=locations[((turn%locations.length)+locations.length)%locations.length];
 const owner='(vlasnik OR "privatno lice" OR "fizičko lice")';
 return [
  {id:'internet-sve-prodaja',query:'"Novi Sad" prodaja (stan OR kuća OR plac OR njiva OR garaža OR šupa OR vikendica) '+owner,domains:[],openWeb:true,timeRange:'month'},
  {id:'internet-okolina',query:location+' prodaja nekretnine '+owner,domains:[],openWeb:true,timeRange:'month'},
  {id:'internet-poslovno',query:'"Novi Sad" (izdavanje OR zakup) (hala OR magacin OR "poslovni prostor") '+owner,domains:[],openWeb:true,timeRange:'month'},
  {id:'internet-dodatni-portali',query:location+' prodaja nekretnine '+owner+' -site:4zida.rs -site:nekretnine.rs -site:halooglasi.com -site:nadjidom.com -site:oglasi.rs -site:facebook.com',domains:[],openWeb:true}
 ];
}
export function selectSearchQueries(queries,selected){return queries.map(q=>q.openWeb?q:{...q,domains:q.domains.filter(d=>d==='facebook.com'||selected.has(d))}).filter(q=>q.openWeb||q.domains.length)}
