import React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SidebarSection {
  title: string
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
}

interface GraySidebarProps {
  sections: SidebarSection[]
  className?: string
}

export default function GraySidebar({ sections, className = '' }: GraySidebarProps) {
  return (
    <aside
      className={`w-80 border-r border-gray-200 p-6 overflow-y-auto bg-[#FAFAFA] ${className}`}
    >
      {sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="mb-8">
          {/* Section Title */}
          <h3 className="font-semibold text-gray-900 mb-3">{section.title}</h3>

          {/* Details Section */}
          {section.type === 'details' && section.items && (
            <div className="space-y-3 text-sm">
              {section.items.map((item, index) => (
                <div key={index}>
                  <span className="font-medium text-gray-500">{item.label}:</span>
                  <p className="text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Notes Section */}
          {section.type === 'notes' && section.notes && (
            <div className="space-y-4">
              {section.notes.map((note) => (
                <div key={note.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-gray-200">
                      {note.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 mb-1">{note.content}</p>
                    <p className="text-xs text-gray-500">
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
