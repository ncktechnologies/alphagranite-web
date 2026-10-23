'use client'

import { Role } from '@/store/api/role'
import { format } from 'date-fns'
import { DetailField } from '@/components/common/master-detail'

interface RoleStatsProps {
  role: Role;
}

export const RoleStats = ({ role }: RoleStatsProps) => {
  const stats = [
    { label: 'Date created', value: role.created_at ? format(new Date(role.created_at), 'MMM dd, yyyy') : '-' },
    { label: 'Total staff', value: role.total_members || 0 },
    { label: 'Active staff', value: role.active_members || 0 },
    { label: 'Inactive staff', value: role.inactive_members || 0 },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {stats.map(({ label, value }) => (
        <DetailField key={label} label={label} value={value} />
      ))}
    </div>
  )
}
