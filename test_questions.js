import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://fflpmpcslocuvauptthc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NTM3NywiZXhwIjoyMDk2MjIxMzc3fQ.MEd20BsapaclozkDvBsPvdOrowIlpROI9TN-cICWCTU';

const supabaseAdmin = createClient(VITE_SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data, error } = await supabaseAdmin.from('questions').select('*').limit(1);
  if (error) console.error(error);
  else if (data && data.length > 0) console.log('Columns:', Object.keys(data[0]));
  else console.log('Table is empty. Cannot determine columns from row.');
}

run();
