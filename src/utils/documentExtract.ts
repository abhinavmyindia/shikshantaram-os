// Client-side file utilities for Knowledge Base uploads

// Convert File to base64 string (strips the data URL prefix)
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Detect file type from extension
export const getFileType = (filename: string): 'pdf' | 'docx' | 'txt' | null => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf')  return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'txt')  return 'txt';
  return null;
};

// Extract text from TXT file
export const extractTextFromTxt = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });

// Extract text from DOCX using mammoth.js
export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    const mammoth     = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result      = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (_) {
    return '';
  }
};

// Validate file before upload
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize  = 5 * 1024 * 1024; // 5MB
  const fileType = getFileType(file.name);

  if (!fileType)          return { valid: false, error: 'Only PDF, DOCX, and TXT files are supported.' };
  if (file.size > maxSize) return { valid: false, error: 'File must be under 5MB.' };
  if (file.size < 500)    return { valid: false, error: 'File seems too small — add more content.' };
  return { valid: true };
};
