import {cronAuthorized} from '../../../lib/session.mjs';
import {scanAll} from '../../../lib/internet';
export const runtime='nodejs';
export const maxDuration=300;
export async function GET(req:Request){if(!cronAuthorized(req))return Response.json({error:'Nedozvoljen pristup.'},{status:401});try{return Response.json(await scanAll(false),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Provera izvora nije završena.'},{status:500})}}
