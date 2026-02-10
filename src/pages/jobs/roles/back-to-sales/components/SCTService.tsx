import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useCreateSalesCTMutation,
  useUpdateSCTReviewMutation,
  useUpdateSCTRevisionMutation,
  useGetSalesCTByFabIdQuery
} from '@/store/api/job';
import { toast } from 'sonner';

interface SCTHookProps {
  fabId: number;
  skip?: boolean;
}

interface CreateSCTData {
  fab_id: number;
  is_revision_needed?: boolean;
  notes?: string;
}

interface UpdateSCTReviewData {
  sct_completed: boolean;
  revenue?: number;
  slab_smith_used?: boolean;
  notes?: string;
  slab_smith_approved?: boolean;
  block_drawing_approved?: boolean;
}

interface UpdateSCTRevisionData {
  is_revision_completed: boolean;
  draft_note?: string;
  revision_type?: string;
}

// DEBUG: Add logging
let renderCount = 0;

export const useSCTService = ({ fabId, skip = false }: SCTHookProps) => {
  renderCount++;

  // SCT queries and mutations
  const {
    data: sctResponse,
    isLoading: isSctLoading,
    isError: isSctError,
    refetch
  } = useGetSalesCTByFabIdQuery(fabId, {
    skip: !fabId || skip,
    refetchOnMountOrArgChange: false
  });

  // Extract the actual data from the response
  const sctData = sctResponse?.data;


  const [createSalesCT, { isLoading: isCreating }] = useCreateSalesCTMutation();
  const [updateSCTReview, { isLoading: isUpdatingReview }] = useUpdateSCTReviewMutation();
  const [updateSCTRevision, { isLoading: isUpdatingRevision }] = useUpdateSCTRevisionMutation();

  // Track creation attempts
  const creationAttemptedRef = useRef<number | null>(null);

  // Create SCT if it doesn't exist
  useEffect(() => {


    // Early returns
    if (!fabId || skip || isSctLoading) return;

    // Don't create if we already attempted for this fabId
    if (creationAttemptedRef.current === fabId) {
      return;
    }

    // Only create if we have NO data
    if (!sctData) {
      creationAttemptedRef.current = fabId;

      createSalesCT({
        fab_id: fabId,
        notes: "Sales check task created",
        is_revision_needed: false,
      })
        .unwrap()
        .then((result) => {
          // Refetch to get the new data
          refetch();
        })
        .catch((error) => {
          // Reset so we can retry
          creationAttemptedRef.current = null;
        });
    } else {
      // Track that we've seen this fabId has data
      creationAttemptedRef.current = fabId;
    }
  }, [fabId, skip, isSctLoading, sctData, createSalesCT, refetch]);

  const handleCreateSCT = useCallback(async (data: CreateSCTData) => {
    try {
      const result = await createSalesCT(data).unwrap();
      await refetch();
      return result;
    } catch (error) {
      console.error("Failed to create SCT:", error);
      throw error;
    }
  }, [createSalesCT, refetch]);

  const handleUpdateSCTReview = useCallback(async (data: UpdateSCTReviewData) => {
    try {
      if (!fabId) throw new Error("FAB ID is required");

      const result = await updateSCTReview({
        fab_id: fabId,
        data
      }).unwrap();

      toast.success("Sales Check Task updated successfully");
      return result;
    } catch (error) {
      toast.error("Failed to update Sales Check Task");
      throw error;
    }
  }, [fabId, updateSCTReview]);

  const handleUpdateSCTRevision = useCallback(async (sctId: number, data: UpdateSCTRevisionData) => {
    try {
      const result = await updateSCTRevision({
        sct_id: sctId,
        data
      }).unwrap();

      toast.success("Revision request sent successfully");
      return result;
    } catch (error) {
      toast.error("Failed to send revision request");
      throw error;
    }
  }, [updateSCTRevision]);

  // Memoize the return value to prevent unnecessary re-renders
  const result = useMemo(() => ({
    // Data - return both the response and the extracted data for compatibility
    sctData,
    sctResponse,
    isSctLoading,
    isSctError,

    // Mutations
    isCreating,
    isUpdatingReview,
    isUpdatingRevision,

    // Functions
    handleCreateSCT,
    handleUpdateSCTReview,
    handleUpdateSCTRevision,
    refetchSCT: refetch,
  }), [
    sctData,
    sctResponse,
    isSctLoading,
    isSctError,
    isCreating,
    isUpdatingReview,
    isUpdatingRevision,
    handleCreateSCT,
    handleUpdateSCTReview,
    handleUpdateSCTRevision,
    refetch,
  ]);

  return result;
};