import { supabase } from '@/integrations/supabase/client';

/**
 * Download a file from the ticket-attachments storage bucket.
 * Creates a temporary <a> element to trigger browser download.
 */
export async function downloadTicketFile(filePath: string, fileName: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from('ticket-attachments')
    .download(filePath);

  if (error) throw error;

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if a MIME type represents an image file.
 */
export function isImageFile(fileType: string): boolean {
  return fileType?.startsWith('image/');
}
