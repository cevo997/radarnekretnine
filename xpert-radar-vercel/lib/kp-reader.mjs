import {clean,normalize,inferType,surfaceNumber} from './rules.mjs';

export function sourceDay(label,now=Date.now()){
 const text=normalize(label);let days;
 if(/\bdanas\b/.test(text))days=0;else if(/\bjuce\b/.test(text))days=1;
 else{const m=text.match(/\bpre\s+(\d+)\s+(?:dan|dana)\b/);if(m)days=Number(m[1]);}
 if(days===undefined||days>365)return '';
 const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Belgrade'}).formatToParts(now);
 const get=type=>Number(parts.find(p=>p.type===type)?.value);
 return new Date(Date.UTC(get('year'),get('month')-1,get('day')-days)).toISOString().slice(0,10);
}
const detail=p=>/^\/nekretnine-(prodaja|izdavanje)\/.+\/oglas\/\d+\/?$/.test(p);
export function kpCollection(raw,base,now=Date.now()){
 const u=new URL(base);if(u.hostname.replace(/^www\./,'')!=='kupujemprodajem.com'||u.searchParams.get('realEstateAdvertiserType')!=='179')return [];
 const text=String(raw||'').slice(0,600000).replace(/!\[[^\]]*\]\([^)]*\)/g,'');
 if(!/^#\s+[^\n]*\bod vlasnika\b/im.test(text))return [];
 const groups=[];
 for(const m of text.matchAll(/\[[^\]]*\]\((https:\/\/www\.kupujemprodajem\.com\/[^\s)]+)\)/g)){
  const link=new URL(m[1]);if(!detail(link.pathname))continue;
  const url=link.origin+link.pathname.replace(/\/$/,'');
  if(groups.at(-1)?.url===url)continue;
  groups.push({url,start:m.index});
 }
 const rows=[];
 for(let i=0;i<groups.length;i++){
  const g=groups[i];let body=text.slice(g.start,groups[i+1]?.start||text.length);
  body=body.split(/\n(?:### Korisno|Idi na|\[Sledeća\])/)[0].replace(/\[[^\]]*\]\([^)]*\)/g,'');
  if(!/^\s*Vlasnik\s*$/im.test(body)||/^\s*(?:Agencija|Investitor)\s*$/im.test(body))continue;
  const lines=body.split('\n').map(clean).filter(Boolean);
  const price=lines.findIndex(x=>/^\d[\d.,\s]*\s*€/.test(x));if(price<0)continue;
  const location=lines[price+1]||'';const area=lines[price+2]||'';
  const surface=area.match(/([\d.,]+)\s*(m²|m2|ha|ar|a)\b/i)||area.match(/([\d.,]+)\s*(m²|m2)/i);if(!surface)continue;
  const squareMetres=surfaceNumber(surface[1])*(surface[2].toLowerCase()==='ha'?10000:['a','ar'].includes(surface[2].toLowerCase())?100:1);
  const relative=lines.slice(price+3).find(x=>/\bdanas\b|\bjuče\b|\bpre \d+ dana?\b/i.test(x))||'';
  const published=sourceDay(relative,now);const deal=g.url.includes('/nekretnine-prodaja/')?'prodaja':'izdavanje';
  const type=inferType(new URL(g.url).pathname);
  rows.push({url:g.url,title:`${type} · ${deal} · ${location}`,content:clean(`${lines[price]} ${location} ${squareMetres} m². Oglašivač: Vlasnik. Portal navodi: ${relative}`),ownerLabel:'Vlasnik',published,cardVerified:true,dateEvidence:relative});
 }
 return [...new Map(rows.map(x=>[x.url,x])).values()];
}

export function kpPages(raw,base,rotation=0){
 const u=new URL(base);if(u.hostname.replace(/^www\./,'')!=='kupujemprodajem.com'||u.searchParams.get('realEstateAdvertiserType')!=='179')return [];
 const pages=[];
 for(const m of String(raw).matchAll(/\[\s*(?:\d+|Sledeća)\s*\]\(([^\s)]+)\)/g)){
  try{const link=new URL(m[1],base);const page=Number(link.searchParams.get('page'));
   if(link.origin!==u.origin||link.pathname!==u.pathname||!Number.isInteger(page)||page<2||page>40)continue;
   const next=new URL(u);next.searchParams.set('page',String(page));pages.push(next.href);
  }catch{}
 }
 const all=[...new Set(pages)];if(!all.length)return [];
 const offset=((rotation%all.length)+all.length)%all.length;
 return [all[offset],all[(offset+1)%all.length]].filter((x,i,a)=>a.indexOf(x)===i);
}
