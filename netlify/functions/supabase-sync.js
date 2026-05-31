// Netlify function — Supabase data sync
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const path = event.path.replace('/.netlify/functions/supabase-sync', '');
  const method = event.httpMethod;

  try {
    // GET /progress — public progress page data
    if (method === 'GET' && path === '/progress') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/athlete_progress?select=*&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      const row = data[0] || {};

      // Only return fields that are toggled public
      const shareSettings = row.share_settings || {};
      if (!shareSettings.enabled) {
        return { statusCode: 200, headers, body: JSON.stringify({ enabled: false }) };
      }

      const publicData = { enabled: true, athlete: 'Rastislav' };
      if (shareSettings.progress_pct !== false) publicData.progress_pct = row.progress_pct;
      if (shareSettings.weekly_km !== false) publicData.weekly_km = row.weekly_km;
      if (shareSettings.streak !== false) publicData.streak = row.streak;
      if (shareSettings.race_days !== false) publicData.race_days = row.race_days;
      if (shareSettings.completed_count !== false) publicData.completed_count = row.completed_count;
      if (shareSettings.strava_runs !== false) publicData.recent_runs = row.recent_runs;
      if (shareSettings.plan_vs_actual !== false) publicData.weekly_sessions = row.weekly_sessions;
      if (shareSettings.hr_data !== false) publicData.avg_hr = row.avg_hr;
      if (shareSettings.pace_data !== false) publicData.avg_pace = row.avg_pace;
      if (shareSettings.checkins !== false) publicData.checkins = (row.checkins || []).map(c => ({
        date: c.date, dist: c.dist, time: c.time, hr: c.hr, rpe: c.rpe
        // Never include notes, knee, reasons regardless
      }));

      return { statusCode: 200, headers, body: JSON.stringify(publicData) };
    }

    // POST /sync — save progress from app
    if (method === 'POST' && path === '/sync') {
      const body = JSON.parse(event.body || '{}');

      const res = await fetch(`${SUPABASE_URL}/rest/v1/athlete_progress`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: 'rastislav',
          updated_at: new Date().toISOString(),
          progress_pct: body.progress_pct,
          weekly_km: body.weekly_km,
          streak: body.streak,
          race_days: body.race_days,
          completed_count: body.completed_count,
          recent_runs: body.recent_runs,
          weekly_sessions: body.weekly_sessions,
          avg_hr: body.avg_hr,
          avg_pace: body.avg_pace,
          checkins: body.checkins,
          share_settings: body.share_settings,
          completed: body.completed,
          skipped: body.skipped,
          moved: body.moved,
          action_log: body.action_log,
        }),
      });

      if (res.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      } else {
        const err = await res.text();
        return { statusCode: 500, headers, body: JSON.stringify({ error: err }) };
      }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
