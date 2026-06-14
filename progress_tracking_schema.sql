-- =================================================================
-- RISE PLATFORM - PERSISTENT PROGRESS TRACKING SCHEMA UPDATE
-- =================================================================

-- 1. Enhance Learning Hub Progress to save exact answers
ALTER TABLE public.learning_hub_progress 
ADD COLUMN IF NOT EXISTS selected_option TEXT;

ALTER TABLE public.learning_hub_progress 
ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;

-- Update the unique constraint on learning_hub_progress if needed, but it should already be unique by student_id + question_id.
-- If the unique constraint doesn't exist, let's create it to allow safe UPSERTs.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_question_progress'
    ) THEN
        ALTER TABLE public.learning_hub_progress
        ADD CONSTRAINT unique_student_question_progress UNIQUE (student_id, question_id);
    END IF;
END $$;


-- 2. Create Previous Year Questions (PYQ) Progress Table
CREATE TABLE IF NOT EXISTS public.pyq_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, document_id) -- Ensures a student can only complete a document once
);

-- Enable RLS for pyq_progress
ALTER TABLE public.pyq_progress ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for pyq_progress
DROP POLICY IF EXISTS "Users can view their own pyq progress" ON public.pyq_progress;
CREATE POLICY "Users can view their own pyq progress" 
ON public.pyq_progress FOR SELECT 
TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own pyq progress" ON public.pyq_progress;
CREATE POLICY "Users can insert their own pyq progress" 
ON public.pyq_progress FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update their own pyq progress" ON public.pyq_progress;
CREATE POLICY "Users can update their own pyq progress" 
ON public.pyq_progress FOR UPDATE 
TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can delete their own pyq progress" ON public.pyq_progress;
CREATE POLICY "Users can delete their own pyq progress" 
ON public.pyq_progress FOR DELETE 
TO authenticated USING (auth.uid() = student_id);

-- Enable access for admins as well
DROP POLICY IF EXISTS "Admin full access to pyq_progress" ON public.pyq_progress;
CREATE POLICY "Admin full access to pyq_progress"
ON public.pyq_progress FOR ALL 
TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 3. Ensure Mock Test Attempts table supports status perfectly
-- (The mock_tests_schema already handles mock_test_attempts and mock_test_answers correctly. No schema changes needed here.)

-- 4. Ensure AI Interview Attempts table tracks status perfectly
-- (The ai_mock_interviews_schema already tracks ai_interview_attempts and ai_interview_answers correctly. No schema changes needed here.)
