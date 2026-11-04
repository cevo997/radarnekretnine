import {NextResponse} from 'next/server';
import {COOKIE,sameOrigin} from '../../../../lib/session.mjs';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Nedozvoljen zahtev.'},{status:403});const r=NextResponse.json({ok:true});r.cookies.set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return r}
