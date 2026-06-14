-- dynamic_modules_schema.sql

-- ==========================================
-- 1. Create the new mock_modules table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.mock_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.mock_modules ENABLE ROW LEVEL SECURITY;

-- Policies for mock_modules
DROP POLICY IF EXISTS "Public Read Access for Mock Modules" ON public.mock_modules;
CREATE POLICY "Public Read Access for Mock Modules" 
ON public.mock_modules FOR SELECT 
TO public USING (true);

DROP POLICY IF EXISTS "Admin All Access for Mock Modules" ON public.mock_modules;
CREATE POLICY "Admin All Access for Mock Modules" 
ON public.mock_modules FOR ALL 
TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Grant privileges
GRANT ALL ON TABLE public.mock_modules TO authenticated;
GRANT ALL ON TABLE public.mock_modules TO anon;
GRANT ALL ON TABLE public.mock_modules TO service_role;

-- ==========================================
-- 2. Seed the table with the original 5 default modules
-- ==========================================
INSERT INTO public.mock_modules (name, description, status)
VALUES 
    ('Aptitude', 'General Aptitude Questions', 'Active'),
    ('Verbal', 'Verbal Reasoning and English', 'Active'),
    ('Reasoning', 'Logical Reasoning', 'Active'),
    ('Quantitative', 'Quantitative Aptitude', 'Active'),
    ('Coding', 'Programming and Data Structures', 'Active')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 3. Modify mock_test_modules table
-- ==========================================
-- Drop the strict CHECK constraint on module_name so we can use custom names
ALTER TABLE public.mock_test_modules DROP CONSTRAINT IF EXISTS mock_test_modules_module_name_check;

-- Add module_id column to link to the new mock_modules table
ALTER TABLE public.mock_test_modules ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.mock_modules(id) ON DELETE CASCADE;

-- Update existing mock_test_modules to point to the new mock_modules rows
UPDATE public.mock_test_modules mtm
SET module_id = mm.id
FROM public.mock_modules mm
WHERE mtm.module_name = mm.name AND mtm.module_id IS NULL;

-- ==========================================
-- 4. Modify mock_test_questions table
-- ==========================================
-- Add module_id column
ALTER TABLE public.mock_test_questions ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.mock_modules(id) ON DELETE CASCADE;

-- Update existing questions to point to the new mock_modules rows
UPDATE public.mock_test_questions mtq
SET module_id = mm.id
FROM public.mock_modules mm
WHERE mtq.module_name = mm.name AND mtq.module_id IS NULL;

-- ==========================================
-- 5. Modify mock_test_coding_questions table
-- ==========================================
-- Add module_id column to coding questions so they also belong strictly to a module
ALTER TABLE public.mock_test_coding_questions ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.mock_modules(id) ON DELETE CASCADE;

-- For existing coding questions, link them to the 'Coding' module to preserve old exams
UPDATE public.mock_test_coding_questions mtcq
SET module_id = mm.id
FROM public.mock_modules mm
WHERE mm.name = 'Coding' AND mtcq.module_id IS NULL;
