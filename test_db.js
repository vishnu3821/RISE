import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fflpmpcslocuvauptthc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDUzNzcsImV4cCI6MjA5NjIyMTM3N30.clcUpqab3SsnVQasXpSS6nhsy9R0Xx4XNlyqFpTN3Q0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles result:", { data, error });
}
check();
