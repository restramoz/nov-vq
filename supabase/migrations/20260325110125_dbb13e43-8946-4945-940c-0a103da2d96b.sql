
-- Create novels table
CREATE TABLE public.novels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  genres TEXT[] NOT NULL DEFAULT '{}',
  synopsis TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'Indonesia',
  model TEXT NOT NULL DEFAULT 'qwen-3-235b-a22b-instruct-2507',
  writing_style TEXT NOT NULL DEFAULT '',
  story_styles TEXT[] NOT NULL DEFAULT '{}',
  target_chapters INTEGER NOT NULL DEFAULT 10,
  cover_image TEXT,
  master_concept TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(novel_id, chapter_number)
);

-- Enable RLS
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required per spec)
CREATE POLICY "Anyone can view novels" ON public.novels FOR SELECT USING (true);
CREATE POLICY "Anyone can create novels" ON public.novels FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update novels" ON public.novels FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete novels" ON public.novels FOR DELETE USING (true);

CREATE POLICY "Anyone can view chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Anyone can create chapters" ON public.chapters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update chapters" ON public.chapters FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete chapters" ON public.chapters FOR DELETE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_novels_updated_at
  BEFORE UPDATE ON public.novels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for chapters lookup
CREATE INDEX idx_chapters_novel_id ON public.chapters(novel_id);
CREATE INDEX idx_chapters_novel_number ON public.chapters(novel_id, chapter_number);
