// src/pages/jobs/components/job.ts
export interface IJob {
  id: number;
  fab_type: string;
  fab_id: string;
  job_name: string;
  job_no: string;
  acct_name?: string;
  template_schedule?: string;
  template_received?: string;
  templater?: string;
  no_of_pieces?: string;
  total_sq_ft?: string;
  revenue?: string;
  revised?: string;
  revisor?: string;
  revision_completed?: string;
  revision_number?: string;
  revision_reason?: string;
  revision_type?: string;
  sct_completed?: string;
  draft_completed?: string;
  drafter?: string; // Add drafter field
  slabsmith_completed?: string; // Add slabsmith completed field
  slabsmith_clock_complete?: string; // Add slabsmith clock complete field
  slabsmith_used?: string; // Add slabsmith used field
  draft_revision_notes?: string; // Add draft/revision notes field
  draft_notes?: string; // Add draft notes field
  file?: string; // Add file field
  gp?: string;
  date: string; // e.g. "08 October, 2025"
  current_stage?: string; // Add current_stage field
  template_needed?: string; // Add template_not_needed field
  review_completed?: string;
  templating_schedule_start_date?: string;
  sales_person_name?: string; // Add sales person name field
  notes_count?: number; // Number of notes for this FAB
  fab_notes?: Array<{ id: number; note: string; created_by_name?: string; created_at?: string; stage?: string }>; // Array of notes for this FAB
  notes?: Array<{ id: number; note: string; created_by_name?: string; created_at?: string; stage?: string }>; // Alternative notes array name
  
  // ========== MATERIAL SPECIFICATION FIELDS ==========
  stone_type_name?: string;
  stone_color_name?: string;
  stone_thickness_value?: string;
  edge_name?: string;
  
  // ========== ADDITIONAL FAB DETAILS ==========
  input_area?: string;
  account_id?: number;
  account_name?: string;
  job_id?: number;
  job_details?: {
    job_number: string;
    description?: string;
    start_date?: string;
    status_id?: number;
    created_by?: number;
    created_at?: string;
    account_id?: number;
    priority?: string;
    name: string;
    due_date?: string;
    project_value?: number;
    sales_person_id?: number | null;
    updated_at?: string;
    updated_by?: number;
    id: number;
  };
  
  templating_notes?: string[];
  technician_name?: string;
  drafter_name?: string;
  drafter_assigned_by_name?: string;
  sales_ct_data?: any;
  is_complete?: boolean;
  
  // ========== SCHEDULING & PROCESS FIELDS ==========
  installation_date?: string | null;
  confirmed_date?: string | null;
  shop_date_schedule?: string | null;
  templating_schedule_due_date?: string;
  drafting_needed?: boolean;
  slab_smith_cust_needed?: boolean;
  slab_smith_ag_needed?: boolean;
  sct_needed?: boolean;
  final_programming_needed?: boolean;
  template_review_complete?: boolean;
  cad_review_complete?: boolean;
  final_programming_complete?: boolean;
  slab_smith_used?: boolean;
  
  // ========== MEASUREMENT FIELDS ==========
  wj_linft?: string | null;
  edging_linft?: string | null;
  cnc_linft?: string | null;
  miter_linft?: string | null;
  wj_time_minutes?: string | null;
  final_programming_completed?: string;
  final_programmer?: string;
  shop_date_scheduled?: string;
  
  // ========== ASSIGNMENT FIELDS ==========
  sales_person_id?: number;
  stone_type_id?: number;
  stone_color_id?: number;
  stone_thickness_id?: number;
  edge_id?: number;
  drafter_id?: number | null;
  drafter_assigned_by?: number | null;
  drafter_assigned_at?: string | null;
  
  // ========== STATUS FLAGS ==========
  status_id?: number;
  next_stage?: string;
  is_completed?: boolean;
  fp_not_needed?: boolean;
  // template_received?: boolean;
  // revised?: boolean;
  draft_data?: any;
  
  // ========== AUDIT FIELDS ==========
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  created_by_name?: string;
  updated_by_name?: string;
}


export interface SchedulingNote {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

export interface JobDetails {
  fabId: string;
  customer: string;
  jobNumber: string;
  area: string;
  fabType: string;
  slabSmithUsed: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface FileViewerProps {
  // When inline is true, renders without Dialog wrapper
  inline?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  file: UploadedFile;
  
}


 export const jobDetails: JobDetails = {
    fabId: '44567',
    customer: 'Johnson Kitchen & Bath',
    jobNumber: '99999',
    area: '2847 Sq Ft',
    fabType: 'Standard',
    slabSmithUsed: false
  };

  export const schedulingNotes: SchedulingNote[] = [
    {
      id: '1',
      author: 'Sarah Chen',
      avatar: 'S',
      content: 'Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      author: 'Mike Johnson',
      avatar: 'M',
      content: 'Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation',
      timestamp: '1 hour ago'
    }
  ];