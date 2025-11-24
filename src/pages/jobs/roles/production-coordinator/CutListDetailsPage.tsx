import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate, useParams } from 'react-router';
import { useGetFabByIdQuery, useUpdateFabMutation } from '@/store/api/job';
import { toast } from 'sonner';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';

const CutListDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const fabId = id ? parseInt(id) : 0;
    const navigate = useNavigate();
    
    const { data: fabData, isLoading } = useGetFabByIdQuery(fabId, { skip: !fabId });
    const [updateFab] = useUpdateFabMutation();
    
    const [scheduledDate, setScheduledDate] = useState('');
    const [notes, setNotes] = useState('');
    
    if (isLoading) {
        return <div>Loading...</div>;
    }
    
    const handleSave = async () => {
        try {
            await updateFab({
                id: fabId,
                data: {
                    notes: [notes], // Notes must be an array
                }
            }).unwrap();
            
            toast.success('Cut list details updated successfully');
            navigate('/job/cut-list');
        } catch (error) {
            console.error('Error updating cut list:', error);
            toast.error('Failed to update cut list details');
        }
    };
    
    const handleCancel = () => {
        navigate('/job/cut-list');
    };
    
    return (
        <>
            <Container className='lg:mx-0'>
                <Toolbar className=' '>
                    <ToolbarHeading title={`Cut List - FAB ID: ${fabData?.id || 'Loading...'}`} description="Update cut list scheduling details" />
                </Toolbar>
            </Container>
            
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cut List Details</CardTitle>
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
                                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                                <Input 
                                    id="scheduledDate" 
                                    type="date" 
                                    value={scheduledDate} 
                                    onChange={(e) => setScheduledDate(e.target.value)} 
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea 
                                    id="notes" 
                                    value={notes} 
                                    onChange={(e) => setNotes(e.target.value)} 
                                    placeholder="Add notes about the scheduling..."
                                    rows={4}
                                />
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

export default CutListDetailsPage;