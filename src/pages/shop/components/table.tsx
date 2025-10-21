'use client';

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { GenericTable } from '@/partials/datagrid/GenericTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface Shop {
  id: string;
  fab_type: string;
  fab_id: string;
  job_no: string;
  no_of_pieces: number;
  total_sq_ft: number;
  confirmed: string;
  revenue: number;
  gp: number;
  fp_complete: string;
}

interface ShopTableProps {
  cuttingPlanData: Shop[];
  assemblyData: Shop[];
  installationData: Shop[];
}

export default function ShopTable({
  cuttingPlanData,
  assemblyData,
  installationData,
}: ShopTableProps) {
  const [activeTab, setActiveTab] = useState('cutting-plan');
  const [searchQuery, setSearchQuery] = useState('');
  const [fabTypeFilter, setFabTypeFilter] = useState('');
  const [salesPerson, setSalesPerson] = useState('');

  const currentData =
    activeTab === 'cutting-plan'
      ? cuttingPlanData
      : activeTab === 'assembly'
      ? assemblyData
      : installationData;

  const filteredData = useMemo(() => {
    return currentData.filter((item) => {
      const matchesSearch =
        item.job_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fab_id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFabType = fabTypeFilter
        ? item.fab_type === fabTypeFilter
        : true;

      const matchesSales = salesPerson
        ? item.confirmed === salesPerson
        : true;

      return matchesSearch && matchesFabType && matchesSales;
    });
  }, [searchQuery, fabTypeFilter, salesPerson, currentData]);

  const columns: ColumnDef<Shop>[] = [
    {
      accessorKey: 'fab_type',
      header: 'FAB TYPE',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.fab_type}</span>
          {row.original.fab_type === 'Standard' && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              New
            </Badge>
          )}
        </div>
      ),
    },
    { accessorKey: 'fab_id', header: 'FAB ID' },
    { accessorKey: 'job_no', header: 'JOB NO' },
    { accessorKey: 'no_of_pieces', header: 'NO. OF PIECES' },
    { accessorKey: 'total_sq_ft', header: 'TOTAL SQ FT' },
    {
      accessorKey: 'confirmed',
      header: 'CONFIRMED',
      cell: ({ row }) =>
        row.original.confirmed
          ? format(new Date(row.original.confirmed), 'd/MM/yyyy')
          : '-',
    },
    {
      accessorKey: 'revenue',
      header: 'REVENUE',
      cell: ({ row }) =>
        row.original.revenue
          ? `$${row.original.revenue.toLocaleString()}`
          : '-',
    },
    { accessorKey: 'gp', header: 'GP' },
    { accessorKey: 'fp_complete', header: 'FP COMPLETE' },
  ];

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex gap-3">
          <TabsTrigger value="cutting-plan" className="px-4 py-2 rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Cutting Plan
          </TabsTrigger>
          <TabsTrigger value="assembly" className="px-4 py-2 rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Assembly
          </TabsTrigger>
          <TabsTrigger value="installation" className="px-4 py-2 rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Installation
          </TabsTrigger>
        </TabsList>

        {/* Filters and Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by job, Fab ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[220px]"
            />
            <select
              className="border rounded-md px-3 py-2"
              value={fabTypeFilter}
              onChange={(e) => setFabTypeFilter(e.target.value)}
            >
              <option value="">FAB type</option>
              <option value="Standard">Standard</option>
              <option value="Custom">Custom</option>
            </select>

            <select
              className="border rounded-md px-3 py-2"
              value={salesPerson}
              onChange={(e) => setSalesPerson(e.target.value)}
            >
              <option value="">Select sales person</option>
              <option value="John">John</option>
              <option value="Mary">Mary</option>
            </select>
          </div>

          {/* <ExportCSV
            data={filteredData}
            fileName={`shop-${activeTab}`}
            header={[
              'FAB TYPE',
              'FAB ID',
              'JOB NO',
              'NO. OF PIECES',
              'TOTAL SQ FT',
              'CONFIRMED',
              'REVENUE',
              'GP',
              'FP COMPLETE',
            ]}
          /> */}
        </div>

        {/* Tab Contents */}
        <TabsContent value="cutting-plan">
          <GenericTable
            title="Cutting Plan"
            data={filteredData}
            columns={columns}
            searchableField="job_no"
            csvFilename="cutting-plan"
          />
        </TabsContent>

        <TabsContent value="assembly">
          <GenericTable
            title="Assembly"
            data={filteredData}
            columns={columns}
            searchableField="job_no"
            csvFilename="assembly"
          />
        </TabsContent>

        <TabsContent value="installation">
          <GenericTable
            title="Installation"
            data={filteredData}
            columns={columns}
            searchableField="job_no"
            csvFilename="installation"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
