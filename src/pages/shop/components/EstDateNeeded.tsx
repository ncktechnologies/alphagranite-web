/** Red marker for FABs whose shop plans are all complete but have no shop est. completion date yet. */
export function EstDateNeeded() {
    return (
        <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600"
            title="All shop plans are 100% complete. Set a shop est. completion date."
            role="status"
        >
            <span className="size-3 shrink-0 rounded-[3px] bg-red-600" aria-hidden />
            Date needed
        </span>
    );
}
