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
import { formatDate, formatNullFallback } from '../../../utils/formatUtils';
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
  rowActionLabel?: string;
}

const getFieldValue = <TItem,>(item: TItem, fieldName: keyof TItem | string): unknown => {
  return (item as Record<string, unknown>)[String(fieldName)];
};

const getTextValue = <TItem,>(item: TItem, column: ITableColumn<TItem>): string => {
  const value = getFieldValue(item, column.fieldName);

  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return String(value);
};

const getMobileTitleColumn = <TItem,>(columns: readonly ITableColumn<TItem>[]): ITableColumn<TItem> | undefined => {
  const preferredKeys = ['invoiceNumber', 'salesOrderNumber', 'eventName', 'salespersonName', 'customerName', 'customerCode'];

  return preferredKeys
    .map(preferredKey => columns.filter(column => String(column.fieldName) === preferredKey || column.key === preferredKey)[0])
    .filter((column): column is ITableColumn<TItem> => Boolean(column))[0] || columns[0];
};

const getAvatarText = (value: string): string => {
  const cleanValue = value.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  const parts = cleanValue.split(' ').filter(Boolean);

  if (!parts.length) {
    return 'MF';
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
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

const renderMobileCards = <TItem,>(
  columns: readonly ITableColumn<TItem>[],
  items: readonly TItem[],
  getRowKey: (item: TItem, index: number) => string,
  onRowClick: ((item: TItem) => void) | undefined,
  rowActionLabel: string
): React.ReactNode => {
  const titleColumn = getMobileTitleColumn(columns);

  return (
    <div className={styles.mobileCards}>
      {items.map((item, index) => {
        const title = titleColumn ? getTextValue(item, titleColumn) : 'Record';
        const subtitleColumn = columns.filter(column => column !== titleColumn && column.renderType !== 'status' && column.renderType !== 'amount')[0];
        const statusColumns = columns.filter(column => column.renderType === 'status');
        const metaColumns = columns.filter(column => column !== titleColumn && statusColumns.indexOf(column) === -1).slice(0, 5);
        const clickableProps = onRowClick
          ? {
              onClick: () => onRowClick(item),
              onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(item);
                }
              },
              role: 'button',
              tabIndex: 0
            }
          : {};

        return (
          <div className={onRowClick ? `${styles.mobileCard} ${styles.mobileCardClickable}` : styles.mobileCard} key={getRowKey(item, index)} {...clickableProps}>
            <div className={styles.mobileCardHeader}>
              <span className={styles.mobileCardAvatar} aria-hidden="true">{getAvatarText(title)}</span>
              <div className={styles.mobileCardTitleGroup}>
                <h3>{title}</h3>
                {subtitleColumn ? <p>{getTextValue(item, subtitleColumn)}</p> : null}
              </div>
              {onRowClick ? (
                <button
                  aria-label={rowActionLabel}
                  className={styles.mobileCardAction}
                  onClick={event => {
                    event.stopPropagation();
                    onRowClick(item);
                  }}
                  type="button"
                >
                  <span aria-hidden="true">&gt;</span>
                </button>
              ) : null}
            </div>
            {statusColumns.length ? (
              <div className={styles.mobileStatusRow}>
                {statusColumns.map(column => (
                  <span key={column.key}>{renderCell(item, column)}</span>
                ))}
              </div>
            ) : null}
            <dl className={styles.mobileMetaGrid}>
              {metaColumns.map(column => {
                const value = getFieldValue(item, column.fieldName);
                const isHighlightedAmount = column.key.toLowerCase().indexOf('outstanding') !== -1 && typeof value === 'number' && value > 0;

                return (
                  <div className={isHighlightedAmount ? `${styles.mobileMetaItem} ${styles.mobileMetaHighlight}` : styles.mobileMetaItem} key={column.key}>
                    <dt>{column.header}</dt>
                    <dd>{renderCell(item, column)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </div>
  );
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
  actions,
  rowActionLabel = 'View details'
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
      {renderMobileCards(columns, items, getRowKey, onRowClick, rowActionLabel)}
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
              {onRowClick ? (
                <th className={styles.actionHeader} scope="col">
                  Action
                </th>
              ) : null}
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
                {onRowClick ? (
                  <td className={styles.actionCell} onClick={event => event.stopPropagation()}>
                    <Button
                      label="View"
                      ariaLabel={rowActionLabel}
                      variant="secondary"
                      size="small"
                      onClick={() => onRowClick(item)}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginationState ? (
        <div className={styles.pagination}>
          <span>
            Page {formatNullFallback(paginationState.pageNumber)} of {formatNullFallback(totalPages)}
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
