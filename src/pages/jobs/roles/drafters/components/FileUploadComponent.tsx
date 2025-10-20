import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Plus, File, Image, FileText, X } from 'lucide-react';
import { FileViewer } from './FileViewer';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface JobDetails {
  fabId: string;
  customer: string;
  jobNumber: string;
  area: string;
  fabType: string;
  slabSmithUsed: boolean;
}

interface SchedulingNote {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

interface FileUploadComponentProps {
  uploadedFiles: UploadedFile[];
  onFileUpload: (files: UploadedFile[]) => void;
  onRemoveFile: (index: number) => void;
  jobDetails?: JobDetails;
  schedulingNotes?: SchedulingNote[];
  onOpenFile?: (file: UploadedFile) => void;
}

export const FileUploadComponent = ({
  uploadedFiles,
  onFileUpload,
  onRemoveFile,
  jobDetails,
  schedulingNotes,
  onOpenFile
}: FileUploadComponentProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="w-6 h-6 text-blue-500" />;
    } else if (type === 'application/pdf') {
      return <FileText className="w-6 h-6 text-red-500" />;
    } else if (type.includes('dwg') || type.includes('cad')) {
      return <File className="w-6 h-6 text-green-500" />;
    }
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file)
    }));

    onFileUpload(newFiles);
  }, [onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Drop files here or click to browse</p>
          <input
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            id="file-upload"
            accept=".dwg,.pdf,.jpg,.jpeg,.png,.dxf,.step,.stp"
          />
          <label htmlFor="file-upload">
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Upload file
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadedFiles.map((file, index) => (
            <Card key={file.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onOpenFile ? onOpenFile(file) : setSelectedFile(file)}
                  >
                    Open file
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add More Files Button */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <CardContent className="p-8 text-center">
          <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Add more files</p>
          <input
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            id="add-more-files"
            accept=".dwg,.pdf,.jpg,.jpeg,.png,.dxf,.step,.stp"
          />
          <label htmlFor="add-more-files">
            <Button variant="outline" asChild>
              <span>
                <Plus className="w-4 h-4 mr-2" />
                Add files
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {/* File Viewer Modal */}
      {/* Fallback modal viewer when onOpenFile isn't provided */}
      {/* {selectedFile && !onOpenFile && jobDetails && schedulingNotes && (
        <FileViewer
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          file={selectedFile}
          jobDetails={jobDetails}
          schedulingNotes={schedulingNotes}
        />
      )} */}
    </div>
  );
};
