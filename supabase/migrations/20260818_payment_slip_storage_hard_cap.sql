-- Payment slips are image uploads and must follow the platform-wide 1 MB cap.
UPDATE storage.buckets
SET file_size_limit = 1000000,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'payment-slips';
