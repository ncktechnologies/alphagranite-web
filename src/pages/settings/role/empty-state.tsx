import { Card, CardContent } from '@/components/ui/card'
import React from 'react'

export default function EmptyState() {
  return (
    <div>
      <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-sm font-bold">?</span>
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">What you need to know?</h3>
                  <p className="text-sm text-green-700">
                    Role-Based Access Control (RBAC) is a method of regulating access to computer or network resources based on the roles of individual users within your organization.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
    </div>
  )
}
