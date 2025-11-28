import { useState, useEffect } from 'react';
import { 
  useCreateSalesCTMutation, 
  useUpdateSCTReviewMutation, 
  useUpdateSCTRevisionMutation,
  useGetSalesCTByFabIdQuery 
} from '@/store/api/job';
import { toast } from 'sonner';

interface SCTHookProps {
  fabId: number;
}

interface CreateSCTData {
  fab_id: number;
  is_revision_needed?: boolean;
  notes?: string;
}

interface UpdateSCTReviewData {
  sct_completed: boolean;
  notes?: string;
}

interface UpdateSCTRevisionData {
  is_revision_completed: boolean;
  draft_note?: string;
  revision_type?: string;
}

export const useSCTService = ({ fabId }: SCTHookProps) => {
  // SCT queries and mutations
  const { data: sctData, isLoading: isSctLoading, isError: isSctError, refetch } = useGetSalesCTByFabIdQuery(fabId, { skip: !fabId });
  const [createSalesCT, { isLoading: isCreating }] = useCreateSalesCTMutation();
  const [updateSCTReview, { isLoading: isUpdatingReview }] = useUpdateSCTReviewMutation();
  const [updateSCTRevision, { isLoading: isUpdatingRevision }] = useUpdateSCTRevisionMutation();
  
  // State to track if we've attempted to create an SCT
  const [hasAttemptedCreation, setHasAttemptedCreation] = useState(false);
  // State to track if creation failed
  const [creationFailed, setCreationFailed] = useState(false);

  // Create SCT if it doesn't exist
  useEffect(() => {
    // Only attempt creation if:
    // 1. We have a fabId
    // 2. We haven't already attempted creation
    // 3. We're not currently loading
    // 4. Either there's no SCT data OR there was an error fetching SCT data
    if (fabId && !hasAttemptedCreation && !isSctLoading && (!sctData || isSctError)) {
      setHasAttemptedCreation(true);
      handleCreateSCT({
        fab_id: fabId,
        notes: "Sales check task created"
      }).catch((error) => {
        // Track creation failure
        setCreationFailed(true);
        // Silently handle SCT creation errors to prevent UI blocking
        console.warn("Failed to auto-create SCT:", error);
      });
    }
  }, [fabId, sctData, isSctLoading, isSctError, hasAttemptedCreation]);

  const handleCreateSCT = async (data: CreateSCTData) => {
    try {
      const result = await createSalesCT(data).unwrap();
      toast.success("Sales Check Task created successfully");
      // Reset creation failure state on success
      setCreationFailed(false);
      return result;
    } catch (error) {
      console.error("Failed to create SCT:", error);
      toast.error("Failed to create Sales Check Task");
      throw error;
    }
  };

  const handleUpdateSCTReview = async (data: UpdateSCTReviewData) => {
    try {
      if (!fabId) throw new Error("FAB ID is required");
      
      const result = await updateSCTReview({
        fab_id: fabId,
        data
      }).unwrap();
      
      toast.success("Sales Check Task updated successfully");
      return result;
    } catch (error) {
      console.error("Failed to update SCT review:", error);
      toast.error("Failed to update Sales Check Task");
      throw error;
    }
  };

  const handleUpdateSCTRevision = async (sctId: number, data: UpdateSCTRevisionData) => {
    try {
      const result = await updateSCTRevision({
        sct_id: sctId,
        data
      }).unwrap();
      
      toast.success("Revision request sent successfully");
      return result;
    } catch (error) {
      console.error("Failed to update SCT revision:", error);
      toast.error("Failed to send revision request");
      throw error;
    }
  };

  return {
    // Data
    sctData,
    isSctLoading,
    isSctError,
    creationFailed,
    
    // Mutations
    isCreating,
    isUpdatingReview,
    isUpdatingRevision,
    
    // Functions
    handleCreateSCT,
    handleUpdateSCTReview,
    handleUpdateSCTRevision,
    refetchSCT: refetch
  };
};