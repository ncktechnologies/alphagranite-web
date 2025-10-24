import React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SidebarSection {
    title?: string
    type?: 'details' | 'notes' | 'custom'
    items?: { label: string; value: React.ReactNode }[]
    notes?: {
        id: number
        avatar: string
        content: string
        author: string
        timestamp: string
    }[]
    finalNote?: string
    className?: string
    sectionTitle?: string
}

interface GraySidebarProps {
    sections: SidebarSection[]
    className?: string
}

export default function GraySidebar({ sections, className = '' }: GraySidebarProps) {
    return (
        <aside
            className={` w-full border-r p-6 overflow-y-auto bg-[#FAFAFA] ${className}`}
        >
            {sections.map((section, sectionIndex) => (
                <section key={sectionIndex} className={`mt-3 mb-8 ${section.className || ''}`}>
                    {/* Section Title */}
                    <h3 className="font-semibold text-text my-5 text-base leading-[24px] ">{section.title}</h3>

                    {/* Details Section */}
                    {section.type === 'details' && section.items && (

                        <div className="space-y-5 text-sm">
                            {section.sectionTitle && (
                                <h4 className="font-semibold text-[#111827] my-5 text-xl leading-[24px] ">{section.sectionTitle}</h4>

                            )}
                            {section.items.map((item, index) => (
                                <div key={index}>
                                    <span className="font-medium text-text-foreground text-sm leading-[24px]">{item.label}:</span>
                                    <p className="text-text text-bold text-base leading-[24px]">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Notes Section */}
                    {section.type === 'notes' && section.notes && (
                        <div className="space-y-4">
                            {section.sectionTitle && (
                                <h4 className="font-semibold text-text my-5 text-base leading-[24px] ">{section.sectionTitle}</h4>

                            )}
                            {section.notes.map((note) => (
                                <div key={note.id} className="flex gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs bg-gray-200">
                                            {note.avatar}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="text-sm text-black mb-1 bg-[#FAFAFA] p-3 rounded-lg">{note.content}</p>
                                        <p className="text-sm text-text-foreground">
                                            {note.author} • {note.timestamp}
                                        </p>
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
        </aside>
    )
}
