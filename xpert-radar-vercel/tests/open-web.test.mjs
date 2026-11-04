import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyDiscovery,makeQueries} from '../lib/discovery.mjs';
import {discoverPortalListings,isListingURL,listingSource} from '../lib/portal-discovery.mjs';
import {publicDomain,selectSearchQueries} from '../lib/public-source.mjs';
const row={url:'https://www.kupujemprodajem.com/nekretnine-prodaja/stanovi/stan-prodaja-novi-sad-56m2/oglas/123456',title:'Stan na prodaju Novi Sad, 56 m², 168.000 €',content:'Oglašivač: Privatno lice. Stan 56 m², cena 168.000 €. Novi Sad, Telep.',verified:true};
test('Dodatni portal prihvata samo otvoren pojedinačni oglas označen kao privatni',()=>{
 assert(isListingURL(row.url));assert.equal(listingSource(row.url),'kupujemprodajem.com');assert(classifyDiscovery(row).ready);
 assert.throws(()=>classifyDiscovery({...row,verified:false}),/otvoren/);
 assert.throws(()=>classifyDiscovery({...row,content:'Prodaje se stan u Novom Sadu, 56 m², 168.000 €.'}),/oglašivača/);
 assert.throws(()=>classifyDiscovery({...row,content:row.content+' Agencijska provizija 2%.'}),/agencijski/);
 assert.throws(()=>classifyDiscovery({...row,url:'https://www.kupujemprodajem.com/nekretnine-prodaja/stanovi/pretraga?categoryId=2821'}),/zbirna/);
});
test('Dodatni izvori zadržavaju dogovoreni obuhvat i pravilo 150 m²',()=>{
 assert.throws(()=>classifyDiscovery({...row,title:'Stan izdavanje Novi Sad 200 m²'}),/obuhvata/);
 assert.throws(()=>classifyDiscovery({...row,title:'Hala izdavanje Novi Sad 149 m²'}),/obuhvata/);
 assert(classifyDiscovery({...row,title:'Hala izdavanje Novi Sad 150 m²'}).ready);
 assert.throws(()=>classifyDiscovery({...row,title:'Stan prodaja Beograd 56 m²',content:'Oglašivač: Privatno lice. Beograd 56 m²',url:'https://www.kupujemprodajem.com/nekretnine-prodaja/stanovi/beograd/oglas/123456'}),/lokaciju/);
});
test('Dodatni oglasnici imaju ciljane upite, bez neograničene internet pretrage',()=>{
 const qs=selectSearchQueries(makeQueries([],1),new Set());assert.equal(qs.length,9);assert(qs.every(q=>q.targeted&&q.domains.length===1&&!q.openWeb));
 assert.notEqual(makeQueries([],0).at(-1).query,makeQueries([],1).at(-1).query);
});
test('Privatni hostovi, društvene mreže, kredencijali i kategorije nisu dodatni portali',()=>{
 for(const url of ['https://127.0.0.1/oglas/123456','https://localhost/oglas/123456','https://foo.local/oglas/123456','https://facebook.com/oglas/123456','https://a:secret@portal.rs/oglas/123456','https://foo.rs:8443/oglas/123456'])assert.equal(publicDomain(url),'');
 assert(!isListingURL('https://noviportal.rs/blog/123456'));
});
test('Ciljana pretraga otvara dozvoljeni oglasnik, proverava detalj i poštuje isključene portale',async()=>{
 const bodies=[];const disabled='https://www.nekretnine.rs/oglasi/123456';
 const fetcher=async(url,options)=>{const body=JSON.parse(options.body);bodies.push(body);return {ok:true,json:async()=>url.endsWith('/search')?{results:[{...row,verified:false},{...row,url:disabled}]}:{results:body.urls.map(url=>({url,raw_content:'# '+row.title+'\n'+row.content}))}}};
 const out=await discoverPortalListings({queries:[{id:'kupujemprodajem.com',query:'prodaja Novi Sad vlasnik',targeted:true,domains:['kupujemprodajem.com']}],seeds:[],key:'mock',fetcher,acceptURL:url=>url!==disabled});
 assert.deepEqual(bodies[0].include_domains,['kupujemprodajem.com']);assert.equal(out.rows.length,1);assert(out.rows[0].verified);assert(classifyDiscovery(out.rows[0]).ready);assert.equal(out.stats[0].source,'kupujemprodajem.com');assert(!bodies.some(b=>b.urls?.includes(disabled)));
});

test('Vesti, advokati, agencije i nepoznati domeni se odbacuju i izvan upita',async()=>{
 const junk=['https://www.euronews.rs/biznis/nekretnine/123456/prodaja-stana','https://www.021.rs/novi-sad/123456/stan','https://advokatbabicnovisad.rs/oglas/123456','https://house-nekretnine.com/prodaja/stan-novi-sad/123456','https://kupujemprodajem.com.evil.rs/oglas/123456','https://blog.kupujemprodajem.com/nekretnine-prodaja/stan/oglas/123456'];
 for(const url of junk){assert.equal(publicDomain(url),'');assert.equal(listingSource(url),'');assert(!isListingURL(url));assert.throws(()=>classifyDiscovery({...row,url}));}
 const calls=[];const fetcher=async(url,options)=>{const b=JSON.parse(options.body);calls.push(b);assert(url.endsWith('/search'));return{ok:true,json:async()=>({results:junk.map(url=>({...row,url}))})}};
 const out=await discoverPortalListings({queries:[{id:'kupujemprodajem.com',query:'test',domains:['kupujemprodajem.com']}],seeds:[],key:'mock',fetcher});
 assert.equal(out.rows.length,0);assert.equal(calls.length,1);assert.deepEqual(out.stats.map(x=>x.source),['kupujemprodajem.com']);assert.equal(out.stats[0].searchResults,0);
});
test('Stvarni format KP detalja sa naslovom lokacije i oznakom Direktno od vlasnika prolazi',()=>{
 const x=classifyDiscovery({url:'https://www.kupujemprodajem.com/nekretnine-prodaja/stanovi/novi-sad/oglas/157185114',title:'Novi Sad',content:'70.500 € Direktno od vlasnika. Garsonjera Miše Dimitrijevića 23m2. Stan oglašava vlasnik, uknjižen 1/1. Grbavica, Novi Sad.',verified:true});
 assert(x.ready);assert.equal(x.type,'Stan');assert.equal(x.deal,'Prodaja');assert.equal(x.price,70500);assert.equal(x.area,23);
});
test('Podržani oglasnici razlikuju pojedinačne oglase, liste i članke',()=>{
 assert(isListingURL('https://www.mojtrg.rs/oglas/uknjizen-dvosoban-stan-na-novom-naselju/1449173'));
 assert(isListingURL('https://imovina.net/nekretnina/prodaja/dvoiposoban-stan_novi-sad_rotkvarija/1364360/'));
 assert(!isListingURL('https://imovina.net/nekretnine/novi-sad/stanovi/prodaja/1/l25-t39-c1-p1.html'));
 assert(!isListingURL('https://www.mojtrg.rs/oglasi/nekretnine/stanovi-apartmani/novi-sad/q-prodaja-stana?Private=True'));
});
