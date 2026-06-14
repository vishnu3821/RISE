import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = 'https://fflpmpcslocuvauptthc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY0NTM3NywiZXhwIjoyMDk2MjIxMzc3fQ.MEd20BsapaclozkDvBsPvdOrowIlpROI9TN-cICWCTU';

const supabaseAdmin = createClient(VITE_SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setup() {
  console.log('Fetching users...');
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('List error:', listError);
  }
  
  if (users?.users) {
    const user = users.users.find(u => u.email === 'vishnu@rise.com');
    if (user) {
      console.log('Deleting corrupted user...', user.id);
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error('Delete error via API:', delErr);
      } else {
        console.log('Deleted successfully via API.');
      }
    }
  }

  console.log('Creating fresh admin user via GoTrue API...');
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'vishnu@rise.com',
    password: 'vishnu',
    email_confirm: true
  });

  if (authError) {
    console.error('Error creating user:', authError);
    return;
  }

  console.log('User created successfully:', authData.user.id);
  
  // Wait a second for the database trigger to create the profile row
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Promoting user to admin...');
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', authData.user.id);

  if (updateError) {
    console.error('Error updating role:', updateError);
  } else {
    console.log('Success! vishnu@rise.com is now an admin.');
  }
}

setup();
