// File labeling utilities for workflow stages and queues

export interface FileLabel {
  stage: string;
  label: string;
  color: string;
  bgColor: string;
}

// Workflow stage configurations
export const WORKFLOW_STAGES: Record<string, FileLabel> = {
  // Drafting related stages
  'drafting': {
    stage: 'drafting',
    label: 'Drafting',
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  },
  'drafting_uploads': {
    stage: 'drafting_uploads',
    label: 'Drafting Uploads',
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  },
  
  // Revision related stages
  'revisions': {
    stage: 'revisions',
    label: 'Revisions',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  },
  'revision_uploads': {
    stage: 'revision_uploads',
    label: 'Revision Uploads',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  },
  
  // Templating related stages
  'templating': {
    stage: 'templating',
    label: 'Templating',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  'templating_uploads': {
    stage: 'templating_uploads',
    label: 'Templating Uploads',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  
  // Pre-draft review stages
  'pre_draft_review': {
    stage: 'pre_draft_review',
    label: 'Pre-Draft Review',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100'
  },
  
  // Sales CT stages
  'sales_ct': {
    stage: 'sales_ct',
    label: 'Sales CT',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100'
  },
  'sct_uploads': {
    stage: 'sct_uploads',
    label: 'SCT Uploads',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100'
  },
  
  // Slab Smith stages
  'slab_smith': {
    stage: 'slab_smith',
    label: 'SlabSmith',
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  },
  'slab_smith_request': {
    stage: 'slab_smith_request',
    label: 'SlabSmith Request',
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  },
  
  // Final Programming/Cut List stages
  'cut_list': {
    stage: 'cut_list',
    label: 'Cut List',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  },
  'final_programming': {
    stage: 'final_programming',
    label: 'Final Programming',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  },
  
  // Cutting stages
  'cutting': {
    stage: 'cutting',
    label: 'Cutting',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100'
  },
  
  // General/default stage
  'general': {
    stage: 'general',
    label: 'General',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  }
};

// Function to determine file stage based on context
export const getFileStage = (
  fileName: string,
  context?: {
    currentStage?: string;
    fileType?: string;
    isRevision?: boolean;
    isDrafting?: boolean;
    isFinalProgramming?: boolean;
  }
): FileLabel => {
  // Priority 1: Context-based determination
  if (context?.currentStage && WORKFLOW_STAGES[context.currentStage]) {
    return WORKFLOW_STAGES[context.currentStage];
  }
  
  // Priority 2: File name pattern matching
  const lowerFileName = fileName?.toLowerCase();
  
  // Revision files
  if (lowerFileName?.includes('revision') || lowerFileName?.includes('rev') || context?.isRevision) {
    return WORKFLOW_STAGES.revision_uploads;
  }
  
  // Drafting files
  if (lowerFileName?.includes('drafting') || context?.isDrafting) {
    return WORKFLOW_STAGES.drafting_uploads;
  }
  
  // Templating files
  if (lowerFileName?.includes('template') || lowerFileName?.includes('templating')) {
    return WORKFLOW_STAGES.templating_uploads;
  }
  // Final Programming/Cut List files
  if (lowerFileName?.includes('cutlist') || lowerFileName?.includes('cut_list') || lowerFileName?.includes('final_programming') || context?.isFinalProgramming) {
    return WORKFLOW_STAGES.final_programming;
  }
  
  // Default to general
  return WORKFLOW_STAGES.general;
};

// Function to get stage badge component
export const getStageBadge = (fileLabel: FileLabel) => {
  return {
    label: fileLabel.label,
    className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${fileLabel.color} ${fileLabel.bgColor}`
  };
};

// Enhanced file metadata interface
export interface EnhancedFileMetadata {
  id: string | number;
  name: string;
  size: number;
  type: string;
  url?: string;
  stage: FileLabel;
  uploadedAt?: Date;
  uploadedBy?: string;
}