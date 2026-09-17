import { useMemo, useState } from 'react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { CaretLeftIcon, CaretRightIcon, CaretUpIcon, CaretDownIcon } from '@phosphor-icons/react';
import EmptyState from '../common/EmptyState';

const getValue = (record, dataIndex) => (
  Array.isArray(dataIndex) ? dataIndex.reduce((acc, key) => acc?.[key], record) : record[dataIndex]
);

const DataTable = ({
  columns,
  dataSource = [],
  loading,
  meta,
  onPageChange,
  rowKey = '_id',
  onRow,
}) => {
  const [sort, setSort] = useState(null);

  const sortedData = useMemo(() => {
    if (!sort) return dataSource;
    const column = columns.find((c) => c.dataIndex === sort.key);
    if (typeof column?.sorter !== 'function') return dataSource;
    const sorted = [...dataSource].sort(column.sorter);
    return sort.direction === 'desc' ? sorted.reverse() : sorted;
  }, [dataSource, sort, columns]);

  const toggleSort = (column) => {
    if (typeof column.sorter !== 'function') return;
    setSort((prev) => {
      if (prev?.key !== column.dataIndex) return { key: column.dataIndex, direction: 'asc' };
      if (prev.direction === 'asc') return { key: column.dataIndex, direction: 'desc' };
      return null;
    });
  };

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.title}
                onClick={() => toggleSort(col)}
                className={typeof col.sorter === 'function' ? 'cursor-pointer select-none' : ''}
              >
                <span className="inline-flex items-center gap-1">
                  {col.title}
                  {sort?.key === col.dataIndex && (
                    sort.direction === 'asc' ? <CaretUpIcon size={12} /> : <CaretDownIcon size={12} />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.title}><Skeleton className="h-4 w-full max-w-32" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : sortedData.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length}>
                <EmptyState />
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((record) => {
              const extra = onRow?.(record) || {};
              return (
                <TableRow
                  key={record[rowKey]}
                  onClick={extra.onClick}
                  className={extra.onClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col) => (
                    <TableCell key={col.title}>
                      {col.render ? col.render(getValue(record, col.dataIndex), record) : (getValue(record, col.dataIndex) ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {meta && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {meta.total?.toLocaleString() ?? 0} total
          </span>
          <div className="flex items-center gap-2">
            <NativeSelect
              size="sm"
              value={meta.limit}
              onChange={(e) => onPageChange?.({ page: 1, limit: Number(e.target.value) })}
            >
              {[10, 20, 50, 100].map((n) => (
                <NativeSelectOption key={n} value={n}>{n} / page</NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={meta.page <= 1}
              onClick={() => onPageChange?.({ page: meta.page - 1, limit: meta.limit })}
            >
              <CaretLeftIcon />
            </Button>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {meta.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={meta.page >= totalPages}
              onClick={() => onPageChange?.({ page: meta.page + 1, limit: meta.limit })}
            >
              <CaretRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
