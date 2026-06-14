-- 1. Add pattern_text column to topics
ALTER TABLE public.learning_hub_topics 
ADD COLUMN IF NOT EXISTS pattern_text TEXT;

-- 2. Clean up the over-engineered tables/columns from the previous attempt
ALTER TABLE public.learning_hub_questions 
DROP COLUMN IF EXISTS pattern_id;

DROP TABLE IF EXISTS public.learning_hub_patterns;
