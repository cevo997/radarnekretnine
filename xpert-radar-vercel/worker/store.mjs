import {createClient} from '@libsql/client';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function openStore(dir){await mkdir(dir,{recursive:true});const db=createClient({url:'file:'+resolve(dir,'radar.db')});await db.batch([
 'CREATE TABLE IF NOT EXISTS jobs(url TEXT PRIMARY KEY,source TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,due INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT \'\',priority INTEGER NOT NULL DEFAULT 0)',
 'CREATE INDEX IF NOT EXISTS jobs_due ON jobs(source,kind,due,priority)',
 'CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL,created INTEGER NOT NULL,next_attempt INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS rejections(id TEXT PRIMARY KEY,payload TEXT NOT NULL,reason TEXT NOT NULL,at INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)'
 ],'write');return{
 db,
 async get(key,fallback=null){const r=await db.execute({sql:'SELECT value FROM meta WHERE key=?',args:[key]});return r.rows[0]?JSON.parse(r.rows[0].value):fallback},
 async set(key,value){await db.execute({sql:'INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',args:[key,JSON.stringify(value)]})},
 async enqueue(url,source,kind,payload={},due=Date.now(),priority=0){const count=await db.execute('SELECT count(*) AS n FROM jobs');if(Number(count.rows[0].n)>=20000)return false;await db.execute({sql:'INSERT INTO jobs(url,source,kind,payload,due,priority) VALUES(?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET payload=excluded.payload,priority=MAX(jobs.priority,excluded.priority)',args:[url,source,kind,JSON.stringify(payload),due,priority]});return true},
 async due(source,kind,limit){const r=await db.execute({sql:'SELECT * FROM jobs WHERE source=? AND kind=? AND due<=? ORDER BY priority DESC,attempts ASC,due ASC LIMIT ?',args:[source,kind,Date.now(),limit]});return r.rows.map(x=>({...x,payload:JSON.parse(x.payload)}))},
 async finish(url,delay,error=''){await db.execute({sql:'UPDATE jobs SET due=?,attempts=attempts+1,last_error=?,priority=0 WHERE url=?',args:[Date.now()+delay,String(error).slice(0,500),url]})},
 async emit(id,kind,payload){await db.execute({sql:'INSERT INTO outbox(id,kind,payload,created) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',args:[id,kind,JSON.stringify(payload),Date.now()]})},
 async pending(){const a=await db.execute('SELECT count(*) AS n FROM jobs WHERE due<='+Date.now());const b=await db.execute('SELECT count(*) AS n FROM outbox');return{pending:Number(a.rows[0].n),outbox:Number(b.rows[0].n)}},
 async prune(){await db.execute({sql:'DELETE FROM jobs WHERE kind=? AND due<? AND attempts>10 AND last_error<>?',args:['detail',Date.now()-30*86400000,'']})},
 close(){db.close()}
}}
