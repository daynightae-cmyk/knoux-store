import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { startOwnedServer,stopOwnedServer } from '../scripts/css-integrity.mjs';
const index=process.argv.indexOf('--env-source');
if(index<0 || !process.argv[index+1])throw new Error('Provide the existing owner-controlled env source path; no credentials belong in this repository.');
const values=parseEnv(readFileSync(process.argv[index+1],'utf8'));
// Read existing Gemini configuration in memory; never export files or log values.
for(const key of ['GEMINI_API_KEY','GOOGLE_GENERATIVE_AI_API_KEY','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])if(values[key])process.env[key]=values[key];
process.env.KNOUX_COMPANION_ENABLED='true';
process.env.KNOUX_COMPANION_LOCAL_PREVIEW='true';
process.env.KNOUX_COMPANION_SESSION_SECRET=randomBytes(32).toString('base64url');
const port=Number(process.env.KNOUX_COMPANION_PORT??4554);
process.env.KNOUX_COMPANION_ORIGIN=`http://127.0.0.1:${port}`;
const server=await startOwnedServer(process.cwd(),port);
server.child.stdout.on('data',chunk=>{for(const line of String(chunk).split('\n'))if(line.startsWith('[companion]'))console.log(line);});
console.log(`Companion local preview: ${server.base}/products; credentials stay in server memory; public cloud activation is disabled.`);
await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
await stopOwnedServer(server.child);
