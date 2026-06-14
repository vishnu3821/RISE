import { createClient } from '@supabase/supabase-js';

const envUrl = 'https://fflpmpcslocuvauptthc.supabase.co';
const envKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmbHBtcGNzbG9jdXZhdXB0dGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDUzNzcsImV4cCI6MjA5NjIyMTM3N30.clcUpqab3SsnVQasXpSS6nhsy9R0Xx4XNlyqFpTN3Q0';

export const supabase = createClient(envUrl, envKey);
