import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local manually
const env = readFileSync('.env.local', 'utf8');
const vars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())));
const SUPABASE_URL = vars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY = vars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const { data: users } = await supabase.from('users').select('id, display_name').ilike('display_name', 'kevin%');
console.log('Kevin users:', users);

const userId = users[0].id;
const { data: sessions } = await supabase.from('sessions').select('id, session_number, started_at, ended_at, phase').eq('user_id', userId).order('started_at', { ascending: true });

for (let i = 0; i < sessions.length; i++) {
  const s = sessions[i];
  const prev = sessions[i - 1];
  const gapFromPrev = prev && s.started_at
    ? Math.round((new Date(s.started_at) - new Date(prev.ended_at || prev.started_at)) / 60000)
    : null;
  const dur = s.ended_at ? Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000) : null;
  console.log(`Session #${s.session_number} | dur: ${dur}m | gap from prev: ${gapFromPrev}m | start: ${s.started_at} | id: ${s.id}`);
}
