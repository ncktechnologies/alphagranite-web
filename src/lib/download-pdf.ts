// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

/**
 * Downloads a PDF from a backend export endpoint (same approach as the
 * installation & template report): fetch with the bearer token, save the blob.
 * Throws an Error carrying the backend's message when the export fails.
 */
export async function downloadPdf(path: string, params: Record<string, string | number>, filename: string): Promise<void> {
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
  const token = localStorage.getItem('token');
  const response = await fetch(`${baseUrl}${path}${query ? `?${query}` : ''}`, {
    headers: {
      Accept: 'application/pdf',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || contentType.includes('application/json')) {
    const text = await response.text();
    let message = 'PDF export failed';
    try {
      const body = JSON.parse(text);
      message = body.message || body.detail?.message || body.detail || message;
    } catch {
      message = text || message;
    }
    throw new Error(typeof message === 'string' ? message : 'PDF export failed');
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error('The PDF came back empty');

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
