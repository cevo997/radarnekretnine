import {randomBytes} from 'node:crypto';
console.log('SESSION_SECRET='+randomBytes(32).toString('hex'));
console.log('CRON_SECRET='+randomBytes(32).toString('hex'));
console.log('APP_PASSWORD='+randomBytes(18).toString('base64url'));
