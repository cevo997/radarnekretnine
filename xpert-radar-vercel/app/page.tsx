import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {COOKIE,validSession} from '../lib/session.mjs';
import RadarClient from './RadarClient';
export const dynamic='force-dynamic';
export default async function Page(){if(!validSession((await cookies()).get(COOKIE)?.value))redirect('/login');return <RadarClient/>}
