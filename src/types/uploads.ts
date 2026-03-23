export interface UploadedFileMeta {
  id: string;
  name: string;
  size: number;
  filename?: string;
  url?: string;
  type?: string;
  mimeType?: string;
  // Optional metadata captured at selection-time
  stage_name?: string;
  file_design?: string;
  uploaded_by_name?: string;
}


