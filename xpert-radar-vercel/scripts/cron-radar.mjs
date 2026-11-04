const base=process.env.RADAR_URL,secret=process.env.CRON_SECRET;
if(!base||!secret)throw Error('Podesite RADAR_URL i CRON_SECRET u zakazivaču.');
const u=new URL('/api/cron',base);if(u.protocol!=='https:')throw Error('Koristite HTTPS adresu aplikacije.');
const r=await fetch(u,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(290000),redirect:'error'});
if(!r.ok)throw Error('Pretraga nije završena: HTTP '+r.status);console.log(JSON.stringify(await r.json()));
