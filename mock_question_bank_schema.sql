-- Create mock_question_bank table
CREATE TABLE IF NOT EXISTS public.mock_question_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    
    -- Coding Specific
    test_cases JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.mock_question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin All Access for Question Bank" 
ON public.mock_question_bank FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Note: We only give admins access to the question bank. 
-- Students don't need access to it directly, they only access questions assigned to a specific mock_test.

-- Grants
GRANT ALL ON TABLE public.mock_question_bank TO authenticated;
GRANT ALL ON TABLE public.mock_question_bank TO service_role;
