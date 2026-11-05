import {createClient,type Client,type InValue} from '@libsql/client/web';
let client:Client|undefined;
let ready:Promise<unknown>|undefined;
const schema=[
 'CREATE TABLE IF NOT EXISTS worker_requests(url TEXT PRIMARY KEY,created INTEGER NOT NULL,processed INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS worker_lease(id TEXT PRIMARY KEY,owner TEXT NOT NULL,expires INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS crawl_frontier(url TEXT PRIMARY KEY,source TEXT NOT NULL,payload TEXT NOT NULL,discovered INTEGER NOT NULL,last_attempt INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0)',
 'CREATE INDEX IF NOT EXISTS crawl_frontier_due ON crawl_frontier(next_attempt,source)',
 'CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,payload TEXT NOT NULL,phone TEXT NOT NULL DEFAULT \'\',created TEXT NOT NULL,updated TEXT NOT NULL,canonical_url TEXT)',
 'CREATE UNIQUE INDEX IF NOT EXISTS leads_canonical_url_unique ON leads(canonical_url)',
 'CREATE INDEX IF NOT EXISTS leads_phone ON leads(phone)',
 'CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,source TEXT NOT NULL,at TEXT NOT NULL,status TEXT NOT NULL,message TEXT NOT NULL,added INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS discoveries(id TEXT PRIMARY KEY,url TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS auth_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL)'
];
export function databaseConfigured(){return !!process.env.TURSO_DATABASE_URL}
export async function databaseClient(){
 if(!client){const url=process.env.TURSO_DATABASE_URL;if(!url)throw Error('Baza nije povezana. Dodajte TURSO_DATABASE_URL i TURSO_AUTH_TOKEN u Vercel podešavanja.');if(process.env.VERCEL&&url.startsWith('file:'))throw Error('Na Vercelu koristite udaljenu Turso bazu.');const factory=url.startsWith('file:')?(await import('@libsql/client')).createClient:createClient;client=factory({url,authToken:process.env.TURSO_AUTH_TOKEN})}
 if(!ready)ready=client.batch(schema,'write').catch(e=>{ready=undefined;throw e});await ready;return client
}
class Statement{
 constructor(public sql:string,public args:InValue[]=[]){ }
 bind(...args:any[]){return new Statement(this.sql,args.map(x=>x===undefined?null:x))}
 async all(){const c=await databaseClient();const r=await c.execute({sql:this.sql,args:this.args});return{results:r.rows.map(x=>({...x})),meta:{changes:r.rowsAffected},success:true}}
 async first<T=Record<string,unknown>>(){const r=await this.all();return(r.results[0]||null) as T|null}
 async run(){return this.all()}
}
export function getDB(){return{prepare:(sql:string)=>new Statement(sql)}}
