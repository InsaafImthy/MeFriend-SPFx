import * as React from 'react';
import type { IPaginationState } from '../../../models/common/IPaginationState';
import type { ISortState, SortDirection } from '../../../models/common/ISortState';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import { AmountDisplay } from '../amountDisplay/AmountDisplay';
import { Button } from '../buttons/Button';
import { EmptyState } from '../emptyState/EmptyState';
import { ErrorState } from '../errorState/ErrorState';
import { Loader } from '../loaders/Loader';
import { StatusBadge } from '../statusBadge/StatusBadge';
import { formatDate } from '../../../utils/formatUtils';
import styles from './EntityTable.module.scss';

export interface IEntityTableProps<TItem> {
  columns: readonly ITableColumn<TItem>[];
  items: readonly TItem[];
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  sortState?: ISortState;
  paginationState?: IPaginationState;
  onSort?: (fieldName: string, direction: SortDirection) => void;
  onPageChange?: (pageNumber: number) => void;
  onRowClick?: (item: TItem) => void;
  getRowKey: (item: TItem, index: number) => string;
  actions?: React.ReactNode;
}

const getFieldValue = <TItem,>(item: TItem, fieldName: keyof TItem | string): unknown => {
  return (item as Record<string, unknown>)[String(fieldName)];
};

const renderCell = <TItem,>(item: TItem, column: ITableColumn<TItem>): React.ReactNode => {
  if (column.customRender) {
    return column.customRender(item);
  }

  const value = getFieldValue(item, column.fieldName);

  if (column.renderType === 'amount') {
    return <AmountDisplay amount={typeof value === 'number' ? value : undefined} />;
  }

  if (column.renderType === 'status') {
    return <StatusBadge value={typeof value === 'string' ? value : undefined} />;
  }

  if (column.renderType === 'date') {
    return formatDate(typeof value === 'string' ? value : undefined);
  }

  if (value === undefined || value === null || value === '') {
    return <span className={styles.fallback}>-</span>;
  }

  return String(value);
};

export const EntityTable = <TItem,>({
  columns,
  items,
  loading = false,
  error,
  emptyTitle = 'No records found',
  emptyMessage = 'There are no records to display.',
  sortState,
  paginationState,
  onSort,
  onPageChange,
  onRowClick,
  getRowKey,
  actions
}: IEntityTableProps<TItem>): React.ReactElement => {
  const totalPages = paginationState ? Math.max(1, Math.ceil(paginationState.totalCount / paginationState.pageSize)) : 1;

  const handleSort = (column: ITableColumn<TItem>): void => {
    if (!column.sortable || !onSort) {
      return;
    }

    const nextDirection: SortDirection =
      sortState && sortState.fieldName === String(column.fieldName) && sortState.direction === 'asc' ? 'desc' : 'asc';
    onSort(String(column.fieldName), nextDirection);
  };

  if (loading) {
    return (
      <div className={styles.stateBox}>
        <Loader type="table" message="Loading records" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Unable to load records" message={error} />;
  }

  if (!items.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} action={actions} />;
  }

  return (
    <div className={styles.tableShell}>
      {actions ? <div className={styles.toolbar}>{actions}</div> : null}
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(column => {
                const isSorted = sortState && sortState.fieldName === String(column.fieldName);
                const headerStyle: React.CSSProperties = {
                  maxWidth: column.maxWidth,
                  minWidth: column.minWidth,
                  width: column.width
                };

                return (
                  <th key={column.key} style={headerStyle} scope="col">
                    {column.sortable ? (
                      <button
                        aria-sort={isSorted ? (sortState && sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className={styles.sortButton}
                        onClick={() => handleSort(column)}
                        type="button"
                      >
                        <span>{column.header}</span>
                        <span className={styles.sortIcon} aria-hidden="true">
                          {isSorted && sortState && sortState.direction === 'desc' ? 'v' : '^'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                className={onRowClick ? styles.clickableRow : undefined}
                key={getRowKey(item, index)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={event => {
                  if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onRowClick(item);
                  }
                }}
              >
                {columns.map(column => (
                  <td key={column.key}>{renderCell(item, column)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginationState ? (
        <div className={styles.pagination}>
          <span>
            Page {paginationState.pageNumber} of {totalPages}
          </span>
          <div className={styles.pageActions}>
            <Button
              label="Previous"
              variant="secondary"
              size="small"
              disabled={paginationState.pageNumber <= 1}
              onClick={() => onPageChange && onPageChange(paginationState.pageNumber - 1)}
            />
            <Button
              label="Next"
              variant="secondary"
              size="small"
              disabled={paginationState.pageNumber >= totalPages}
              onClick={() => onPageChange && onPageChange(paginationState.pageNumber + 1)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
