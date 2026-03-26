
CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  traits text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view characters" ON public.characters FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can create characters" ON public.characters FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update characters" ON public.characters FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete characters" ON public.characters FOR DELETE TO public USING (true);

CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
