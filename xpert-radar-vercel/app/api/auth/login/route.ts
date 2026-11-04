import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {getDB} from '../../../../lib/database';
import {authConfigured,validCredentials,makeSession,sameOrigin,COOKIE,SESSION_SECONDS} from '../../../../lib/session.mjs';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Nedozvoljen zahtev.'},{status:403});
 if(!authConfigured())return NextResponse.json({error:'Administrator treba da postavi APP_PASSWORD (najmanje 12 znakova) i SESSION_SECRET (najmanje 32 znaka) u Vercel podešavanjima, pa ponovi Deploy.'},{status:503});
 try{const raw=await req.text();if(raw.length>2000)return NextResponse.json({error:'Prevelik zahtev.'},{status:413});const body=JSON.parse(raw);const now=Date.now(),ip=createHash('sha256').update((req.headers.get('x-forwarded-for')||'unknown').split(',')[0]).digest('hex');
 const attempts=await getDB().prepare('INSERT INTO auth_attempts(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END RETURNING count').bind(ip,now+600000,now,now).first<{count:number}>();
 if(Number(attempts?.count)>10)return NextResponse.json({error:'Previše pokušaja prijave. Pokušajte ponovo za 10 minuta.'},{status:429});
 if(!validCredentials(body.username,body.password))return NextResponse.json({error:'Pogrešno korisničko ime ili lozinka.'},{status:401});
 await getDB().prepare('DELETE FROM auth_attempts WHERE key=?').bind(ip).run();const res=NextResponse.json({ok:true});res.cookies.set(COOKIE,makeSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:SESSION_SECONDS});res.headers.set('Cache-Control','no-store');return res
 }catch(e:any){return NextResponse.json({error:e.message||'Prijava trenutno nije dostupna.'},{status:503})}
}
