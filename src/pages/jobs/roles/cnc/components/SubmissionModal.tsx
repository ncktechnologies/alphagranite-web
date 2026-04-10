// CNCTSubmissionModal.tsx - Updated for CNC submission
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUpdateCNCDraftingMutation, useManageCNCSessionMutation } from '@/store/api/job';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { Can } from '@/components/permission';
import { useNavigate } from 'react-router';

// Helper function to format timestamp without 'Z'
const formatTimestamp = (date: Date) => {
  return date.toISOString().slice(0, -1);
};

const submissionSchema = z.object({
  totalSqFt: z
  .string()
  .min(1, 'Total Sq Ft is required')
  .trim(),
  numberOfPieces: z.string().optional(),
  draftNotes: z.string().optional(),
  mentions: z.string().optional(),
  workPercentage: z.string().optional(),
});

type SubmissionData = z.infer<typeof submissionSchema>;

interface UploadedFile {
  id: string | number;
  name: string;
  url?: string;
  file?: File;
}

interface SubmissionModalProps {
  open: boolean;
  onClose: (success?: boolean) => void;
  cnc: any; // Changed from drafting to cnc
  uploadedFiles: UploadedFile[];
  fabId: number;
  userId: number;
  fabData?: any;
}

export const SubmissionModal = ({ 
  open, 
  onClose, 
  cnc, // Changed from drafting to cnc
  uploadedFiles, 
  fabId, 
  userId, 
  fabData 
}: SubmissionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);

  const [updateCNCDrafting] = useUpdateCNCDraftingMutation();
  const [manageCNCSession] = useManageCNCSessionMutation();

  const { data: employeesData } = useGetSalesPersonsQuery();
  const salesPersons = Array.isArray(employeesData) ? employeesData : [];

  const navigate = useNavigate();

  // Function to extract session timing data
  const extractSessionData = (sessionResponse: any) => {
    if (!sessionResponse?.data) return null;
    
    const { notes, total_time_spent, current_session_start_time, last_action_time } = sessionResponse.data;
    
    // Find start and end dates from notes
    const startNote = notes.find((note: any) => note.action === 'start');
    const endNote = notes.find((note: any) => note.action === 'end');
    
    return {
      drafter_start_date: startNote?.timestamp || current_session_start_time,
      drafter_end_date: endNote?.timestamp || last_action_time,
      total_hours_drafted: total_time_spent || 0,
      total_time_spent: total_time_spent || 0,
      work_percentage_done: sessionResponse.data.work_percentage_done || 0,
      cumulative_sqft_drafted: sessionResponse.data.cumulative_sqft_drafted || "0",
    };
  };

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      totalSqFt: '',
      numberOfPieces: '',
      draftNotes: '',
      mentions: '', // Sales person will be auto-populated by useEffect
      workPercentage: '',
    }
  });

  // Auto-populate salesperson when fabData changes
  useEffect(() => {
    if (fabData?.sales_person_id) {
      form.setValue('mentions', String(fabData.sales_person_id));
    }
  }, [fabData?.sales_person_id, form]);

 
  // End the CNC session and get session data
  const endCNCSession = async () => {
    if (!fabId) {
      toast.error('Fab ID is required to end session');
      return null;
    }

    try {
      const sessionResponse = await manageCNCSession({
        fab_id: fabId,
        data: {
          action: 'end',
          drafter_id: userId,
          timestamp: formatTimestamp(new Date()),
          note: 'CNC completed and session ended'
        }
      }).unwrap();

      console.log('CNC Session ended successfully:', sessionResponse);
      
      // Extract session data for later use
      const extractedData = extractSessionData(sessionResponse);
      setSessionData(extractedData);
      
      return sessionResponse;
    } catch (error: any) {
      console.error('Failed to end CNC session:', error);
      toast.error(error?.data?.message || 'Failed to end CNC session');
      return null;
    }
  };

  const handleFinalSubmit = async (values: SubmissionData) => {
    let cncId = cnc?.id ?? cnc?.data?.id;
    
    if (!cncId) {
      console.error('CNC record does not exist. Please assign CNC operator first.');
      toast.error('CNC assignment not found. Please assign a CNC operator first.');
      return;
    }

    if (!isConfirmed) {
      console.error('Please confirm the CNC is completed by checking the box.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: First end the CNC session and get session data
      const sessionResponse = await endCNCSession();
      
      if (!sessionResponse) {
        throw new Error('Failed to end CNC session');
      }

      // Extract session timing data
      const sessionTimingData = extractSessionData(sessionResponse);
      
      // Step 2: Update CNC with form data AND session timing data
      const payload: any = {
        // Session timing data from ended session
        drafter_start_date: sessionTimingData?.drafter_start_date || null,
        drafter_end_date: sessionTimingData?.drafter_end_date || null,
        total_hours_drafted: sessionTimingData?.total_hours_drafted || null,
        
        // Form data
        total_sqft_drafted: values.totalSqFt || sessionTimingData?.cumulative_sqft_drafted || null,
        no_of_piece_drafted: values.numberOfPieces || null,
        draft_note: values.draftNotes || null,
        mentions: values.mentions || null,
        is_completed: true,
        status_id: 1
      };

      
      console.log('Updating CNC with payload:', payload);
      await updateCNCDrafting({ 
        id: cncId, 
        data: payload 
      }).unwrap();

      toast.success('CNC submitted successfully');
      onClose(true);
      navigate('/job/cnc');
    } catch (err: any) {
      console.error('Failed to submit CNC:', err);
      toast.error(err?.data?.message || 'Failed to submit CNC');
      onClose(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="border-b">
            <DialogTitle className="text-[15px] font-semibold py-2">
              Submit CNC
              <span className="ml-3 text-sm font-normal text-gray-500">
                FAB ID: {fabId}
              </span>
            </DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-6 p-4">
            <FormField
              control={form.control}
              name="totalSqFt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Sq Ft</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter total square feet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name="numberOfPieces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No. of pieces</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter number of pieces" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            <FormField
              control={form.control}
              name="draftNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mentions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notify sales</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || (fabData?.sales_person_id ? String(fabData.sales_person_id) : '')}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salesPersons.map((person: any) => (
                        <SelectItem key={person.id} value={`${person.id}`}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

          

            <div className="flex flex-row items-center space-x-3 mt-4">
              <Checkbox
                checked={isConfirmed}
                onCheckedChange={(v) => setIsConfirmed(Boolean(v))}
                disabled={false}
              />
              <label className={`font-semibold text-[16px] ${isConfirmed ? 'text-green-600' : 'text-gray-600'}`}>
               CNC Programming Complete
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onClose(false)}>
                Cancel
              </Button>

              <Can action="update" on="CNC">
                <Button 
                  type="submit" 
                  disabled={!isConfirmed || isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit CNC'}
                </Button>
              </Can>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};