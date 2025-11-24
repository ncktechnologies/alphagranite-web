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
  total_sq_ft? :string;
  revenue?: string;
  revised?:string;
  sct_completed?:string
  draft_completed?:string
  gp?:string
  date: string; // e.g. "08 October, 2025"
  current_stage?: string; // Add current_stage field
  template_needed?: string; // Add template_not_needed field
review_completed?:string
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