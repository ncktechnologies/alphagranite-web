import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Upload, File, Image, Video } from 'lucide-react';
import { useUploadOperatorQaMutation } from '@/store/api/operator';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSelector } from 'react-redux';

interface OperatorMediaUploadProps {
  jobId: number;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

interface FileWithPreview extends File {
  preview?: string;
}

export function OperatorMediaUpload({ jobId, onUploadComplete, onClose }: OperatorMediaUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Required fields for upload
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedFileDesign, setSelectedFileDesign] = useState<string>('');

  const [uploadQa] = useUploadOperatorQaMutation();
  
  // Get current operator ID from store
  const currentUser = useSelector((s: any) => s.user.user);
  const operatorId = currentUser?.employee_id || currentUser?.id;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesWithPreview = acceptedFiles.map(file => {
      const fileWithPreview = file as FileWithPreview;
      // Create preview for images
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      return fileWithPreview;
    });
    setFiles(prev => [...prev, ...filesWithPreview]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.avi', '.mov'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (file.type.startsWith('video/')) return <Video className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getFileTypeLabel = (file: File) => {
    if (file.type.startsWith('image/')) return 'Photo';
    if (file.type.startsWith('video/')) return 'Video';
    return 'Document';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    // Validate required fields
    if (!selectedStage) {
      toast.error('Please select a stage before uploading');
      return;
    }

    if (!selectedFileDesign) {
      toast.error('Please select a file type before uploading');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await uploadQa({
        operator_id: operatorId,
        job_id: jobId,
        files,
        stage_name: selectedStage,
        file_design: selectedFileDesign
      }).unwrap();

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success(`Successfully uploaded ${files.length} file(s)`);
      setFiles([]);

      // Cleanup previews
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });

      // Reset selections after successful upload
      setSelectedStage('');
      setSelectedFileDesign('');

      onUploadComplete?.();
      onClose?.();

    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = (error as any)?.data?.message || 'Failed to upload files. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload QA Files
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stage Selection - Required */}
        <div className="space-y-2">
          <Label htmlFor="stage-select">Stage *</Label>
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger id="stage-select" className="w-full">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cutting">Cutting</SelectItem>
              <SelectItem value="Edging">Edging</SelectItem>
              <SelectItem value="programming">Programming</SelectItem>
              <SelectItem value="final_programming">Final Programming</SelectItem>
              <SelectItem value="sales_ct">Sales Check</SelectItem>
              <SelectItem value="revision">Revision</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Select the current stage for these files</p>
        </div>

        {/* File Type Selection - Required */}
        <div className="space-y-2">
          <Label htmlFor="file-type-select">File Type *</Label>
          <Select value={selectedFileDesign} onValueChange={setSelectedFileDesign}>
            <SelectTrigger id="file-type-select" className="w-full">
              <SelectValue placeholder="Select file type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="block_drawing">Block Drawing</SelectItem>
              <SelectItem value="layout">Layout</SelectItem>
              <SelectItem value="ss_layout">SS Layout</SelectItem>
              <SelectItem value="shop_drawing">Shop Drawing</SelectItem>
              <SelectItem value="photo_media">Photo / Media</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Select the type of file being uploaded</p>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-lg text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg text-gray-600 mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports photos, videos, and documents (max 50MB each)
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Selected Files ({files.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getFileTypeLabel(file)}
                      </Badge>
                      <span className="text-sm font-medium truncate">{file.name}</span>
                    </div>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Upload Button */}
        <Button 
          onClick={handleUpload} 
          disabled={files.length === 0 || uploading || !selectedStage || !selectedFileDesign}
          className="w-full h-12 text-base"
        >
          {uploading ? 'Uploading...' : `Upload ${files.length > 0 ? `${files.length} File${files.length !== 1 ? 's' : ''}` : 'Files'}`}
        </Button>
      </CardContent>
    </Card>
  );
}
