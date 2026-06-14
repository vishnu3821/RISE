const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('mock_test_attempts')
    .select('id, test_id, mock_test_answers(obtained_marks, is_evaluated, mock_test_questions(question_type, marks))')
    .eq('status', 'submitted');
  console.log(JSON.stringify({data, error}, null, 2));
}
run();
