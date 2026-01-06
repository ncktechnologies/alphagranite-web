import * as React from 'react';
import { CSSProperties, Fragment, ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataGrid } from '@/components/ui/data-grid';
import { Cell, Column, flexRender, Header, HeaderGroup, Row } from '@tanstack/react-table';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const headerCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'px-2.5 h-8',
      default: 'px-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const bodyCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'px-1.5 py-0.5',
      default: 'px-2 py-1',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

function getPinningStyles<TData>(column: Column<TData>): CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  };
}

function DataGridTableBase({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <table
      data-slot="data-grid-table"
      className={cn(
        'w-full align-middle caption-bottom text-left rtl:text-right text-text font-normal text-[15px] leading-[15px]',
        !props.tableLayout?.columnsDraggable && 'border-separate border-spacing-0',
        props.tableLayout?.width === 'fixed' ? 'table-fixed' : 'table-auto',
        props.tableClassNames?.base,
      )}
    >
      {children}
    </table>
  );
}

function DataGridTableHead({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <thead
      className={cn(
        props.tableClassNames?.header,
        props.tableLayout?.headerSticky && props.tableClassNames?.headerSticky,
      )}
    >
      {children}
    </thead>
  );
}

function DataGridTableHeadRow<TData>({
  children,
  headerGroup,
}: {
  children: ReactNode;
  headerGroup: HeaderGroup<TData>;
}) {
  const { props } = useDataGrid();

  return (
    <tr
      key={headerGroup.id}
      className={cn(
        'bg-muted/40',
        props.tableLayout?.headerBorder && '[&>th]:border-b',
        props.tableLayout?.cellBorder && '[&_>:last-child]:border-e-0',
        props.tableLayout?.stripped && 'bg-transparent',
        props.tableLayout?.headerBackground === false && 'bg-transparent',
        props.tableClassNames?.headerRow,
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableHeadRowCell<TData>({
  children,
  header,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  header: Header<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();
  const { column } = header;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinned = isPinned === 'right' && column.getIsFirstColumn('right');
  const headerCellSpacing = headerCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <th
      key={header.id}
      ref={dndRef}
      style={{
        ...(props.tableLayout?.width === 'fixed' && {
          width: `${header.getSize()}px`,
          minWidth: `${header.getSize()}px`,
          maxWidth: `${header.getSize()}px`,
        }),
        ...(props.tableLayout?.columnsPinnable && column.getCanPin() && getPinningStyles(column)),
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined}
      className={cn(
        'relative h-6 text-left rtl:text-right align-middle font-normal text-accent-foreground [&:has([role=checkbox])]:pe-0 break-words whitespace-normal',
        headerCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsPinnable &&
        column.getCanPin() &&
        '[&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border data-pinned:bg-muted/90 data-pinned:backdrop-blur-xs',
        header.column.columnDef.meta?.headerClassName,
        column.getIndex() === 0 || column.getIndex() === header.headerGroup.headers.length - 1
          ? props.tableClassNames?.edgeCell
          : '',
      )}
    >
      {children}
    </th>
  );
}

function DataGridTableHeadRowCellResize<TData>({ header }: { header: Header<TData, unknown> }) {
  const { column } = header;

  return (
    <div
      {...{
        onDoubleClick: () => column.resetSize(),
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
        className:
          'absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:-translate-x-px',
      }}
    />
  );
}

function DataGridTableRowSpacer() {
  return <tbody aria-hidden="true" className="h-2"></tbody>;
}

function DataGridTableBody({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <tbody
      className={cn(
        '[&_tr:last-child]:border-0',
        props.tableLayout?.rowRounded && '[&_td:first-child]:rounded-s-lg [&_td:last-child]:rounded-e-lg',
        props.tableClassNames?.body,
      )}
    >
      {children}
    </tbody>
  );
}

function DataGridTableBodyRowSkeleton({ children }: { children: ReactNode }) {
  const { table, props } = useDataGrid();

  return (
    <tr
      className={cn(
        'hover:bg-muted data-[state=selected]:bg-muted',
        props.onRowClick && 'cursor-pointer',
        !props.tableLayout?.stripped &&
        props.tableLayout?.rowBorder &&
        'border-b border-border [&:not(:last-child)>td]:border-b',
        props.tableLayout?.cellBorder && '[&_>:last-child]:border-e-0',
        props.tableLayout?.stripped && 'odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted',
        table.options.enableRowSelection && '[&_>:first-child]:relative',
        props.tableClassNames?.bodyRow,
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableBodyRowSkeletonCell<TData>({ children, column }: { children: ReactNode; column: Column<TData> }) {
  const { props, table } = useDataGrid();
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <td
      className={cn(
        'align-middle break-words whitespace-normal',
        bodyCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable && column.getCanResize() && 'break-words',
        column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
        column.getCanPin() &&
        '[&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs"',
        column.getIndex() === 0 || column.getIndex() === table.getVisibleFlatColumns().length - 1
          ? props.tableClassNames?.edgeCell
          : '',
      )}
    >
      {children}
    </td>
  );
}

function DataGridTableBodyRow<TData>({
  children,
  row,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  row: Row<TData>;
  dndRef?: React.Ref<HTMLTableRowElement>;
  dndStyle?: CSSProperties;
}) {
  const { props, table } = useDataGrid();

  return (
    <tr
      ref={dndRef}
      style={{ ...(dndStyle ? dndStyle : null) }}
      data-state={table.options.enableRowSelection && row.getIsSelected() ? 'selected' : undefined}
      onClick={() => props.onRowClick && props.onRowClick(row.original)}
      className={cn(
        'hover:bg-muted/40 data-[state=selected]:bg-muted/50 h-8',
        props.onRowClick && 'cursor-pointer',
        !props.tableLayout?.stripped &&
        props.tableLayout?.rowBorder &&
        'border-b border-border [&:not(:last-child)>td]:border-b',
        props.tableLayout?.cellBorder && '[&_>:last-child]:border-e-0',
        props.tableLayout?.stripped && 'odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted',
        table.options.enableRowSelection && '[&_>:first-child]:relative',
        props.tableClassNames?.bodyRow,
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableBodyRowExpandded<TData>({ row }: { row: Row<TData> }) {
  const { props, table } = useDataGrid();

  return (
    <tr className={cn(props.tableLayout?.rowBorder && '[&:not(:last-child)>td]:border-b')}>
      <td colSpan={row.getVisibleCells().length}>
        {table
          .getAllColumns()
          .find((column) => column.columnDef.meta?.expandedContent)
          ?.columnDef.meta?.expandedContent?.(row.original)}
      </td>
    </tr>
  );
}

function DataGridTableBodyRowCell<TData>({
  children,
  cell,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  cell: Cell<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();

  const { column, row } = cell;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinned = isPinned === 'right' && column.getIsFirstColumn('right');
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <td
      key={cell.id}
      ref={dndRef}
      {...(props.tableLayout?.columnsDraggable && !isPinned ? { cell } : {})}
      style={{
        ...(props.tableLayout?.columnsPinnable && column.getCanPin() && getPinningStyles(column)),
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined}
      className={cn(
        'align-middle break-words whitespace-normal',
        bodyCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable && column.getCanResize() && 'break-words',
        cell.column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
        column.getCanPin() &&
        '[&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs"',
        column.getIndex() === 0 || column.getIndex() === row.getVisibleCells().length - 1
          ? props.tableClassNames?.edgeCell
          : '',
      )}
    >
      {children}
    </td>
  );
}

function DataGridTableEmpty() {
  const { table, props } = useDataGrid();
  const totalColumns = table.getAllColumns().length;

  return (
    <tr>
      <td colSpan={totalColumns} className="text-center text-text py-6">
        {props.emptyMessage || 'No data available'}
      </td>
    </tr>
  );
}

function DataGridTableLoader() {
  const { props } = useDataGrid();

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="text-muted-foreground bg-card  flex items-center gap-2 px-4 py-2 font-medium leading-none text-sm border shadow-xs rounded-md">
        <svg
          className="animate-spin -ml-1 h-5 w-5 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {props.loadingMessage || 'Loading...'}
      </div>
    </div>
  );
}

function DataGridTableRowSelect<TData>({ row, size }: { row: Row<TData>; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <>
      <div
        className={cn('hidden absolute top-0 bottom-0 start-0 w-[2px] bg-primary', row.getIsSelected() && 'block')}
      ></div>
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        size={size ?? 'sm'}
        className="align-[inherit]"
      />
    </>
  );
}

function DataGridTableRowSelectAll({ size }: { size?: 'sm' | 'md' | 'lg' }) {
  const { table, recordCount, isLoading } = useDataGrid();

  return (
    <Checkbox
      checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
      disabled={isLoading || recordCount === 0}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      size={size}
      className="align-[inherit]"
    />
  );
}


function DataGridTable<TData extends object>() {
  const { table, isLoading, props } = useDataGrid();
  const pagination = table.getState().pagination;
  const tableRows = table.getRowModel().rows;
  const skeletonRowCount = pagination?.pageSize ?? (tableRows.length || 5);
  const showSkeleton = props.loadingMode === 'skeleton' && isLoading && skeletonRowCount > 0;
  const showSpinner = props.loadingMode === 'spinner' && isLoading;

  // Check if grouping is enabled
  const groupByDate = (props as any).groupByDate;
  const dateKey = (props as any).dateKey;

  // Group rows by date if enabled
  const groupedRows = groupByDate && dateKey
    ? tableRows.reduce<Record<string, Row<TData>[]>>((acc, row) => {
        const dateValue = (row.original as any)[dateKey];

        if (!dateValue) {
          const noDateKey = 'No Dates';
          if (!acc[noDateKey]) acc[noDateKey] = [];
          acc[noDateKey].push(row);
          return acc;
        }

        try {
          const date = new Date(dateValue).toLocaleDateString();
          if (!acc[date]) acc[date] = [];
          acc[date].push(row);
        } catch (error) {
          const invalidDateKey = 'Invalid Dates';
          if (!acc[invalidDateKey]) acc[invalidDateKey] = [];
          acc[invalidDateKey].push(row);
        }
        return acc;
      }, {})
    : null;

  const renderTableHead = () => (
    <DataGridTableHead>
      {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
        <DataGridTableHeadRow headerGroup={headerGroup} key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const { column } = header;

            return (
              <DataGridTableHeadRowCell header={header} key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
                {props.tableLayout?.columnsResizable && column.getCanResize() && (
                  <DataGridTableHeadRowCellResize header={header} />
                )}
              </DataGridTableHeadRowCell>
            );
          })}
        </DataGridTableHeadRow>
      ))}
    </DataGridTableHead>
  );

  const renderSkeletonRows = () =>
    Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
      <DataGridTableBodyRowSkeleton key={`skeleton-${rowIndex}`}>
        {table.getVisibleFlatColumns().map((column) => (
          <DataGridTableBodyRowSkeletonCell column={column} key={`skeleton-cell-${column.id}`}>
            {column.columnDef.meta?.skeleton}
          </DataGridTableBodyRowSkeletonCell>
        ))}
      </DataGridTableBodyRowSkeleton>
    ));

  const renderRows = (rows: Row<TData>[]) =>
    rows.map((row) => (
      <Fragment key={row.id}>
        <DataGridTableBodyRow row={row}>
          {row.getVisibleCells().map((cell) => (
            <DataGridTableBodyRowCell cell={cell} key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </DataGridTableBodyRowCell>
          ))}
        </DataGridTableBodyRow>
        {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
      </Fragment>
    ));

  if (showSkeleton) {
    return (
      <div className="relative">
        <DataGridTableBase>
          {renderTableHead()}
          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}
          <DataGridTableBody>{renderSkeletonRows()}</DataGridTableBody>
        </DataGridTableBase>
      </div>
    );
  }

  // If not grouping by date, render normal table
  if (!groupByDate || !groupedRows) {
    return (
      <div className="relative">
        <DataGridTableBase>
          {renderTableHead()}
          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}
          <DataGridTableBody>
            {tableRows.length ? renderRows(tableRows) : <DataGridTableEmpty />}
          </DataGridTableBody>
        </DataGridTableBase>
        {showSpinner && <DataGridTableLoader />}
      </div>
    );
  }

  // Grouped by date view - each date gets its own table section
  return (
    <div className="relative space-y-3">
      {Object.entries(groupedRows).map(([date, rows]) => {
        // Define specific numeric columns to include in totals calculation
        const columnsToCalculate = ['total_sq_ft', 'wl_ln_ft', 'sl_ln_ft', 'edging_ln_ft', 'cnc_ln_ft', 'milter_ln_ft', 'cost_of_stone', 'revenue'];
        
        // Calculate totals only for specified columns
        const columnTotals: Record<string, number> = {};
        
        columnsToCalculate.forEach(columnId => {
          // Calculate total for this column
          const total = rows.reduce((sum, row) => {
            const value = (row.original as any)[columnId];
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            return sum + (isNaN(numValue) ? 0 : numValue);
          }, 0);
          
          columnTotals[columnId] = total;
        });

        return (
          <div key={date} className="border border-border rounded-lg overflow-hidden">
            <div className="bg-[#F6FFE7] border-b border-border">
              <table className="w-full table-fixed">
                <thead>
                  <tr>
                    {table.getHeaderGroups()[0]?.headers.map((header, index) => {
                      const isFirstColumn = index === 0;
                      const columnId = header.column.id;
                      const shouldShowTotal = columnsToCalculate.includes(columnId);

                      return (
                        <th
                          key={header.id}
                          style={{ width: header.getSize() }}
                          className="px-2 py-1 text-left font-normal"
                        >
                          {isFirstColumn ? (
                            <span className="text-[15px] leading-[15px] text-text whitespace-nowrap">{date}</span>
                          ) : shouldShowTotal ? (
                            <span className="text-[13px] leading-[13px] font-medium text-text">
                              {columnTotals[columnId]?.toFixed(1)}
                            </span>
                          ) : null}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              </table>
            </div>

            <DataGridTableBase>
              {renderTableHead()}
              {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}
              <DataGridTableBody>{renderRows(rows)}</DataGridTableBody>
            </DataGridTableBase>
          </div>
        );
      })}

      {Object.keys(groupedRows).length === 0 && (
        <div className="border border-border rounded-lg">
          <DataGridTableBase>
            <DataGridTableBody>
              <DataGridTableEmpty />
            </DataGridTableBody>
          </DataGridTableBase>
        </div>
      )}

      {showSpinner && <DataGridTableLoader />}
    </div>
  );
}



export {
  DataGridTable,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableLoader,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  DataGridTableRowSpacer,
};
