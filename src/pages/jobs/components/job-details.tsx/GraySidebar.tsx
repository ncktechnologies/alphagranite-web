import React from 'react'
import { jobDetails, schedulingNotes } from '../job'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function GraySidebar() {
    return (

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Job Details & Scheduling Notes */}
            <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto bg-[#FAFAFA]">
                {/* Job Details */}
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Job Details</h3>
                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="font-medium text-gray-500">Customer:</span>
                            <p className="text-gray-900">{jobDetails.customer}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Job #:</span>
                            <p className="text-gray-900">{jobDetails.jobNumber}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Area:</span>
                            <p className="text-gray-900">{jobDetails.area}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">FAB Type:</span>
                            <Badge variant="outline" className="ml-2">{jobDetails.fabType}</Badge>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Slab smith used?</span>
                            <Badge variant={jobDetails.slabSmithUsed ? "primary" : "secondary"} className="ml-2">
                                {jobDetails.slabSmithUsed ? "Yes" : "No"}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Drafting Notes */}
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Drafting notes</h3>
                    <div className="space-y-4">
                        {schedulingNotes.map((note) => (
                            <div key={note.id} className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-gray-200">
                                        {note.avatar}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-900 mb-1">{note.content}</p>
                                    <p className="text-xs text-gray-500">{note.author} • {note.timestamp}</p>
                                </div>
                            </div>
                        ))}

                        {/* Final note */}
                        <div className="pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-900 italic">
                                Square foot bigger than what was templated initially.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
