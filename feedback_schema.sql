-- Create user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    message TEXT NOT NULL,
    image_urls JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies for user_feedback
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert feedback" 
ON public.user_feedback FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage feedback" 
ON public.user_feedback FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Grant privileges
GRANT ALL ON TABLE public.user_feedback TO authenticated;
GRANT ALL ON TABLE public.user_feedback TO service_role;

-- Setup Storage Bucket for Feedback Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback', 'feedback', true) 
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for feedback storage bucket
CREATE POLICY "Allow authenticated uploads to feedback" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'feedback');

CREATE POLICY "Allow public read access to feedback" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'feedback');

CREATE POLICY "Allow authenticated deletes from feedback" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'feedback');
