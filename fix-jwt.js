import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://fflpmpcslocuvauptthc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NTM3NywiZXhwIjoyMDk2MjIxMzc3fQ.MEd20BsapaclozkDvBsPvdOrowIlpROI9TN-cICWCTU';

const supabaseAdmin = createClient(VITE_SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('Fetching all users...');
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  for (const user of users.users) {
    if (user.user_metadata && user.user_metadata.avatar_url && user.user_metadata.avatar_url.length > 500) {
      console.log(`Found massive avatar_url for user ${user.email}. Clearing it...`);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, avatar_url: null } }
      );
      if (updateError) {
        console.error(`Failed to update ${user.email}:`, updateError);
      } else {
        console.log(`Successfully cleared massive avatar for ${user.email}!`);
      }
    }
  }
  console.log('Done.');
}

run();
