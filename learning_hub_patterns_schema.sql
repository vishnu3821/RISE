-- 1. Create Learning Hub Patterns Table
CREATE TABLE IF NOT EXISTS public.learning_hub_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID REFERENCES public.learning_hub_topics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add pattern_id to existing questions table
ALTER TABLE public.learning_hub_questions 
ADD COLUMN IF NOT EXISTS pattern_id UUID REFERENCES public.learning_hub_patterns(id) ON DELETE SET NULL;

-- 3. Enable RLS and create hyper-permissive policies
ALTER TABLE public.learning_hub_patterns ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.learning_hub_patterns TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow full access to patterns" ON public.learning_hub_patterns;
CREATE POLICY "Allow full access to patterns" ON public.learning_hub_patterns FOR ALL TO public USING (true) WITH CHECK (true);

-- Ensure questions table stays fully permissive with the new column
GRANT ALL ON TABLE public.learning_hub_questions TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Allow full access to questions" ON public.learning_hub_questions;
CREATE POLICY "Allow full access to questions" ON public.learning_hub_questions FOR ALL TO public USING (true) WITH CHECK (true);
