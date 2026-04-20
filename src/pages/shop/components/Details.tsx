// components/RoleDetailsView.tsx

import { useState } from 'react';
import { Station } from "@/config/types";
import { StationHeader } from "./StationHeader";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileGallery, type FileSource, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { FileViewer } from '@/pages/jobs/roles/drafters/components';
import { useGetFabByIdQuery } from '@/store/api/job';

interface RoleDetailsViewProps {
  role: Station;
  onEdit: (role: Station) => void;
  onDelete?: (role: Station) => void;
  onStatusChange?: () => void;

}

export const StationDetailsView = ({ role, onEdit, onDelete, onStatusChange }: RoleDetailsViewProps) => {
  const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

  // Get planning section name from the role data
  const rawRole = role as any;
  const planningSectionName = rawRole.planning_section_name || 'Not assigned';
  const operatorNames = rawRole.operators || [];
  const fabId = rawRole.fab_id;

  // Fetch FAB data to get files
  const { data: fabResponse } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const fabData = (fabResponse as any)?.data ?? fabResponse;

  // Build file sources from actual API shape (following sales Details.tsx pattern)
  const fileSources: FileSource[] = (() => {
    if (!fabData) return [];
    const sources: FileSource[] = [];

    const mapFiles = (files: any[], stage: string, uploadedBy?: string): UnifiedFile[] =>
      (files ?? []).map((f): UnifiedFile => ({
        id: String(f.id),
        name: f.name || f.filename || `File_${f.id}`,
        size: parseInt(f.file_size) || f.size || 0,
        type: f.file_type || f.mime_type || 'application/octet-stream',
        url: f.file_url || f.url || '',
        stage,
        uploadedBy,
        uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
        _raw: f,
      }));

    // Add FAB files from different stages
    const draftFiles = mapFiles(fabData.draft_data?.files ?? [], 'Drafting', fabData.draft_data?.drafter_name);
    if (draftFiles.length > 0) sources.push({ kind: 'raw', data: draftFiles });

    const slabFiles = mapFiles(fabData.slabsmith_data?.files ?? [], 'SlabSmith');
    if (slabFiles.length > 0) sources.push({ kind: 'raw', data: slabFiles });

    const salesCtFiles = mapFiles(fabData.sales_ct_data?.files ?? [], 'Sales CT');
    if (salesCtFiles.length > 0) sources.push({ kind: 'raw', data: salesCtFiles });

    const cncFiles = mapFiles(fab.cnc_data?.files ?? [], 'CNC');
    if (cncFiles.length > 0) sources.push({ kind: 'raw', data: cncFiles });

    const topFiles = mapFiles(fabData.files ?? [], 'General');
    if (topFiles.length > 0) sources.push({ kind: 'raw', data: topFiles });

    return sources;
  })();

  const totalFileCount = fileSources.reduce((sum, s) => sum + (s.kind === 'raw' ? s.data.length : 0), 0);

  const handleFileClick = (file: UnifiedFile) => setActiveFile(file);

  // Show full-screen file viewer if a file is selected
  if (activeFile) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StationHeader role={role} onEdit={onEdit} onStatusChange={onStatusChange} />
      {/* <UsersSection /> */}
      <div className="grid grid-cols-2 gap-[14px] rounded-[8px] bg-[#FAFAFA] p-8 space-y-10">
        <div>
          <h4 className="text-secondary font-semibold text-sm pb-2.5">Workstation Name</h4>
          <h2 className="text-black leading-6 font-semibold ">{role.workstationName}</h2>
        </div>

        <div>
          <h4 className="text-secondary font-semibold text-sm pb-2.5">Shop Activity</h4>
          <h2 className="text-black leading-6 font-semibold ">{planningSectionName}</h2>
        </div>
        <div>
          <h4 className="text-secondary font-semibold text-sm pb-2.5">Assigned Operators</h4>
          <h2 className="text-black leading-6 font-semibold ">{Array.isArray(operatorNames) ? operatorNames.join(', ') : operatorNames || '-'}</h2>
        </div>
        <div>
          <h4 className="text-secondary font-semibold text-sm pb-2.5">Other</h4>
          <h2 className="text-black leading-6 font-semibold ">{role.other || '-'}</h2>
        </div>
      </div>

      {/* FAB Files Card */}
      {fabId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
              FAB Files
              {totalFileCount > 0 && (
                <span className="ml-2 text-base font-normal text-gray-400">
                  ({totalFileCount})
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-[#4B5563]">
              Drafting, SlabSmith, and all other files for this fabrication
            </p>
          </CardHeader>
          <CardContent>
            <FileGallery
              sources={fileSources}
              onFileClick={handleFileClick}
              defaultLayout="card"
              emptyMessage="No files have been uploaded for this FAB yet."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
