// file-labeling.ts

export interface FileLabel {
  stage: string;
  label: string;
  color: string;
  bgColor: string;
}

export const WORKFLOW_STAGES: Record<string, FileLabel> = {
  'drafting': { stage: 'drafting', label: 'Drafting', color: 'text-green-700', bgColor: 'bg-green-100' },
  // 'drafting_uploads': { stage: 'drafting_uploads', label: 'Drafting Uploads', color: 'text-green-700', bgColor: 'bg-green-100' },
  'revision': { stage: 'revision', label: 'Revisions', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'templating': { stage: 'templating', label: 'Templating', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'pre_draft_review': { stage: 'pre_draft_review', label: 'Pre-Draft Review', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  'sales_ct': { stage: 'sales_ct', label: 'Sales CT', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  'slab_smith': { stage: 'slab_smith', label: 'SlabSmith', color: 'text-red-700', bgColor: 'bg-red-100' },
  'slab_smith_request': { stage: 'slab_smith_request', label: 'SlabSmith Request', color: 'text-red-700', bgColor: 'bg-red-100' },
  'cut_list': { stage: 'cut_list', label: 'Cut List', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'final_programming': { stage: 'final_programming', label: 'Final Programming', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'cnc': { stage: 'cnc', label: 'CNC', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  'cutting': { stage: 'cutting', label: 'Cutting', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  // 'general': { stage: 'general', label: 'General', color: 'text-gray-700', bgColor: 'bg-gray-100' }
};

// Safe badge getter – returns a fallback if fileLabel is undefined
export const getStageBadge = (fileLabel?: FileLabel) => {
  if (!fileLabel) {
    return {
      label: 'Unknown',
      className: 'bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded'
    };
  }
  return {
    label: fileLabel.label,
    className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${fileLabel.color} ${fileLabel.bgColor}`
  };
};

// Normalise any stage string (case‑insensitive, spaces→underscores)
export const normalizeStageKey = (raw?: string): string => {
  return raw?.toLowerCase().replace(/\s+/g, '_') ?? 'general';
};

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
  // 1. Use context if provided and valid
  if (context?.currentStage && WORKFLOW_STAGES[normalizeStageKey(context.currentStage)]) {
    return WORKFLOW_STAGES[normalizeStageKey(context.currentStage)];
  }

  const lowerFileName = fileName?.toLowerCase() || '';

  // 2. Filename patterns
  if (lowerFileName.includes('revision') || lowerFileName.includes('rev') || context?.isRevision)
    return WORKFLOW_STAGES.revision_uploads;
  if (lowerFileName.includes('drafting') || context?.isDrafting)
    return WORKFLOW_STAGES.drafting_uploads;
  if (lowerFileName.includes('template') || lowerFileName.includes('templating'))
    return WORKFLOW_STAGES.templating_uploads;
  if (lowerFileName.includes('final_programming') || context?.isFinalProgramming)
    return WORKFLOW_STAGES.final_programming;
  if (lowerFileName.includes('cutlist') || lowerFileName.includes('cut_list'))
    return WORKFLOW_STAGES.final_programming;
  if (lowerFileName.includes('slab_smith'))
    return WORKFLOW_STAGES.slab_smith;
  if (lowerFileName.includes('cnc') || context?.currentStage === 'cnc')
    return WORKFLOW_STAGES.cnc_uploads;

  return WORKFLOW_STAGES.general;
};