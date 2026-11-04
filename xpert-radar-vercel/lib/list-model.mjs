import {byPublicationDesc} from './publication-order.mjs';
export const closedStatuses=['Arhivirano','Nije vlasnik','Ne želi saradnju'];
export function unifiedListings(leads=[],discoveries=[]){const urls=new Set();for(const x of leads)for(const u of x.urls||[x.url])if(u)urls.add(u.replace(/\/$/,''));const pending=discoveries.filter(x=>x.state!=='Ignorisano'&&!urls.has(String(x.url||'').replace(/\/$/,''))).map(x=>({...x,candidate:true,status:'Za proveru',owner:'Za proveru',notes:'',agent:'',description:x.content||x.description||''}));return [...leads.map(x=>({...x,candidate:false})),...pending].sort(byPublicationDesc)}
export function mayCall(x){return !x.candidate&&x.owner!=='Za proveru'&&!closedStatuses.includes(x.status)}
