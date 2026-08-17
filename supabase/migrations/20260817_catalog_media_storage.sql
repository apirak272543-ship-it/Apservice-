-- Public catalog images are intentionally separate from private payment, evidence and identity documents.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catalog-media', 'catalog-media', true, 1000000, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "catalog media admins upload" ON storage.objects;
CREATE POLICY "catalog media admins upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'catalog-media'
  AND private.has_role('admin')
  AND storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

DROP POLICY IF EXISTS "catalog media admins update" ON storage.objects;
CREATE POLICY "catalog media admins update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'catalog-media' AND private.has_role('admin'))
WITH CHECK (
  bucket_id = 'catalog-media'
  AND private.has_role('admin')
  AND storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

DROP POLICY IF EXISTS "catalog media admins delete" ON storage.objects;
CREATE POLICY "catalog media admins delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'catalog-media' AND private.has_role('admin'));
