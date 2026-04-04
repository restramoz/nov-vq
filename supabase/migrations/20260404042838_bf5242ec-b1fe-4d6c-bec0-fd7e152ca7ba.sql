
ALTER TABLE public.novels ADD COLUMN audio_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('novel-audio', 'novel-audio', true);

CREATE POLICY "Anyone can upload audio" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'novel-audio');
CREATE POLICY "Anyone can read audio" ON storage.objects FOR SELECT TO public USING (bucket_id = 'novel-audio');
CREATE POLICY "Anyone can delete audio" ON storage.objects FOR DELETE TO public USING (bucket_id = 'novel-audio');
