import React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Link } from 'react-router'

interface SidebarSection {
    title?: string
    type?: 'details' | 'notes' | 'custom'
    items?: {
        label: string;
        value: React.ReactNode;
        link?: string;
        isLink?: boolean;
    }[]
    notes?: {
        id: number
        avatar: string
        content: string
        author: string
        timestamp: string
        category?: string
    }[]
    finalNote?: string
    className?: string
    sectionTitle?: string
}

interface GraySidebarProps {
    sections: SidebarSection[]
    className?: string
    // Optional: Pass jobId if available to auto-generate links
    jobId?: number | string
}

export default function GraySidebar({ sections, className = '', jobId }: GraySidebarProps) {

    // Helper function to check if an item should be a link
    const shouldBeLink = (label: string, item: any) => {
        // If item explicitly specifies isLink, use that
        if (item.isLink !== undefined) return item.isLink

        // Auto-detect based on label if jobId is available
        if (jobId && (label.toLowerCase().includes('job name') ||
            label.toLowerCase().includes('job number') ||
            label.toLowerCase().includes('job id'))) {
            return true
        }

        return false
    }

    // Helper function to get link URL
    const getLinkUrl = (label: string, item: any) => {
        // If item explicitly provides link, use that
        if (item.link) return item.link

        // Auto-generate link based on jobId
        if (jobId) {
            return `/job/details/${jobId}`
        }

        return '#'
    }

    return (
        <div
            className={`w-full border-r p-5 overflow-y-auto bg-white  ${className}`}
        >
            {sections.map((section, sectionIndex) => (
                <section key={sectionIndex} className={`mt-3 mb-8 ${section.className || ''}`}>
                    {/* Section Title */}
                    <h3 className="font-semibold text-text my-5 text-base leading-[24px]">{section.title}</h3>

                    {/* Details Section */}
                    {section.type === 'details' && section.items && (
                        <div className="space-y-5 text-sm">
                            {section.sectionTitle && (
                                <h4 className="font-semibold text-[#111827] my-5 text-xl leading-[24px]">{section.sectionTitle}</h4>
                            )}
                            {section.items.map((item, index) => {
                                const isLink = shouldBeLink(item.label, item)

                                return (
                                    <div key={index}>
                                        <span className="font-medium text-text-foreground text-sm leading-[24px]">
                                            {item.label}:
                                        </span>
                                        {isLink ? (
                                            <p className="text-text text-bold text-base leading-[24px]">
                                                <Link
                                                    to={getLinkUrl(item.label, item)}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    {item.value}
                                                </Link>
                                            </p>
                                        ) : (
                                            <p className="text-text text-bold text-base leading-[24px]">
                                                {item.value}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Notes Section - Figma Design Style */}
                    {section.type === 'notes' && section.notes && (
                        <div className="space-y-6">
                            {section.sectionTitle && (
                                <h4 className="font-semibold text-text my-5 text-base leading-[24px]">{section.sectionTitle}</h4>
                            )}
                            {section.notes.map((note) => (
                                <div key={note.id} className="flex flex-col gap-3">
                                    {/* Header: Avatar + Name on left, Date on right */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarFallback className="text-sm bg-[#B85C5C] text-white font-medium">
                                                    {note.avatar}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-normal text-[#111827]">{note.author}</span>
                                        </div>
                                        <span className="text-xs font-normal text-[#9CA3AF]">{note.timestamp}</span>
                                    </div>
                                    
                                    {/* Category/Tag */}
                                    {note.category && (
                                        <div className="pl-10">
                                            <span className="text-sm font-medium text-[#C026D3]">{note.category}</span>
                                        </div>
                                    )}
                                    
                                    {/* Content */}
                                    <div className="pl-10">
                                        <p 
                                            className="text-sm font-normal text-[#111827] leading-[20px]"
                                            dangerouslySetInnerHTML={{ __html: note.content }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {section.finalNote && (
                                <div className="pt-3 border-t border-gray-200">
                                    <p className="text-sm text-gray-900 italic">{section.finalNote}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Render Section (Optional) */}
                    {section.type === 'custom' && (
                        <div className="text-sm text-gray-700">{section.finalNote}</div>
                    )}
                </section>
            ))}
        </div>
    )
}