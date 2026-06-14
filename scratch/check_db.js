import { createClient } from '@supabase/supabase-js';

const envUrl = 'https://fflpmpcslocuvauptthc.supabase.co';
const envKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDUzNzcsImV4cCI6MjA5NjIyMTM3N30.clcUpqab3SsnVQasXpSS6nhsy9R0Xx4XNlyqFpTN3Q0';
const supabase = createClient(envUrl, envKey);

async function check() {
  const { data: q1, error: e1 } = await supabase.from('mock_test_questions').select('*');
  console.log('mock_test_questions:', q1 ? q1.length : e1);
  const { data: q2, error: e2 } = await supabase.from('mock_test_coding_questions').select('*');
  console.log('mock_test_coding_questions:', q2 ? q2.length : e2);
}
check();
