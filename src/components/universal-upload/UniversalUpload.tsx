import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Upload, File, Image, Video, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';

export interface UploadEndpoint {
  mutationHook: () => any;
  endpointName: string;
}

export interface StageOption {
  value: string;
  label?: string;
}

export interface FileTypeOption {
  value: string;
  label?: string;
}

export interface UniversalUploadProps {
  // Required identifiers
  jobId?: number;
  entityId?: number | string;

  // Upload configuration
  uploadMutation: any;
  stages: StageOption[];
  fileTypes: FileTypeOption[];
  additionalParams?: Record<string, any>;

  // Callbacks
  onUploadComplete?: () => void;
  onClose?: () => void;

  // Customization
  title?: string;
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
  multiple?: boolean;
  showStageSelect?: boolean;
  showFileTypeSelect?: boolean;
  defaultStage?: string;          // default stage value (used when dropdown hidden or preselected)
  defaultFileType?: string;       // default file type value (used when dropdown hidden or preselected)
}

interface FileWithPreview extends File {
  preview?: string;
}

export function UniversalUpload({
  jobId,
  entityId,
  uploadMutation,
  stages,
  fileTypes,
  additionalParams = {},
  onUploadComplete,
  onClose,
  title,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.avi', '.mov'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSizeMB = 50,
  multiple = true,
  showStageSelect = true,
  showFileTypeSelect = true,
  defaultStage,
  defaultFileType,
}: UniversalUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Initialize with default values if provided (useful when dropdowns are shown)
  const [selectedStage, setSelectedStage] = useState<string>(defaultStage || '');
  const [selectedFileDesign, setSelectedFileDesign] = useState<string>(defaultFileType || '');

  const { t, translateStage, translateFileType, translateFileLabel } = useTranslation();

  // When dropdowns are hidden, we still use the defaults (if any) in the upload.
  // The state variables may still be set, but the UI won't show the dropdowns.
  // The effective stage/file type for upload:
  const effectiveStage = showStageSelect ? selectedStage : (defaultStage || '');
  const effectiveFileType = showFileTypeSelect ? selectedFileDesign : (defaultFileType || '');

  // Update selected stage if defaultStage changes (rare, but ensures consistency)
  useEffect(() => {
    if (defaultStage !== undefined && selectedStage === '') {
      setSelectedStage(defaultStage);
    }
  }, [defaultStage, selectedStage]);

  useEffect(() => {
    if (defaultFileType !== undefined && selectedFileDesign === '') {
      setSelectedFileDesign(defaultFileType);
    }
  }, [defaultFileType, selectedFileDesign]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesWithPreview = acceptedFiles.map(file => {
      const fileWithPreview = file as FileWithPreview;
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      return fileWithPreview;
    });
    setFiles(prev => [...prev, ...filesWithPreview]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple,
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
    return translateFileLabel(file.type);
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
      toast.error(t('VALIDATION.NO_FILES', { defaultMessage: 'Please select at least one file to upload' }));
      return;
    }

    // Validate required fields only when dropdown is shown and no default (or user hasn't selected)
    if (showStageSelect && !selectedStage) {
      toast.error(t('VALIDATION.STAGE_REQUIRED'));
      return;
    }
    if (showFileTypeSelect && !selectedFileDesign) {
      toast.error(t('VALIDATION.FILE_TYPE_REQUIRED'));
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

      // Prepare upload data
      const uploadData: any = {
        files,
        ...(jobId && { job_id: jobId }),
        ...(entityId && {
          operator_id: entityId,
          ...additionalParams
        }),
        // Send stage_name if we have an effective value (from selection or default)
        ...(effectiveStage && { stage_name: effectiveStage }),
        // Send file_design if we have an effective value
        ...(effectiveFileType && { file_design: effectiveFileType }),
      };

      await uploadMutation(uploadData).unwrap();

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success(t('UPLOAD.SUCCESS', { count: files.length }));
      setFiles([]);

      // Cleanup previews
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });

      // Reset selections after successful upload (but keep defaults for next upload)
      if (showStageSelect) setSelectedStage(defaultStage || '');
      if (showFileTypeSelect) setSelectedFileDesign(defaultFileType || '');

      onUploadComplete?.();
      onClose?.();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(t('UPLOAD.FAILED'));
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
          {title || t('UPLOAD.FILES.TITLE')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stage Selection */}
        {showStageSelect && (
          <div className="space-y-2">
            <Label htmlFor="stage-select">{t('UPLOAD.STAGE_LABEL')}</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger id="stage-select" className="w-full">
                <SelectValue placeholder={t('UPLOAD.STAGE_PLACEHOLDER')} />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label || translateStage(stage.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('UPLOAD.STAGE_HELP')}</p>
          </div>
        )}

        {/* File Type Selection */}
        {showFileTypeSelect && (
          <div className="space-y-2">
            <Label htmlFor="file-type-select">{t('UPLOAD.FILE_TYPE_LABEL')}</Label>
            <Select value={selectedFileDesign} onValueChange={setSelectedFileDesign}>
              <SelectTrigger id="file-type-select" className="w-full">
                <SelectValue placeholder={t('UPLOAD.FILE_TYPE_PLACEHOLDER')} />
              </SelectTrigger>
              <SelectContent>
                {fileTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label || translateFileType(type.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('UPLOAD.FILE_TYPE_HELP')}</p>
          </div>
        )}

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
            <p className="text-lg text-blue-600">{t('UPLOAD.DROP_ACTIVE', { defaultMessage: 'Drop the files here...' })}</p>
          ) : (
            <div>
              <p className="text-lg text-gray-600 mb-2">
                {t('UPLOAD.DRAG_DROP')}
              </p>
              <p className="text-sm text-gray-500">
                {t('UPLOAD.SUPPORTS')}
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">{t('UPLOAD.SELECTED_FILES', { count: files.length })}</h4>
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
                    disabled={uploading}
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
            <div className="flex justify-between text-sm">
              <span>{t('UPLOAD.PROGRESS')}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Error Message */}
        {files.length > 0 && files.some(file => file.size > maxSizeMB * 1024 * 1024) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('UPLOAD.MAX_SIZE_WARNING')}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              files.length === 0 ||
              uploading ||
              (showStageSelect && !selectedStage) ||
              (showFileTypeSelect && !selectedFileDesign)
            }
          >
            {uploading ? t('COMMON.UPLOADING') : t('UPLOAD.BUTTON', { count: files.length, s: files.length !== 1 ? 's' : '' })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}