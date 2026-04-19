// Retroactively merge Kevin's sessions using the 4-hour continuation rule
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const vars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => {
  const idx = l.indexOf('=');
  return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
}));

const supabase = createClient(vars['NEXT_PUBLIC_SUPABASE_URL'], vars['SUPABASE_SERVICE_ROLE_KEY']);

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

async function mergeSessions(userId) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: true });

  if (!sessions?.length) return console.log('No sessions found');

  // Group sessions: start new group when gap > 4 hours from the last session's end/start
  const groups = [];
  let current = [sessions[0]];

  for (let i = 1; i < sessions.length; i++) {
    const prev = current[current.length - 1];
    const prevActivity = prev.ended_at || prev.started_at;
    const gap = new Date(sessions[i].started_at) - new Date(prevActivity);
    if (gap < FOUR_HOURS_MS) {
      current.push(sessions[i]);
    } else {
      groups.push(current);
      current = [sessions[i]];
    }
  }
  groups.push(current);

  console.log(`Found ${sessions.length} sessions → ${groups.length} logical session(s)`);

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    if (group.length === 1) {
      // Renumber if needed
      if (group[0].session_number !== gi + 1) {
        const oldNum = group[0].session_number;
        const newNum = gi + 1;
        console.log(`Renumbering session #${oldNum} → #${newNum}`);
        await supabase.from('sessions').update({ session_number: newNum }).eq('id', group[0].id);
        await renumberPortraitData(userId, oldNum, newNum);
      }
      continue;
    }

    const primary = group[0];
    const toMerge = group.slice(1);
    const newNum = gi + 1;

    console.log(`Merging sessions #${group.map(s => s.session_number).join(', ')} → Session #${newNum} (kept: ${primary.id})`);

    // Update ended_at to the latest across the group
    const latestEnded = group.map(s => s.ended_at).filter(Boolean).sort().pop();
    if (latestEnded) {
      await supabase.from('sessions').update({ ended_at: latestEnded, session_number: newNum }).eq('id', primary.id);
    } else {
      await supabase.from('sessions').update({ session_number: newNum }).eq('id', primary.id);
    }

    // Move messages to primary session
    for (const s of toMerge) {
      await supabase.from('messages').update({ session_id: primary.id }).eq('session_id', s.id);
      await supabase.from('scores').update({ session_id: primary.id }).eq('session_id', s.id);
      await supabase.from('cq_dimensions').update({ session_id: primary.id }).eq('session_id', s.id);

      // Update session_number references in portrait tables
      const oldNum = s.session_number;
      await renumberPortraitData(userId, oldNum, newNum);
    }

    // Delete the merged sessions
    for (const s of toMerge) {
      await supabase.from('sessions').delete().eq('id', s.id);
    }

    // Also renumber primary if needed
    if (primary.session_number !== newNum) {
      await renumberPortraitData(userId, primary.session_number, newNum);
    }
  }

  console.log('Done! Verifying...');
  const { data: after } = await supabase
    .from('sessions')
    .select('id, session_number, started_at, ended_at')
    .eq('user_id', userId)
    .order('session_number', { ascending: true });
  after.forEach(s => console.log(`  Session #${s.session_number} | ${s.started_at} → ${s.ended_at || 'open'} | id: ${s.id}`));
}

async function renumberPortraitData(userId, oldNum, newNum) {
  if (oldNum === newNum) return;
  await supabase.from('fragments').update({ session_number: newNum }).eq('user_id', userId).eq('session_number', oldNum);
  await supabase.from('hypotheses').update({ created_session: newNum }).eq('user_id', userId).eq('created_session', oldNum);
  await supabase.from('hypotheses').update({ resolved_session: newNum }).eq('user_id', userId).eq('resolved_session', oldNum);
  await supabase.from('key_moments').update({ session_number: newNum }).eq('user_id', userId).eq('session_number', oldNum);
  await supabase.from('territory_map').update({ last_visited_session: newNum }).eq('user_id', userId).eq('last_visited_session', oldNum);
  await supabase.from('portrait_dimensions').update({ last_evidence_session: newNum }).eq('user_id', userId).eq('last_evidence_session', oldNum);
  await supabase.from('shared_history').update({ session_number: newNum }).eq('user_id', userId).eq('session_number', oldNum);
}

// Find Kevin and merge
const { data: users } = await supabase.from('users').select('id, display_name').ilike('display_name', 'kevin%');
if (!users?.length) {
  console.log('Kevin not found');
} else {
  await mergeSessions(users[0].id);
}
