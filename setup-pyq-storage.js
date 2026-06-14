import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://fflpmpcslocuvauptthc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NTM3NywiZXhwIjoyMDk2MjIxMzc3fQ.MEd20BsapaclozkDvBsPvdOrowIlpROI9TN-cICWCTU';

const supabaseAdmin = createClient(VITE_SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setupPyqStorage() {
  console.log('Checking for pyq-documents bucket...');
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }
  
  const targetBucket = buckets.find(b => b.name === 'pyq-documents');
  if (targetBucket) {
    console.log('pyq-documents bucket already exists.');
    if (!targetBucket.public) {
      await supabaseAdmin.storage.updateBucket('pyq-documents', { public: true });
      console.log('Updated pyq-documents bucket to be public.');
    }
  } else {
    console.log('Creating pyq-documents bucket...');
    const { error: createError } = await supabaseAdmin.storage.createBucket('pyq-documents', {
      public: true,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (createError) {
      console.error('Error creating bucket:', createError);
    } else {
      console.log('Successfully created pyq-documents bucket!');
    }
  }
}

setupPyqStorage();
