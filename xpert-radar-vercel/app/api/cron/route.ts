import {cronAuthorized} from '../../../lib/session.mjs';
import {getDB} from '../../../lib/database';
import {scanAll} from '../../../lib/internet';
export const runtime='nodejs';
export const maxDuration=300;
export async function GET(req:Request){if(!cronAuthorized(req))return Response.json({error:'Nedozvoljen pristup.'},{status:401});try{const result=await scanAll(false);const now=new Date().toISOString();await getDB().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('cron_heartbeat',JSON.stringify({lastRun:now,note:'Poslednje izvršavanje serverskog rasporeda.'})).run();return Response.json(result,{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Provera izvora nije završena.'},{status:500})}}
