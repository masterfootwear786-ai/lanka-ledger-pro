-- Create storage bucket for chat documents (supports images, PDFs, docs, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-files', 'chat-files', true, 52428800)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 52428800;

-- Policy for authenticated users to upload chat files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Policy for anyone to view chat files (since bucket is public)
CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

-- Policy for users to delete their own uploaded files
CREATE POLICY "Users can delete their own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);