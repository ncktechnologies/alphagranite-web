import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { toast } from 'sonner';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { FileUploadComponent } from '@/pages/jobs/roles/drafters/components/FileUploadComponent';

const FinalProgrammingDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const fabId = id ? parseInt(id) : 0;
    const navigate = useNavigate();
    
    const { data: fabData, isLoading } = useGetFabByIdQuery(fabId, { skip: !fabId });
    
    const [programmingNotes, setProgrammingNotes] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    
    if (isLoading) {
        return <div>Loading...</div>;
    }
    
    const handleFileUpload = (uploadedFiles: File[]) => {
        setFiles(uploadedFiles);
        toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    };
    
    const handleSave = async () => {
        try {
            // Here you would typically call an API to save the final programming details
            // For now, we'll just show a success message
            toast.success('Final programming details updated successfully');
            navigate('/job/final-programming');
        } catch (error) {
            console.error('Error updating final programming:', error);
            toast.error('Failed to update final programming details');
        }
    };
    
    const handleCancel = () => {
        navigate('/job/final-programming');
    };
    
    return (
        <>
            <Container className='lg:mx-0'>
                <Toolbar className=' '>
                    <ToolbarHeading title={`Final Programming - FAB ID: ${fabData?.id || 'Loading...'}`} description="Manage final CNC programming files and details" />
                </Toolbar>
            </Container>
            
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Final Programming Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fabId">FAB ID</Label>
                                    <Input id="fabId" value={fabData?.id || ''} disabled />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="jobName">Job Name</Label>
                                    <Input id="jobName" value={fabData?.job_details?.name || ''} disabled />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="fabType">FAB Type</Label>
                                    <Input id="fabType" value={fabData?.fab_type || ''} disabled />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="totalSqFt">Total Sq Ft</Label>
                                    <Input id="totalSqFt" value={fabData?.total_sqft || ''} disabled />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="programmingStatus">Programming Status</Label>
                                <Input 
                                    id="programmingStatus" 
                                    value="In Progress" 
                                    disabled 
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="programmingNotes">Programming Notes</Label>
                                <Textarea 
                                    id="programmingNotes" 
                                    value={programmingNotes} 
                                    onChange={(e) => setProgrammingNotes(e.target.value)} 
                                    placeholder="Add notes about the programming process..."
                                    rows={4}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Upload CNC Files</Label>
                                <FileUploadComponent onFilesChange={handleFileUpload} />
                                {files.length > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        {files.length} file(s) ready to upload
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button className="w-full" onClick={handleSave}>
                                Save Changes
                            </Button>
                            <Button variant="outline" className="w-full" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Job Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <Label className="text-muted-foreground">Customer:</Label>
                                <p>{fabData?.job_details?.name || 'N/A'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Area:</Label>
                                <p>{fabData?.input_area || 'N/A'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Material:</Label>
                                <p>{`${fabData?.stone_type_name || ''} ${fabData?.stone_color_name || ''} - ${fabData?.stone_thickness_value || ''}`}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default FinalProgrammingDetailsPage;