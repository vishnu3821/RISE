-- Supabase Schema for Coding Questions & Evaluation

-- 1. Coding Questions Table
CREATE TABLE public.mock_test_coding_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    test_id UUID REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    marks INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Coding Test Cases Table
CREATE TABLE public.mock_test_coding_test_cases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES public.mock_test_coding_questions(id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Coding Answers & Evaluation Table
CREATE TABLE public.mock_test_coding_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    attempt_id UUID REFERENCES public.mock_test_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.mock_test_coding_questions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    ai_bonus INTEGER DEFAULT 0,
    ai_feedback JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'evaluated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE public.mock_test_coding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_coding_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_coding_answers ENABLE ROW LEVEL SECURITY;

-- Create Policies (Admin full access, Students read questions/cases, insert answers)
CREATE POLICY "Admins have full access to coding_questions" ON public.mock_test_coding_questions FOR ALL USING (true);
CREATE POLICY "Students can read coding_questions" ON public.mock_test_coding_questions FOR SELECT USING (true);

CREATE POLICY "Admins have full access to coding_test_cases" ON public.mock_test_coding_test_cases FOR ALL USING (true);
CREATE POLICY "Students can read coding_test_cases" ON public.mock_test_coding_test_cases FOR SELECT USING (true);

CREATE POLICY "Admins have full access to coding_answers" ON public.mock_test_coding_answers FOR ALL USING (true);
CREATE POLICY "Students can insert coding_answers" ON public.mock_test_coding_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can view their coding_answers" ON public.mock_test_coding_answers FOR SELECT USING (true);

-- Grant privileges to roles
GRANT ALL ON public.mock_test_coding_questions TO authenticated;
GRANT ALL ON public.mock_test_coding_questions TO anon;
GRANT ALL ON public.mock_test_coding_questions TO service_role;

GRANT ALL ON public.mock_test_coding_test_cases TO authenticated;
GRANT ALL ON public.mock_test_coding_test_cases TO anon;
GRANT ALL ON public.mock_test_coding_test_cases TO service_role;

GRANT ALL ON public.mock_test_coding_answers TO authenticated;
GRANT ALL ON public.mock_test_coding_answers TO anon;
GRANT ALL ON public.mock_test_coding_answers TO service_role;
