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