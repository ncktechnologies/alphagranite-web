import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { X } from 'lucide-react';

interface JobDetails {
  fabId: string;
  customer: string;
  jobNumber: string;
  area: string;
  fabType: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface SubmissionModalProps {
  jobDetails: JobDetails;
  totalTime: number;
  uploadedFiles: UploadedFile[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const submissionSchema = z.object({
  totalSqFt: z.string().min(1, 'Total Sq Ft is required'),
  numberOfPieces: z.string().min(1, 'Number of pieces is required'),
  draftNotes: z.string().optional(),
  assignToSales: z.string().min(1, 'Sales person is required'),
  templateReviewComplete: z.boolean(),
});

type SubmissionData = z.infer<typeof submissionSchema>;

export const SubmissionModal = ({
  jobDetails,
  totalTime,
  uploadedFiles,
  onClose,
  onSubmit
}: SubmissionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      totalSqFt: '',
      numberOfPieces: '',
      draftNotes: '',
      assignToSales: '',
      templateReviewComplete: false,
    },
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const salesPersons = [
    'Mike Rodriguez',
    'Sarah Johnson',
    'Bruno Pires',
    'Maria Garcia'
  ];

  const handleSubmit = async (values: SubmissionData) => {
    try {
      setIsSubmitting(true);
      
      const submissionData = {
        ...values,
        jobDetails,
        totalTime,
        uploadedFiles,
        submittedAt: new Date().toISOString(),
      };

      console.log('Submitting draft:', submissionData);
      
      // Simulate API call
      await new Promise((res) => setTimeout(res, 2000));
      
      onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className=''>
          <div className="border-b">
            <DialogTitle className="text-[15px] font-semibold py-2">Draft</DialogTitle>
            {/* <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button> */}
          </div>
          <div className="space-y-1 mt-2">
            <p className="font-semibold text-black leading-4">FAB-2024-0845</p>
            <p className="text-sm text-black">Conference Table - Quartz</p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Job Details */}
            {/* <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-500">Customer:</Label>
                <p className="text-sm text-gray-900">{jobDetails.customer}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Job #:</Label>
                <p className="text-sm text-gray-900">{jobDetails.jobNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Area:</Label>
                <p className="text-sm text-gray-900">{jobDetails.area}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">FAB Type:</Label>
                <Badge variant="outline">{jobDetails.fabType}</Badge>
              </div>
            </div> */}

            {/* Form Fields */}
            <div className="pt-3 space-y-4">
              <FormField
                control={form.control}
                name="totalSqFt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Sq Ft</FormLabel>
                    <FormControl>
                      <Input placeholder="(1)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberOfPieces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. of pieces</FormLabel>
                    <FormControl>
                      <Input placeholder="5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Time Tracking Display */}
            {/* <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Time Tracking:</Label>
                  <p className="text-lg font-mono text-green-700">{formatDuration(totalTime)}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm">
                    Pause
                  </Button>
                  <Button type="button" variant="destructive" size="sm">
                    End
                  </Button>
                </div>
              </div>
            </div> */}

            {/* Draft Notes */}
            <FormField
              control={form.control}
              name="draftNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Draft notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Square-foot bigger than what was templated initially."
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assign to Sales */}
            <FormField
              control={form.control}
              name="assignToSales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to sales</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salesPersons.map((person) => (
                        <SelectItem key={person} value={person}>
                          {person}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Review Complete Checkbox */}
            <FormField
              control={form.control}
              name="templateReviewComplete"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Template review complete</FormLabel>
                </FormItem>
              )}
            />

            {/* Uploaded Files Summary */}
            {uploadedFiles.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Uploaded Files ({uploadedFiles.length})
                </Label>
                <div className="space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      • {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit draft'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
