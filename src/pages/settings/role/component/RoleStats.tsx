'use client'

import { Calendar, User, Users, Users2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const stats = [
  {
    label: 'Date created',
    value: 'Mar 14, 2025',
    icon: <Calendar className="w-4 h-4 text-green-700" />,
    showIndicator: false,
  },
  {
    label: 'Total No. of staff',
    value: '121',
    icon: <Users className="w-5 h-5 text-primary" />,
    showIndicator: false,
  },
  {
    label: 'Active staff',
    value: '95',
    icon: <Users className="w-5 h-5 text-primary" />,
    indicatorColor: 'bg-green-500',
    showIndicator: true,
  },
  {
    label: 'Inactive staff',
    value: '21',
    icon: <Users className="w-5 h-5 text-primary" />,
    indicatorColor: 'bg-red-500',
    showIndicator: true,
  },
  {
    label: 'Pending staff',
    value: '5',
    icon: <Users className="w-5 h-5 text-primary" />,
    indicatorColor: 'bg-orange-500',
    showIndicator: true,
  },
]

export const RoleStats = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-y py-6">
      {stats.map((stat, index) => (
        <div key={index} className="flex flex-col items-start gap-3">
          <div className="relative w-8 h-8 bg-[#9CC15E1F] rounded-full flex items-center justify-center">
            {stat.icon}
            {stat.showIndicator && (
              <span
                className={`absolute top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${stat.indicatorColor}`}
              ></span>
            )}
          </div>
          <div>
            <p className="font-normal text-base text-black">{stat.value}</p>
            <p className="text-xs text-gray-500 pt-2">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
