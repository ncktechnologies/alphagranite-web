import React, { useState } from 'react'
import { Link } from 'react-router'
import {
    type LucideIcon,
    Briefcase,
    Building2,
    CalendarDays,
    ChevronDown,
    ClipboardList,
    Hash,
    Layers,
    LayoutGrid,
    MessageSquareText,
    Ruler,
    Scissors,
    Shapes,
    StickyNote,
    Tag,
    UserCheck,
    UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
        categoryColor?: string
        avatarUrl?: string
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

type Note = NonNullable<SidebarSection['notes']>[number]

// ── Presentation helpers ─────────────────────────────────────────────────────

/** Small icon per detail label, matched on keywords so every page benefits without changes. */
const LABEL_ICONS: [RegExp, LucideIcon][] = [
    [/account/i, Building2],
    [/fab\s*id|job\s*id|job\s*(no|number)|#/i, Hash],
    [/job\s*name|^job$/i, Briefcase],
    [/area|room/i, LayoutGrid],
    [/material|stone|color|thickness/i, Layers],
    [/type/i, Tag],
    [/edge/i, Shapes],
    [/s\.?\s*f|sq\s*ft|sqft|square/i, Ruler],
    [/sales/i, UserRound],
    [/drafter|templater|installer|operator|assigned|technician/i, UserCheck],
    [/date|schedule|due/i, CalendarDays],
    [/slab\s*smith/i, Scissors],
    [/note/i, StickyNote],
]

const iconForLabel = (label: string) => LABEL_ICONS.find(([re]) => re.test(label))?.[1]

const EMPTY_VALUES = new Set(['', '—', '-', 'none', 'n/a', 'na', 'unknown', 'unassigned', 'not scheduled', 'not needed'])
const isEmptyValue = (value: React.ReactNode) =>
    value === null || value === undefined || (typeof value === 'string' && EMPTY_VALUES.has(value.trim().toLowerCase()))

// Stage colours arrive as Tailwind text classes (e.g. "text-blue-700"); map them to tinted pills.
// Static strings so Tailwind can see every class.
const STAGE_PILLS: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    gray: 'bg-gray-100 text-gray-700 ring-gray-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200',
    yellow: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
}

function StagePill({ label, color }: { label: string; color?: string }) {
    const hue = color?.match(/^text-([a-z]+)-\d{2,3}$/)?.[1]
    if (hue && STAGE_PILLS[hue]) {
        return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset', STAGE_PILLS[hue])}>
                {label}
            </span>
        )
    }
    // Raw CSS colour (e.g. "#C026D3") or nothing: tint from the colour itself.
    const c = color && !color.startsWith('text-') ? color : '#C026D3'
    return (
        <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset"
            style={{
                color: c,
                backgroundColor: `color-mix(in oklab, ${c} 10%, white)`,
                ['--tw-ring-color' as string]: `color-mix(in oklab, ${c} 30%, white)`,
            }}
        >
            {label}
        </span>
    )
}

const AVATAR_TONES = [
    'bg-primary-soft text-primary-accent',
    'bg-sky-100 text-sky-800',
    'bg-amber-100 text-amber-800',
    'bg-violet-100 text-violet-800',
    'bg-rose-100 text-rose-800',
    'bg-teal-100 text-teal-800',
]
const toneFor = (seed: string) => {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    return AVATAR_TONES[h % AVATAR_TONES.length]
}

const plainTextLength = (html: string) => html.replace(/<[^>]*>/g, '').trim().length

/** Note HTML as a string. Some pages pass the raw note object (`{ note, ... }`) instead of its text. */
const noteHtml = (content: unknown): string => {
    if (typeof content === 'string') return content
    if (typeof content === 'number') return String(content)
    if (content && typeof content === 'object' && typeof (content as { note?: unknown }).note === 'string') {
        return (content as { note: string }).note
    }
    return ''
}

/** Best-effort text of a simple node (string, number, or an element wrapping them). */
const textOf = (node: React.ReactNode): string | null => {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) {
        const parts = node.map(textOf)
        return parts.some((p) => p === null) ? null : parts.join('')
    }
    if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children)
    return null
}
// Sidebar can be as narrow as ~220px, so only pair when both the label and value are short.
const SHORT_TEXT_MAX = 10
const isShortItem = (item: { label: string; value: React.ReactNode }) => {
    const t = textOf(item.value)
    return t !== null && t.trim().length <= SHORT_TEXT_MAX && item.label.trim().length <= SHORT_TEXT_MAX
}

function SectionHeader({ icon: Icon, title, count }: { icon: LucideIcon; title?: string; count?: number }) {
    if (!title) return null
    return (
        <div className="mb-3 flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" strokeWidth={1.9} />
            <h3 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-text">{title}</h3>
            {count !== undefined && count > 0 && (
                <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold text-muted-foreground tabular-nums">
                    {count}
                </span>
            )}
        </div>
    )
}

