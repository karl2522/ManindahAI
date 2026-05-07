import { supabase } from '../lib/supabase';

export const ImageService = {
  /**
   * Upload an image to a Supabase storage bucket using a local URI.
   * This is the recommended approach for React Native to handle binary data.
   */
  async upload(bucket: string, path: string, uri: string, contentType: string = 'image/jpeg'): Promise<string> {
    // 1. Fetch the image from the local URI and convert to blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // 2. Upload the blob to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // 3. Get and return the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  },

  /**
   * Delete an image from a Supabase storage bucket.
   */
  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }
};
