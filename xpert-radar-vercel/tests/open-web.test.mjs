import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyDiscovery,makeQueries} from '../lib/discovery.mjs';
import {discoverPortalListings,isListingURL,listingSource} from '../lib/portal-discovery.mjs';
import {publicDomain,selectSearchQueries} from '../lib/public-source.mjs';
const row={url:'https://noviportal.rs/oglas/123456/stan-prodaja-novi-sad-56m2',title:'Stan na prodaju Novi Sad, 56 m², 168.000 €',content:'Oglašivač: Privatno lice. Stan 56 m², cena 168.000 €. Novi Sad, Telep.',verified:true};
test('Dodatni portal prihvata samo otvoren pojedinačni oglas označen kao privatni',()=>{
 assert(isListingURL(row.url));assert.equal(listingSource(row.url),'noviportal.rs');assert(classifyDiscovery(row).ready);
 assert.throws(()=>classifyDiscovery({...row,verified:false}),/otvoren/);
 assert.throws(()=>classifyDiscovery({...row,content:'Prodaje se stan u Novom Sadu, 56 m², 168.000 €.'}),/oglašivača/);
 assert.throws(()=>classifyDiscovery({...row,content:row.content+' Agencijska provizija 2%.'}),/agencijski/);
 assert.throws(()=>classifyDiscovery({...row,url:'https://noviportal.rs/pretraga/prodaja-stan-novi-sad-123456'}),/zbirna/);
});
test('Dodatni izvori zadržavaju dogovoreni obuhvat i pravilo 150 m²',()=>{
 assert.throws(()=>classifyDiscovery({...row,title:'Stan izdavanje Novi Sad 200 m²'}),/obuhvata/);
 assert.throws(()=>classifyDiscovery({...row,title:'Hala izdavanje Novi Sad 149 m²'}),/obuhvata/);
 assert(classifyDiscovery({...row,title:'Hala izdavanje Novi Sad 150 m²'}).ready);
 assert.throws(()=>classifyDiscovery({...row,title:'Stan prodaja Beograd 56 m²',content:'Oglašivač: Privatno lice. Beograd 56 m²',url:'https://noviportal.rs/oglas/123456/beograd-stan-prodaja'}),/lokaciju/);
});
test('Otvoreni upiti ostaju bez liste domena i kada su poznati portali isključeni',()=>{
 const qs=selectSearchQueries(makeQueries([],1),new Set());assert.equal(qs.length,4);assert(qs.every(q=>q.openWeb));
 assert.notEqual(makeQueries([],0).find(q=>q.id==='internet-okolina').query,makeQueries([],1).find(q=>q.id==='internet-okolina').query);
});
test('Privatni hostovi, društvene mreže, kredencijali i kategorije nisu dodatni portali',()=>{
 for(const url of ['https://127.0.0.1/oglas/123456','https://localhost/oglas/123456','https://foo.local/oglas/123456','https://facebook.com/oglas/123456','https://a:secret@portal.rs/oglas/123456','https://foo.rs:8443/oglas/123456'])assert.equal(publicDomain(url),'');
 assert(!isListingURL('https://noviportal.rs/blog/123456'));
});
test('Otvorena pretraga zaista izvlači novi domen, proverava detalj i poštuje isključene portale',async()=>{
 const bodies=[];const disabled='https://www.nekretnine.rs/oglasi/123456';
 const fetcher=async(url,options)=>{const body=JSON.parse(options.body);bodies.push(body);return {ok:true,json:async()=>url.endsWith('/search')?{results:[{...row,verified:false},{...row,url:disabled}]}:{results:body.urls.map(url=>({url,raw_content:'# '+row.title+'\n'+row.content}))}}};
 const out=await discoverPortalListings({queries:[{id:'sve',query:'prodaja Novi Sad vlasnik',openWeb:true,domains:[]}],seeds:[],key:'mock',fetcher,acceptURL:url=>url!==disabled});
 assert(!('include_domains' in bodies[0]));assert.equal(out.rows.length,1);assert(out.rows[0].verified);assert(classifyDiscovery(out.rows[0]).ready);assert.equal(out.stats[0].source,'noviportal.rs');assert(!bodies.some(b=>b.urls?.includes(disabled)));
});
