export const salesPersons = ['Mike Rodriguez', 'Sarah Johnson', 'Bruno Pires', 'Maria Garcia']
export interface ShopData {
    id: number
    fab_type: string
    fab_id: string
    job_no: string
    pieces: number
    total_sq_ft: number
    wj_time: string
    machine: string
    confirmed: string
    revenue: string
    fp_complete: string
    date: string
    edging?:string
    miter_planning?:string

}
export const dummyData: ShopData[] = [
    {
        id: 1,
        fab_type: 'Standard',
        fab_id: '14425',
        job_no: '9999',
        pieces: 14,
        total_sq_ft: 171,
        wj_time: '-',
        machine: '-',
        confirmed: '9/10/2025',
        revenue: '$5,005.00',
        fp_complete: '9/10/2025',
        date: '10 October, 2025',
    },
    {
        id: 2,
        fab_type: 'Standard',
        fab_id: '33034',
        job_no: '9999',
        pieces: 16,
        total_sq_ft: 28.5,
        wj_time: '-',
        machine: '-',
        confirmed: '-',
        revenue: '-',
        fp_complete: 'No',
        date: '10 October, 2025',
    },
    {
        id: 3,
        fab_type: 'Standard',
        fab_id: '33034',
        job_no: '9999',
        pieces: 5,
        total_sq_ft: 28.5,
        wj_time: '-',
        machine: '-',
        confirmed: '-',
        revenue: '-',
        fp_complete: 'No',
        date: '10 October, 2025',
    },
]
export const dummyData2: ShopData[] = [
    {
        id: 1,
        fab_type: 'Standard',
        fab_id: '14425',
        job_no: '9999',
        pieces: 14,
        total_sq_ft: 171,
        wj_time: '-',
        machine: '-',
        confirmed: '9/10/2025',
        revenue: '$5,005.00',
        edging: '-',
        fp_complete: '9/10/2025',
        date: '10 October, 2025',
    },
    {
        id: 2,
        fab_type: 'Standard',
        fab_id: '33034',
        job_no: '9999',
        pieces: 16,
        total_sq_ft: 28.5,
        wj_time: '-',
        machine: '-',
        confirmed: '-',
        revenue: '-',
        fp_complete: 'No',
        edging: '-',
        date: '10 October, 2025',
    },
    {
        id: 3,
        fab_type: 'Standard',
        fab_id: '33034',
        job_no: '9999',
        pieces: 5,
        total_sq_ft: 28.5,
        wj_time: '-',
        machine: '-',
        confirmed: '-',
        edging: '-',
        revenue: '-',
        fp_complete: 'No',
        date: '10 October, 2025',
    },
]

//  const columns = useMemo<ColumnDef<CutPlanningData>[]>(
    //     () => [
          
    //         {
    //             id: 'month',
    //             accessorFn: (row) => row.month,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="MONTH" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text font-medium">
    //                     {row.original.month}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //             size: 200,
    //         },
    //         {
    //             id: 'shop_cut_date_scheduled',
    //             accessorFn: (row) => row.shop_cut_date_scheduled,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="SHOP CUT DATE SCHEDULED" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.shop_cut_date_scheduled !== null ? formatDate(row.original.shop_cut_date_scheduled) : '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //             size: 150,
    //         },
    //         {
    //             id: 'office_cut_date_scheduled',
    //             accessorFn: (row) => row.office_cut_date_scheduled,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="OFFICE CUT DATE SCHEDULED" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.office_cut_date_scheduled || '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //             size: 150,
    //         },
    //         {
    //             id: 'fab_completion_date',
    //             accessorFn: (row) => row.fab_completion_date,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="FAB COMPLETION DATE" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.fab_completion_date || '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //             size: 150,
    //         },
    //         {
    //             id: 'fab_type',
    //             accessorFn: (row) => row.fab_type,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="FAB TYPE" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text whitespace-nowrap">
    //                     {row.original.fab_type}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //             size: 100,
    //         },
    //         {
    //             id: 'fab_id',
    //             accessorFn: (row) => row.fab_id,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="FAB ID" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <button
    //                     onClick={() => handleFabIdClick(row.original.fab_id)}
    //                     className="text-sm text-primary hover:underline cursor-pointer"
    //                 >
    //                     {row.original.fab_id}
    //                 </button>
    //             ),
    //             enableSorting: true,
    //             size: 100,
    //         },
    //         {
    //             id: 'job_no',
    //             accessorFn: (row) => row.job_no,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="JOB NO" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">{row.original.job_no}</span>
    //             ),
    //             enableSorting: true,
    //             size: 100,
    //         },
    //         {
    //             id: 'fab_info',
    //             accessorFn: (row) => row.fab_info,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="FAB INFO" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.fab_info}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //             size: 500, // Increase the size for better readability
    //         },
    //         {
    //             id: 'pieces',
    //             accessorFn: (row) => row.pieces,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="NO. OF PIECES" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">{row.original.pieces}</span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'total_sq_ft',
    //             accessorFn: (row) => row.total_sq_ft,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="TOTAL SQ FT" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">{row.original.total_sq_ft}</span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'percent_complete',
    //             accessorFn: (row) => row.percent_complete,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="% COMPLETE" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.percent_complete.toFixed(2)}%
    //                 </span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'total_cut_ln_ft',
    //             accessorFn: (row) => row.total_cut_ln_ft,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="TOTAL CUT LN FT" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.total_cut_ln_ft || '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'saw_cut_ln_ft',
    //             accessorFn: (row) => row.saw_cut_ln_ft,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="SAW CUT LN FT" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.saw_cut_ln_ft || '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'water_jet_ln_ft',
    //             accessorFn: (row) => row.wj_linft,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="WATER JET LN FT" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.wj_linft || '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'machining_workstation',
    //             accessorFn: (row) => row.machining_workstation,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="MACHINING WORKSTATION" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.machining_workstation || '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'hours_scheduled',
    //             accessorFn: (row) => row.hours_scheduled,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="HOURS SCHEDULED" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.hours_scheduled || '0'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'machine_operator',
    //             accessorFn: (row) => row.machine_operator,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="MACHINE OPERATOR" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.machine_operator || '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //         },
    //         {
    //             id: 'notes',
    //             accessorFn: (row) => row.notes,
    //             header: ({ column }) => (
    //                 <DataGridColumnHeader title="NOTES" column={column} />
    //             ),
    //             cell: ({ row }) => (
    //                 <span className="text-sm text-text">
    //                     {row.original.notes || '-'}
    //                 </span>
    //             ),
    //             enableSorting: true,
    //             size: 300, // Increase the size for better readability
    //         },
    //         {
    //             id: 'actions',
    //             header: () => <span className="text-sm text-text">ACTIONS</span>,
    //             cell: ({ row }) => (
    //                 <ActionsCell row={row} onViewCalendar={() => handleViewCalendar(row.original.fab_id)} onCreatePlan={() => handleCreatePlan(row.original.fab_id)} />
    //             ),
    //             enableSorting: false,
    //             size: 50,

    //         }
    //     ],
    //     []
    // );