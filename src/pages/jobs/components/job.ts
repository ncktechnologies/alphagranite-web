// src/pages/jobs/components/job.ts
export interface IJob {
  id: number;
  fab_type: string;
  fab_id: string;
  job_name: string;
  job_no: string;
  acct_name: string;
  template_schedule: string;
  template_received: string;
  templater: string;
  date: string; // e.g. "08 October, 2025"
}