function NoteItem({ note, isLast }: { note: Note; isLast: boolean }) {
    const [expanded, setExpanded] = useState(false)
    const html = noteHtml(note.content)
    const long = plainTextLength(html) > 180
    const hasAuthor = !!note.author?.trim()

    return (
        <li className="relative flex gap-2.5">
            {/* Timeline rail */}
            {!isLast && <span className="absolute start-[13px] top-8 bottom-[-12px] w-px bg-border" aria-hidden />}

            {hasAuthor ? (
                note.avatarUrl ? (
                    <img
                        src={note.avatarUrl}
                        alt={note.author}
                        className="relative z-[1] size-7 shrink-0 rounded-full object-cover ring-2 ring-background"
                    />
                ) : (
                    <span
                        className={cn(
                            'relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-background',
                            toneFor(note.author),
                        )}
                    >
                        {note.avatar || note.author.charAt(0).toUpperCase()}
                    </span>
                )
            ) : (
                <span className="relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-background">
                    <StickyNote className="size-3.5" />
                </span>
            )}

            <div className="min-w-0 flex-1 pb-1">
                {(hasAuthor || note.timestamp) && (
                    <div className="flex min-h-7 items-center justify-between gap-2">
                        <span className="truncate text-[14px] font-semibold text-foreground">{hasAuthor ? note.author : 'Note'}</span>
                        {note.timestamp && (
                            <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{note.timestamp}</span>
                        )}
                    </div>
                )}

                <div className={cn('rounded-lg border border-border/70 bg-muted/50 px-3 py-2.5', !(hasAuthor || note.timestamp) && 'mt-0.5')}>
                    {note.category && (
                        <div className="mb-1.5">
                            <StagePill label={note.category} color={note.categoryColor} />
                        </div>
                    )}
                    <p
                        className={cn(
                            'text-[14px] leading-5 text-text break-words [&_a]:text-primary [&_a]:underline',
                            long && !expanded && 'line-clamp-4',
                        )}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                    {long && (
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary-accent"
                        >
                            {expanded ? 'Show less' : 'Show more'}
                            <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
                        </button>
                    )}
                </div>
            </div>
        </li>
    )
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
    const getLinkUrl = (_label: string, item: any) => {
        // If item explicitly provides link, use that
        if (item.link) return item.link

        // Auto-generate link based on jobId
        if (jobId) {
            return `/job/details/${jobId}`
        }

        return '#'
    }

    return (
        <div className={cn('w-full space-y-6 overflow-y-auto bg-background p-4', className)}>
            {sections.map((section, sectionIndex) => (
                <section key={sectionIndex} className={section.className || ''}>
                    {/* Details Section */}
                    {section.type === 'details' && section.items && (
                        <>
                            <SectionHeader icon={ClipboardList} title={section.title} />
                            {section.sectionTitle && (
                                <h4 className="mb-2 text-base font-semibold text-foreground">{section.sectionTitle}</h4>
                            )}
                            <dl className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-card shadow-card">
                                {(() => {
                                    // Pair consecutive short values two-up (order preserved); long values get a full row.
                                    const items = section.items!
                                    const rows: (typeof items)[] = []
                                    for (let i = 0; i < items.length; i++) {
                                        const cur = items[i]
                                        const next = items[i + 1]
                                        if (next && isShortItem(cur) && isShortItem(next)) {
                                            rows.push([cur, next])
                                            i++
                                        } else {
                                            rows.push([cur])
                                        }
                                    }
                                    return rows.map((row, rowIndex) => (
                                        <div
                                            key={rowIndex}
                                            className={cn('grid', row.length === 2 ? 'grid-cols-2 divide-x divide-border/70' : 'grid-cols-1')}
                                        >
                                            {row.map((item, cellIndex) => {
                                                const isLink = shouldBeLink(item.label, item)
                                                const Icon = iconForLabel(item.label)
                                                const empty = !isLink && isEmptyValue(item.value)

                                                return (
                                                    <div key={cellIndex} className="flex min-w-0 gap-2 px-3 py-2.5">
                                                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground/80">
                                                            {Icon ? <Icon className="size-3.5" strokeWidth={1.9} /> : <span className="size-1 rounded-full bg-current" />}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <dt className="truncate text-[12px] font-medium uppercase tracking-[0.05em] text-muted-foreground" title={item.label}>
                                                                {item.label}
                                                            </dt>
                                                            <dd
                                                                className={cn(
                                                                    'mt-0.5 break-words text-sm leading-5',
                                                                    empty ? 'text-muted-foreground' : 'font-medium text-foreground',
                                                                    '[&_a]:font-semibold [&_a]:text-primary [&_a:hover]:text-primary-accent [&_a:hover]:underline',
                                                                )}
                                                            >
                                                                {isLink ? (
                                                                    <Link to={getLinkUrl(item.label, item)}>{item.value}</Link>
                                                                ) : (
                                                                    item.value
                                                                )}
                                                            </dd>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ))
                                })()}
                            </dl>
                        </>
                    )}

                    {/* Notes Section */}
                    {section.type === 'notes' && section.notes && (
                        <>
                            <SectionHeader icon={MessageSquareText} title={section.title} count={section.notes.length} />
                            {section.sectionTitle && (
                                <h4 className="mb-2 text-sm font-semibold text-foreground">{section.sectionTitle}</h4>
                            )}
                            {section.notes.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                                    No notes yet
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {section.notes.map((note, i) => (
                                        <NoteItem key={note.id ?? i} note={note} isLast={i === section.notes!.length - 1} />
                                    ))}
                                </ul>
                            )}
                            {section.finalNote && (
                                <div className="mt-3 border-t border-border pt-3">
                                    <p className="text-sm italic text-text">{section.finalNote}</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Custom Render Section (Optional) */}
                    {section.type === 'custom' && (
                        <>
                            <SectionHeader icon={StickyNote} title={section.title} />
                            <div className="text-sm text-text">{section.finalNote}</div>
                        </>
                    )}
                </section>
            ))}
        </div>
    )
}
