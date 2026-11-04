import {createHmac,createHash,timingSafeEqual,randomBytes} from 'node:crypto';
export const COOKIE='xpert_session';
export const SESSION_SECONDS=7*86400;
export function authConfigured(env=process.env){return String(env.APP_PASSWORD||'').length>=12&&String(env.SESSION_SECRET||'').length>=32}
function key(env){return env.SESSION_SECRET+createHash('sha256').update(env.APP_PASSWORD||'').digest('hex')}
function mac(value,env){return createHmac('sha256',key(env)).update(value).digest('base64url')}
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export function validCredentials(username,password,env=process.env){if(!authConfigured(env))return false;const hash=s=>createHash('sha256').update(String(s)).digest();return timingSafeEqual(hash(username),hash(env.APP_USERNAME||'xpert'))&&timingSafeEqual(hash(password),hash(env.APP_PASSWORD))}
export function makeSession(env=process.env,now=Date.now()){if(!authConfigured(env))throw Error('Prijava nije podešena.');const body=Buffer.from(JSON.stringify({exp:Math.floor(now/1000)+SESSION_SECONDS,nonce:randomBytes(16).toString('hex')})).toString('base64url');return body+'.'+mac(body,env)}
export function validSession(token,env=process.env,now=Date.now()){try{if(!authConfigured(env)||typeof token!=='string'||token.length>500)return false;const parts=token.split('.');if(parts.length!==2||!equal(mac(parts[0],env),parts[1]))return false;const p=JSON.parse(Buffer.from(parts[0],'base64url').toString());return Number.isInteger(p.exp)&&p.exp>now/1000&&p.exp<=now/1000+SESSION_SECONDS+60}catch{return false}}
export function sessionFromRequest(req){return(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||''}
export function sameOrigin(req){const origin=req.headers.get('origin');if(!origin)return true;try{return new URL(origin).host===(req.headers.get('host')||new URL(req.url).host)}catch{return false}}
export function authorized(req){return validSession(sessionFromRequest(req))}
export function cronAuthorized(req,env=process.env){return !!env.CRON_SECRET&&env.CRON_SECRET.length>=32&&equal(req.headers.get('authorization')||'','Bearer '+env.CRON_SECRET)}
export function guard(req){if(!authConfigured())return Response.json({error:'Prijava nije podešena. Proverite APP_PASSWORD i SESSION_SECRET.'},{status:503});if(!authorized(req))return Response.json({error:'Prijavite se u aplikaciju.'},{status:401});if(!sameOrigin(req))return Response.json({error:'Nedozvoljen izvor zahteva.'},{status:403});return null}
