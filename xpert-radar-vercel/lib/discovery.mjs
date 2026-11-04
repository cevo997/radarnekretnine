import {isListingURL} from './portal-discovery.mjs';
import {publicationTimestamp} from './publication-order.mjs';
import {normalize,inferType,surfaceNumber,allowedScope,clean,sourceDefs} from './rules.mjs';
export const internetSources=[...sourceDefs.map(s=>({id:s.id,name:s.name,domain:s.host.replace(/^www\./,'')})),{id:'facebook',name:'Facebook · Novi Sad',domain:'facebook.com'}];
export function canonicalDiscoveryURL(value){const u=new URL(String(value));if(u.protocol!=='https:'||u.username||u.password)throw Error('Prihvataju se samo HTTPS linkovi.');u.hash='';u.hostname=u.hostname.replace(/^(m|web|www)\./,'www.');const fb=u.hostname==='www.facebook.com';if(fb){const params=new URLSearchParams();for(const key of ['story_fbid','id','fbid'])if(u.searchParams.has(key))params.set(key,u.searchParams.get(key));u.search=params.toString()}else u.search='';u.pathname=u.pathname.replace(/\/$/,'')||'/';return u.href.replace(/\/$/,'')}
export function facebookPage(value){const u=new URL(canonicalDiscoveryURL(value));if(u.hostname!=='www.facebook.com'||!/^\/[A-Za-z0-9._-]+$/.test(u.pathname)||/\/(groups|marketplace|login|profile.php|watch|reel|share|search|pages)$/i.test(u.pathname))throw Error('Unesite početni link javne Facebook stranice, bez grupa, profila i Marketplace-a.');return u.origin+u.pathname}
export function classifyDiscovery(row,facebookPages=[]){
 const url=canonicalDiscoveryURL(row.url);const u=new URL(url);const source=internetSources.find(s=>u.hostname.replace(/^www\./,'')===s.domain);if(!source)throw Error('Rezultat nije sa izabranih portala.');
 const title=clean(row.title).slice(0,250);const content=clean(row.content||row.description).slice(0,18000);const text=normalize(title+' '+content);const path=decodeURIComponent(u.pathname).toLowerCase();
 if(!title)throw Error('Rezultat nema naslov.');
 if(/^(naslov|oglas|nekretnine|prijava|login|error|access denied)$/i.test(title))throw Error('Portal je vratio prazan šablon umesto oglasa.');
 const detail=isListingURL(url);
 if(source.id==='facebook'){
  if(/\/(groups|marketplace|login|profile.php|share|search)(\/|$)/.test(path))throw Error('Facebook grupe, Marketplace i profili nisu u obuhvatu.');
  if(!facebookPages.some(p=>url.startsWith(facebookPage(p)+'/')))throw Error('Objava nije sa izabrane javne Facebook stranice za Novi Sad.');
  if(!/\/(posts|photos|videos)\//.test(path)&&!path.endsWith('/permalink.php'))throw Error('Potreban je link konkretne javne objave.');
  if(/\b(beograd|nis|subotica|zrenjanin|kragujevac|sombor)\b/.test(text))throw Error('Facebook objava pominje drugu lokaciju; nije prihvaćena kao novosadski oglas.');
  if(!/\bnovi sad\b/.test(text))throw Error('Facebook objava ne potvrđuje lokaciju Novi Sad.');
 }else if(!detail)throw Error('Rezultat je pretraga ili zbirna stranica, a ne pojedinačni oglas.');
 if(/\b(?:otkup|kupujem|potrazujem|trazim)\b/.test(normalize(title)))throw Error('Oglas je potražnja ili otkup, a ne ponuda nekretnine.');
 if(/\bistekao\b|oglas (vise )?nije aktivan|nekretnina je prodata|\bprodato\b/.test(text))throw Error('Oglas je istekao ili je označen kao prodat.');
 const agency=/agencijska provizija|agencijski (id|broj|sifra)|reg(?:istar|\.)\s*(?:br|posr)|registar posrednika|nasi agenti|nase agente|agencija za nekretnine|posrednicka (naknada|provizija)|ugovor o posredovanju|agencijske ponude|agencijsku proviziju|registru posrednika|oglas oglasava agencija|oglasivac\s*[:–-]?\s*agencija/.test(text);
 if(agency)throw Error('Prepoznat je agencijski oglas.');
 const dealIn=value=>{const n=normalize(value);const rent=/izdavan|izdaje[m]?|iznajm|\brent\b|zakup/.test(n),sale=/prodaj|\bsale\b/.test(n);return rent&&!sale?'Izdavanje':sale&&!rent?'Prodaja':''};const deal=dealIn(path)||dealIn(title)||dealIn(content);
 const fromPath=inferType(path);const type=fromPath!=='Ostalo'?fromPath:inferType(title);const area=surfaceNumber(content.match(/([\d.,]+)\s*(?:m²|m2|m\^\{?2\}?)\s*Kvadratura/i)?.[1]||(title+' '+content).match(/([\d.,]+)\s*(?:m²|m2|m\^\{?2\}?)/i)?.[1]);const priceText=(title+' '+content).match(/(?:(\d[\d.,]*(?: \d{3})*)\s*(?:€|EUR)(?!\s*\/)|(?:€|EUR)\s*(\d[\d.,]*(?: \d{3})*))/i);const priceValue=priceText?.[1]||priceText?.[2]||'';
 const price=priceValue?Number(priceValue.replace(/[.\s]/g,'').replace(',','.'))||0:0;
 const nearby=(text+' '+normalize(path).replace(/[-+]/g,' ')).match(/\b(petrovaradin|sremska kamenica|veternik|futog|rumenka|bukovac|ledinci|rakovac|beocin|kac|budisava|kisac|cerevic|bocke|stepanovicevo|cenej|kovilj|begec)\b/)?.[1];const location=/\bnovi sad\b/.test(text)||/novi[-+ ]sad/.test(normalize(path))?'Novi Sad':String(row.location||nearby||'');if(!location)throw Error('Oglas ne potvrđuje lokaciju Novi Sad ili okolinu.');
 const ownerLabel=normalize(row.ownerLabel);const marked=['vlasnik','privatno lice'].includes(ownerLabel)||/privatno lice|fizicko lice|oglasivac\s*[:–-]?\s*vlasnik|oglas oglasava vlasnik|postavio vlasnik/.test(text)||source.id==='4zida'&&/kupovina direktno od vlasnika/.test(text)||/^(?:\*\*)?Vlasnik(?:\*\*)?\s*$/im.test(String(row.content||''));
 const phone=String(row.phone||'').replace(/[^+\d ()/-]/g,'').slice(0,35);
 if(deal==='Izdavanje'&&((area>0&&area<150)||!['Poslovni prostor','Hala','Magacin','Ostalo'].includes(type)))throw Error('Izdavanje je izvan dogovorenog obuhvata.');
 if(location&&deal&&type!=='Ostalo'&&!allowedScope({location,deal,type,area})&&!(deal==='Izdavanje'&&!area))throw Error('Oglas je van dogovorenog obuhvata.');
 const investor=/\binvestitor\b|kompanija|stanove razlicitih struktura/.test(text);
 const sourceDate=String(content.match(/(?:objavljen[oa]?|a[zž]uriran[oa]?|obnovljen[oa]?|datum objave|datum a[zž]uriranja)\s*[:*]*\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i)?.[1]||row.published||'');const publishedAt=publicationTimestamp(sourceDate);const oldListing=Number.isFinite(publishedAt)&&Date.now()-publishedAt>45*86400000;
 const ready=source.id!=='facebook'&&!investor&&!oldListing&&marked&&!!deal&&!!location&&type!=='Ostalo'&&(deal==='Prodaja'||area>=150)&&allowedScope({location,deal,type,area});
 return{url,source:source.id,title,description:content,content,deal,type,area,price,location,owner:ready?'Označen vlasnik':'Za proveru',ownerName:String(row.ownerName||'').slice(0,100),phone,published:sourceDate.slice(0,80),foundBy:row.cardVerified?'Javna lista portala':'Internet pretraga',evidence:oldListing?'Izvor navodi datum stariji od 45 dana; proveriti aktuelnost i oglašivača.':row.cardVerified?'Javna kartica pojedinačnog oglasa: portal označava vlasnika. Vlasništvo nije nezavisno potvrđeno.':source.id==='facebook'?'Javna objava sa izabrane stranice za Novi Sad. Autor i vlasništvo zahtevaju proveru.':marked?'U indeksiranom sadržaju označen privatni oglašivač. Aktuelnost proveriti na izvornom oglasu.':'Rezultat internet pretrage; vlasnik i podaci još nisu potvrđeni.',ready};
}
export function makeQueries(pages=[]){const property='(stan OR kuća OR plac OR njiva OR garaža OR šupa OR hala OR magacin OR lokal)';return [
 {id:'4zida',query:'site:4zida.rs "Novi Sad" "Kupovina direktno od vlasnika" prodaja '+property,domains:['4zida.rs']},
 {id:'nekretnine',query:'site:nekretnine.rs/oglasi/ "Novi Sad" "Privatno lice" prodaja',domains:['nekretnine.rs']},
 {id:'halo',query:'site:halooglasi.com/nekretnine/prodaja- "Novi Sad" "Vlasnik" prodaja',domains:['halooglasi.com']},
 {id:'nadjidom',query:'site:nadjidom.com/sr/details/ "Novi Sad" "vlasnik" prodaja',domains:['nadjidom.com']},
 {id:'commercial',query:'"Novi Sad" (izdavanje OR zakup) (hala OR magacin OR "poslovni prostor") (vlasnik OR "privatno lice")',domains:['4zida.rs','nekretnine.rs','halooglasi.com','nadjidom.com','oglasi.rs']},
 ...pages.slice(0,5).map((p,i)=>({id:'facebook-'+i,query:'site:'+new URL(facebookPage(p)).host.replace('www.','')+new URL(p).pathname+' "Novi Sad" (prodajem OR prodaja OR hala OR magacin) -inurl:groups -inurl:marketplace',domains:['facebook.com']}))]}
