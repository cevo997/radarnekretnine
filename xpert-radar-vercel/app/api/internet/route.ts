import {guard} from '../../../lib/session.mjs';
export const runtime='nodejs';
export const maxDuration=300;
import {internetState,configureInternet,runInternetSearch,ingestDiscoveries,promoteDiscovery,ignoreDiscovery,inspectPublicSource} from '../../../lib/internet';
export const dynamic='force-dynamic';
export async function GET(req:Request){const denied=guard(req);if(denied)return denied;try{return Response.json(await internetState(),{headers:{'Cache-Control':'no-store'}})}catch(e:any){return Response.json({error:e.message},{status:500})}}
export async function POST(req:Request){const denied=guard(req);if(denied)return denied;try{const body:any=await req.json();if(JSON.stringify(body).length>1000000)throw Error('Prevelik zahtev.');let result;switch(body.action){case'diagnose':result=await inspectPublicSource(String(body.source));break;case'configure':result=await configureInternet(body);break;case'search':result=await runInternetSearch(true);break;case'ingest':result=await ingestDiscoveries(body.results);break;case'promote':result=await promoteDiscovery(body.id,body.lead);break;case'ignore':result=await ignoreDiscovery(body.id);break;default:throw Error('Nepoznata operacija.')}return Response.json(result,{headers:{'Cache-Control':'no-store'}})}catch(e:any){return Response.json({error:e.message},{status:400})}}
