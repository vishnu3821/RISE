import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const VITE_SUPABASE_URL = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const VITE_SUPABASE_ANON_KEY = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function checkDatabase() {
  console.log("Checking profiles table...");
  const { data, error } = await supabase.from('profiles').select('*');
  
  if (error) {
    console.error("Error fetching profiles:", error);
  } else {
    console.log("Profiles in database:", data);
  }
}

checkDatabase();
