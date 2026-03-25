'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Camera, Image, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploaded_at: string;
}

interface OperatorQAUploadProps {
    operatorId: number;
    jobId: number;
    onUploadComplete?: (files: UploadedFile[]) => void;
    existingFiles?: UploadedFile[];
    disabled?: boolean;
}

export function OperatorQAUpload({ 
    operatorId, 
    jobId, 
    onUploadComplete,
    existingFiles = [],
    disabled = false 
}: OperatorQAUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingFiles);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
        if (type.startsWith('video/')) return <Camera className="w-5 h-5 text-red-500" />;
        return <FileText className="w-5 h-5 text-gray-500" />;
    };

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            
            // Validate files (max 50MB each)
            const validFiles = filesArray.filter(file => {
                if (file.size > 50 * 1024 * 1024) {
                    toast.error(`File "${file.name}" exceeds 50MB limit`);
                    return false;
                }
                return true;
            });

            setSelectedFiles(prev => [...prev, ...validFiles]);
            
            // Reset input
            e.target.value = '';
        }
    }, []);

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeUploadedFile = async (fileId: string) => {
        try {
            // TODO: Add delete API call
            setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
            toast.success('File deleted successfully');
        } catch (error) {
            toast.error('Failed to delete file');
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        
        try {
            const formData = new FormData();
            
            for (const file of selectedFiles) {
                formData.append('file', file);
            }
            
            formData.append('file_design', 'qa');
            formData.append('stage_name', 'qa');

            const response = await fetch(
                `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}/api/v1/operators/${operatorId}/jobs/${jobId}/upload`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                }
            );

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            
            // Handle different API response structures
            let newUploadedFiles: UploadedFile[] = [];
            
            if (result.data?.files && Array.isArray(result.data.files)) {
                // Response has files array
                newUploadedFiles = result.data.files.map((f: any) => ({
                    id: f.id || Date.now().toString(),
                    name: f.filename || f.file_name || f.name,
                    size: f.size || 0,
                    type: f.file_type || f.type || 'application/octet-stream',
                    url: f.url || f.file_url,
                    uploaded_at: f.created_at || new Date().toISOString()
                }));
            } else if (result.data && Array.isArray(result.data)) {
                // Response is directly an array
                newUploadedFiles = result.data.map((f: any) => ({
                    id: f.id || Date.now().toString(),
                    name: f.filename || f.file_name || f.name,
                    size: f.size || 0,
                    type: f.file_type || f.type || 'application/octet-stream',
                    url: f.url || f.file_url,
                    uploaded_at: f.created_at || new Date().toISOString()
                }));
            } else if (result.data) {
                // Single file response
                newUploadedFiles = [{
                    id: result.data.id || Date.now().toString(),
                    name: result.data.filename || result.data.file_name || result.data.name,
                    size: result.data.size || 0,
                    type: result.data.file_type || result.data.type || 'application/octet-stream',
                    url: result.data.url || result.data.file_url,
                    uploaded_at: result.data.created_at || new Date().toISOString()
                }];
            }
            
            setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
            setSelectedFiles([]);
            
            toast.success(`${selectedFiles.length} file(s) uploaded successfully`);
            onUploadComplete?.([...uploadedFiles, ...newUploadedFiles]);
            
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to upload files');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Section */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Upload QA Files</h3>
                        <label>
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*,.pdf,.doc,.docx"
                                onChange={handleFileSelect}
                                className="hidden"
                                capture="environment" // Opens camera on mobile
                            />
                            <Button
                                asChild
                                variant="outline"
                                className="cursor-pointer gap-2"
                                disabled={disabled || uploading}
                            >
                                <span>
                                    <Camera className="w-4 h-4" />
                                    {selectedFiles.length === 0 ? 'Take Photo / Upload' : `${selectedFiles.length} file(s) selected`}
                                </span>
                            </Button>
                        </label>
                    </div>

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Files to upload:</p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSelectedFiles([])}
                                        disabled={uploading}
                                    >
                                        Clear All
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center gap-3 p-2 border rounded bg-gray-50">
                                        {getFileIcon(file.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSelectedFile(index)}
                                            disabled={uploading}
                                            className="h-8 w-8 p-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="flex items-center gap-2 text-blue-600">
                            <AlertCircle className="w-4 h-4 animate-spin" />
                            <p className="text-sm">Uploading files...</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Uploaded Files Gallery */}
            {uploadedFiles.length > 0 && (
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            Uploaded Files ({uploadedFiles.length})
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {uploadedFiles.map((file) => (
                                <div key={file.id} className="border rounded-lg p-4 flex items-start gap-3 bg-gray-50">
                                    {getFileIcon(file.type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(file.uploaded_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeUploadedFile(file.id)}
                                        disabled={disabled}
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
