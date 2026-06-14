-- Supabase Schema for Student Goals and Streaks

CREATE TABLE IF NOT EXISTS public.student_goals (
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    goal_questions_per_day INTEGER DEFAULT 20,
    goal_coding_per_day INTEGER DEFAULT 2,
    goal_mock_per_week INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    placement_readiness INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Users can view their own goals" ON public.student_goals;
CREATE POLICY "Users can view their own goals" 
ON public.student_goals FOR SELECT 
TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON public.student_goals;
CREATE POLICY "Users can insert their own goals" 
ON public.student_goals FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON public.student_goals;
CREATE POLICY "Users can update their own goals" 
ON public.student_goals FOR UPDATE 
TO authenticated USING (auth.uid() = student_id);

-- Admin Policies
DROP POLICY IF EXISTS "Admin full access to student_goals" ON public.student_goals;
CREATE POLICY "Admin full access to student_goals"
ON public.student_goals FOR ALL 
TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Grant privileges
GRANT ALL ON public.student_goals TO authenticated;
GRANT ALL ON public.student_goals TO anon;
GRANT ALL ON public.student_goals TO service_role;
