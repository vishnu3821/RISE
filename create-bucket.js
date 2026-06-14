import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://fflpmpcslocuvauptthc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NTM3NywiZXhwIjoyMDk2MjIxMzc3fQ.MEd20BsapaclozkDvBsPvdOrowIlpROI9TN-cICWCTU';

const supabaseAdmin = createClient(VITE_SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createBucket() {
  console.log('Checking for avatars bucket...');
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }
  
  const avatarsBucket = buckets.find(b => b.name === 'avatars');
  if (avatarsBucket) {
    console.log('Avatars bucket already exists.');
    
    // Ensure it is public
    if (!avatarsBucket.public) {
      await supabaseAdmin.storage.updateBucket('avatars', { public: true });
      console.log('Updated avatars bucket to be public.');
    }
  } else {
    console.log('Creating avatars bucket...');
    const { error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });
    
    if (createError) {
      console.error('Error creating bucket:', createError);
    } else {
      console.log('Successfully created avatars bucket!');
    }
  }
}

createBucket();
