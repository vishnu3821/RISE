import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://fflpmpcslocuvauptthc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NTM3NywiZXhwIjoyMDk2MjIxMzc3fQ.Z0w0c_12A4A-j7yRzI0wX5b30Hn-W61sW2QeR5p0Z5Y';

const supabase = createClient(VITE_SUPABASE_URL, SERVICE_KEY);

async function checkPolicies() {
  const { data, error } = await supabase.from('storage.objects').select('*').limit(1);
  if (error) {
     console.error('Error with service key:', error);
  }
  
  // We can't query pg_policies directly via REST API usually, unless exposed.
  // We can try to create the policy directly using RPC if there's an RPC, but there isn't.
  // Wait, let's just insert a file using the service key to see if the bucket accepts files!
  console.log('Testing upload with service key...');
  const blob = new Blob(['hello world'], { type: 'application/pdf' });
  const { error: uploadError } = await supabase.storage
    .from('pyq-documents')
    .upload('test_service.pdf', blob, { upsert: false });
    
  if (uploadError) {
    console.error('Service Key Storage Upload Error:', uploadError.message);
  } else {
    console.log('Service Key Storage Upload Success!');
  }
}

checkPolicies();
