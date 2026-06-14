-- ==========================================
-- RISE MOCK TESTS MODULE SCHEMA
-- ==========================================

-- 1. Exams Table
CREATE TABLE IF NOT EXISTS public.mock_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 120,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    allow_calculator BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Modules Included in Exam
CREATE TABLE IF NOT EXISTS public.mock_test_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES public.mock_tests(id) ON DELETE CASCADE NOT NULL,
    module_name TEXT NOT NULL CHECK (module_name IN ('Aptitude', 'Verbal', 'Reasoning', 'Quantitative', 'Coding')),
    duration_minutes INTEGER DEFAULT 30,
    question_count INTEGER DEFAULT 10,
    order_index INTEGER DEFAULT 0
);

-- 3. Exam Questions
CREATE TABLE IF NOT EXISTS public.mock_test_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES public.mock_tests(id) ON DELETE CASCADE NOT NULL,
    module_name TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('MCQ', 'CODING')),
    
    -- Shared
    question_text TEXT NOT NULL,
    marks INTEGER DEFAULT 1,
    difficulty TEXT DEFAULT 'Medium',
    
    -- MCQ Specific
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT,
    explanation TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Student Attempts
CREATE TABLE IF NOT EXISTS public.mock_test_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    tab_switches INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    module_state JSONB DEFAULT '{}'::jsonb
);

-- 5. Student Answers
CREATE TABLE IF NOT EXISTS public.mock_test_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID REFERENCES public.mock_test_attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.mock_test_questions(id) ON DELETE CASCADE NOT NULL,
    
    -- MCQ Answer
    selected_option TEXT,
    
    -- Coding Answer
    code_response TEXT,
    code_language TEXT,
    
    -- Evaluation
    obtained_marks INTEGER DEFAULT NULL,
    is_evaluated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(attempt_id, question_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_answers ENABLE ROW LEVEL SECURITY;

-- 1. mock_tests Policies
DROP POLICY IF EXISTS "Public Read Access for Tests" ON public.mock_tests;
CREATE POLICY "Public Read Access for Tests" 
ON public.mock_tests FOR SELECT 
TO public USING (true);

DROP POLICY IF EXISTS "Admin All Access for Tests" ON public.mock_tests;
CREATE POLICY "Admin All Access for Tests" 
ON public.mock_tests FOR ALL 
TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 2. mock_test_modules Policies
DROP POLICY IF EXISTS "Public Read Access for Test Modules" ON public.mock_test_modules;
CREATE POLICY "Public Read Access for Test Modules" 
ON public.mock_test_modules FOR SELECT 
TO public USING (true);

DROP POLICY IF EXISTS "Admin All Access for Test Modules" ON public.mock_test_modules;
CREATE POLICY "Admin All Access for Test Modules" 
ON public.mock_test_modules FOR ALL 
TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 3. mock_test_questions Policies
DROP POLICY IF EXISTS "Public Read Access for Questions" ON public.mock_test_questions;
CREATE POLICY "Public Read Access for Questions" 
ON public.mock_test_questions FOR SELECT 
TO public USING (true);

DROP POLICY IF EXISTS "Admin All Access for Questions" ON public.mock_test_questions;
CREATE POLICY "Admin All Access for Questions" 
ON public.mock_test_questions FOR ALL 
TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 4. mock_test_attempts Policies
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.mock_test_attempts;
CREATE POLICY "Users can view their own attempts" 
ON public.mock_test_attempts FOR SELECT 
TO authenticated USING (auth.uid() = student_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can create their own attempts" ON public.mock_test_attempts;
CREATE POLICY "Users can create their own attempts" 
ON public.mock_test_attempts FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update their own attempts" ON public.mock_test_attempts;
CREATE POLICY "Users can update their own attempts" 
ON public.mock_test_attempts FOR UPDATE 
TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admin All Access for Attempts" ON public.mock_test_attempts;
CREATE POLICY "Admin All Access for Attempts" 
ON public.mock_test_attempts FOR ALL 
TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 5. mock_test_answers Policies
DROP POLICY IF EXISTS "Users can view their own answers" ON public.mock_test_answers;
CREATE POLICY "Users can view their own answers" 
ON public.mock_test_answers FOR SELECT 
TO authenticated USING (
  attempt_id IN (SELECT id FROM public.mock_test_attempts WHERE student_id = auth.uid()) 
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Users can insert their own answers" ON public.mock_test_answers;
CREATE POLICY "Users can insert their own answers" 
ON public.mock_test_answers FOR INSERT 
TO authenticated WITH CHECK (
  attempt_id IN (SELECT id FROM public.mock_test_attempts WHERE student_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own answers" ON public.mock_test_answers;
CREATE POLICY "Users can update their own answers" 
ON public.mock_test_answers FOR UPDATE 
TO authenticated USING (
  attempt_id IN (SELECT id FROM public.mock_test_attempts WHERE student_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin All Access for Answers" ON public.mock_test_answers;
CREATE POLICY "Admin All Access for Answers" 
ON public.mock_test_answers FOR ALL 
TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ==========================================
-- GRANT PRIVILEGES
-- ==========================================
GRANT ALL ON TABLE public.mock_tests TO authenticated;
GRANT ALL ON TABLE public.mock_tests TO anon;
GRANT ALL ON TABLE public.mock_test_modules TO authenticated;
GRANT ALL ON TABLE public.mock_test_modules TO anon;
GRANT ALL ON TABLE public.mock_test_questions TO authenticated;
GRANT ALL ON TABLE public.mock_test_questions TO anon;
GRANT ALL ON TABLE public.mock_test_attempts TO authenticated;
GRANT ALL ON TABLE public.mock_test_attempts TO anon;
GRANT ALL ON TABLE public.mock_test_answers TO authenticated;
GRANT ALL ON TABLE public.mock_test_answers TO anon;
