INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rider-documents', 'rider-documents', false, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 1048576, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "riders upload own documents" ON storage.objects;
CREATE POLICY "riders upload own documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'rider-documents' AND EXISTS (SELECT 1 FROM public.riders r WHERE r.user_id = auth.uid() AND name LIKE ('rider-' || r.id || '/%')) AND storage.extension(name) = ANY (ARRAY['jpg','jpeg','png','webp'])
);
DROP POLICY IF EXISTS "riders update own documents" ON storage.objects;
CREATE POLICY "riders update own documents" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'rider-documents' AND EXISTS (SELECT 1 FROM public.riders r WHERE r.user_id = auth.uid() AND name LIKE ('rider-' || r.id || '/%'))
) WITH CHECK (
  bucket_id = 'rider-documents' AND EXISTS (SELECT 1 FROM public.riders r WHERE r.user_id = auth.uid() AND name LIKE ('rider-' || r.id || '/%'))
);
DROP POLICY IF EXISTS "riders or admins read documents" ON storage.objects;
CREATE POLICY "riders or admins read documents" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'rider-documents' AND (private.has_role('admin') OR EXISTS (SELECT 1 FROM public.riders r WHERE r.user_id = auth.uid() AND name LIKE ('rider-' || r.id || '/%')))
);
NOTIFY pgrst, 'reload schema';
