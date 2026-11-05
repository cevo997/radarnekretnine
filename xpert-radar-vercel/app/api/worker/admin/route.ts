import {guard} from '../../../../lib/session.mjs';
import {configureWorker,workerStatus} from '../../../../lib/worker';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:Request){const denied=guard(req);if(denied)return denied;return Response.json(await workerStatus(),{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:Request){const denied=guard(req);if(denied)return denied;try{const body=await req.json();return Response.json(await configureWorker(String(body.action)),{headers:{'Cache-Control':'no-store'}})}catch(e:any){return Response.json({error:e.message},{status:400})}}
