import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('.',import.meta.url));
const rl=createInterface({input:stdin,output:stdout});
try{
 try{await access(dir+'.env');if((await rl.question('Podešavanja postoje. Zameniti ih? (da/ne): ')).trim().toLowerCase()!=='da')process.exit(0)}catch{}
 const u=new URL((await rl.question('Vercel adresa aplikacije: ')).trim());if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Unesite javnu HTTPS adresu aplikacije.');
 const token=(await rl.question('Ključ iz Podešavanja → Pretraga bez Tavily-ja: ')).trim();if(!/^[\w-]{43}$/.test(token))throw Error('Neispravan ključ.');
 await writeFile(dir+'.env',`RADAR_URL=${u.origin}\nRADAR_WORKER_TOKEN=${token}\nRADAR_READER=browser\nRADAR_HEADLESS=true\nRADAR_INTERVAL_SECONDS=300\nRADAR_SOURCE_DELAY_MS=4000\nRADAR_MAX_PAGES_PER_CYCLE=80\nRADAR_DETAILS_PER_SOURCE=8\nRADAR_COLLECTIONS_PER_SOURCE=2\n`,{mode:0o600});
 console.log('Sačuvano. Pokrenite npm start. Ne delite .env datoteku.');
}finally{rl.close()}
