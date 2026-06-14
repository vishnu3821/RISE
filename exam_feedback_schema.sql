-- Create exam_feedback table
CREATE TABLE IF NOT EXISTS public.exam_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    exam_id UUID REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    modules JSONB DEFAULT '[]'::jsonb,
    module_ratings JSONB DEFAULT '{}'::jsonb,
    average_rating NUMERIC(3, 2),
    custom_message TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies for exam_feedback
ALTER TABLE public.exam_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert exam feedback" 
ON public.exam_feedback FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage exam feedback" 
ON public.exam_feedback FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Grant privileges
GRANT ALL ON TABLE public.exam_feedback TO authenticated;
GRANT ALL ON TABLE public.exam_feedback TO service_role;
