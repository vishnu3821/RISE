-- 1. Create AI Interview Modules Table
CREATE TABLE IF NOT EXISTS public.ai_interview_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create AI Interview Companies Table
CREATE TABLE IF NOT EXISTS public.ai_interview_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create AI Interview Questions Table
CREATE TABLE IF NOT EXISTS public.ai_interview_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.ai_interview_modules(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.ai_interview_companies(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    expected_points JSONB DEFAULT '[]'::jsonb NOT NULL,
    difficulty TEXT DEFAULT 'Medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create AI Interview Attempts Table
CREATE TABLE IF NOT EXISTS public.ai_interview_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,
    module_id UUID REFERENCES public.ai_interview_modules(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.ai_interview_companies(id) ON DELETE CASCADE,
    resume_url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    overall_score INTEGER DEFAULT 0,
    comm_score INTEGER DEFAULT 0,
    confidence_score INTEGER DEFAULT 0,
    fluency_score INTEGER DEFAULT 0,
    grammar_score INTEGER DEFAULT 0,
    vocab_score INTEGER DEFAULT 0,
    pron_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create AI Interview Answers Table
CREATE TABLE IF NOT EXISTS public.ai_interview_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID REFERENCES public.ai_interview_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.ai_interview_questions(id) ON DELETE CASCADE,
    transcript_text TEXT,
    feedback JSONB DEFAULT '{}'::jsonb,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Insert Default Modules
INSERT INTO public.ai_interview_modules (name, description, icon) VALUES 
('Communication Skills', 'Practice speaking fluently and improve confidence.', 'Mic'),
('HR Interview', 'Prepare for common HR and behavioral interview questions.', 'Users'),
('Technical Explanation', 'Verbally explain technical concepts and coding topics.', 'Code'),
('Company Mock Interviews', 'Practice company-specific interview rounds.', 'Building2'),
('Resume-Based Interview', 'AI generates questions based on your uploaded resume.', 'FileText')
ON CONFLICT (name) DO NOTHING;

-- 7. Enable RLS and Create Hyper-Permissive Policies
-- This ensures that regardless of Supabase's default settings, the tables will allow full access for development.

-- Enable RLS
ALTER TABLE public.ai_interview_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interview_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interview_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interview_answers ENABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE public.ai_interview_modules TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ai_interview_companies TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ai_interview_questions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ai_interview_attempts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ai_interview_answers TO anon, authenticated, service_role;

-- Create Policies allowing all operations for ALL users (anon & authenticated)
DROP POLICY IF EXISTS "Allow full access to modules" ON public.ai_interview_modules;
CREATE POLICY "Allow full access to modules" ON public.ai_interview_modules FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to companies" ON public.ai_interview_companies;
CREATE POLICY "Allow full access to companies" ON public.ai_interview_companies FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to questions" ON public.ai_interview_questions;
CREATE POLICY "Allow full access to questions" ON public.ai_interview_questions FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to attempts" ON public.ai_interview_attempts;
CREATE POLICY "Allow full access to attempts" ON public.ai_interview_attempts FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to answers" ON public.ai_interview_answers;
CREATE POLICY "Allow full access to answers" ON public.ai_interview_answers FOR ALL TO public USING (true) WITH CHECK (true);
