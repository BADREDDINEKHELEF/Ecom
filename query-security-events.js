const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
  console.warn('Could not set DNS servers:', e.message);
}

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Querying public.security_events for new failures...');
  try {
    const { data: events, error } = await supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log('--- Last 10 Security Events ---');
    events.forEach(e => {
      console.log(`[${e.created_at}] Action: ${e.action}, Result: ${e.result}`);
      console.log('Meta:', JSON.stringify(e.meta, null, 2));
      console.log('--------------------------------------------------');
    });
  } catch (err) {
    console.error('Error querying security events:', err);
  }
}

run();
