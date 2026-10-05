const { createClient } = require('@supabase/supabase-js');

let supabase;

async function connectDatabase({ supabaseUrl, supabaseServiceRoleKey }) {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    supabase = null;
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
  return supabase;
}

function getDatabase() {
  if (!supabase) throw new Error('Supabase has not been initialized.');
  return supabase;
}

module.exports = { connectDatabase, getDatabase };
