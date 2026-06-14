import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://fflpmpcslocuvauptthc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDUzNzcsImV4cCI6MjA5NjIyMTM3N30.clcUpqab3SsnVQasXpSS6nhsy9R0Xx4XNlyqFpTN3Q0';

const supabase = createClient(VITE_SUPABASE_URL, ANON_KEY);

async function testUpload() {
  console.log('Testing pyq-documents storage upload...');
  const blob = new Blob(['hello world'], { type: 'application/pdf' });
  const { error: uploadError } = await supabase.storage
    .from('pyq-documents')
    .upload('test.pdf', blob, { upsert: false });
    
  if (uploadError) {
    console.error('Storage Upload Error:', uploadError.message);
  } else {
    console.log('Storage Upload Success!');
  }
}

testUpload();
