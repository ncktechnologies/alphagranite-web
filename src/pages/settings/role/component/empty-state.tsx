import { Card, CardContent } from '@/components/ui/card'
import React from 'react'

export default function EmptyStateCard() {
  return (
    <div>
      <Card className="bg-[rgba(156, 193, 94, 0.08)] ">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div>
                  <h3 className="font-bold text-black mb-1">What you need to know?</h3>
                  <p className="text-[14px] leading-[20px] text-[#4B545D]">
                    Role-Based Access Control (RBAC) is a method of regulating access to computer or network resources based on the roles of individual users within your organization.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
    </div>
  )
}
