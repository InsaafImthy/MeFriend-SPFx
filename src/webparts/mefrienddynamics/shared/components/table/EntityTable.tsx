import * as React from 'react';
import type { IPaginationState } from '../../models/IPaginationState';
import type { ICursorPaginationState } from '../../models/IServerPagination';
import type { ISortState, SortDirection } from '../../models/ISortState';
import type { ITableColumn, TableColumnAlign } from '../../models/ITableColumn';
import { AmountDisplay } from '../amountDisplay/AmountDisplay';
import { EmptyState } from '../emptyState/EmptyState';
import { ErrorState } from '../errorState/ErrorState';
import { Loader } from '../loaders/Loader';
import { StatusBadge } from '../statusBadge/StatusBadge';
import { formatDate, formatNullFallback } from '../../utilities/formatUtils';
import styles from './EntityTable.module.scss';

export interface IEntityTableAction<TItem> {
  key: string;
  label: string;
  icon?: 'view' | 'edit' | 'delete' | 'download' | 'more' | 'print';
  variant?: 'neutral' | 'danger';
  disabled?: boolean | ((item: TItem) => boolean);
  visible?: boolean | ((item: TItem) => boolean);
  onClick: (item: TItem) => void;
}

export interface IDocumentCellValue {
  name: string;
  url?: string;
}

export interface IEntityTableProps<TItem> {
  columns: readonly ITableColumn<TItem>[];
  items: readonly TItem[];
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  sortState?: ISortState;
  paginationState?: IPaginationState;
  cursorPaginationState?: ICursorPaginationState;
  onSort?: (fieldName: string, direction?: SortDirection) => void;
  onPageChange?: (pageNumber: number) => void;
  onRowClick?: (item: TItem) => void;
  getRowKey: (item: TItem, index: number) => string;
  actions?: React.ReactNode;
  rowActionLabel?: string;
  rowActions?: readonly IEntityTableAction<TItem>[];
  overflowActions?: readonly IEntityTableAction<TItem>[];
  selectedRowKeys?: readonly string[];
  onSelectionChange?: (selectedKeys: readonly string[]) => void;
  selectionLabel?: string;
  showGoToPage?: boolean;
}

interface IIconProps {
  name: 'view' | 'edit' | 'delete' | 'download' | 'more' | 'previous' | 'next' | 'print';
}

const DEFAULT_COLUMN_WIDTH = 136;
const SELECTION_COLUMN_WIDTH = 42;
const ACTION_COLUMN_WIDTH = 118;
const ACTION_CELL_HORIZONTAL_PADDING = 20;
const ACTION_GAP_WIDTH = 6;
const ICON_ACTION_WIDTH = 26;
const TEXT_ACTION_MIN_WIDTH = 64;

const getFieldValue = <TItem,>(item: TItem, fieldName: keyof TItem | string): unknown => {
  return (item as Record<string, unknown>)[String(fieldName)];
};

const getTextValue = <TItem,>(item: TItem, column: ITableColumn<TItem>): string => {
  const value = getFieldValue(item, column.fieldName);

  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (column.renderType === 'document' && typeof value === 'object' && value !== null && 'name' in value) {
    return String((value as IDocumentCellValue).name || '-');
  }

  return String(value);
};

const getColumnWidth = <TItem,>(column: ITableColumn<TItem>): number => {
  if (column.width) {
    return column.width;
  }

  if (column.minWidth) {
    return column.minWidth;
  }

  const key = `${column.key} ${String(column.fieldName)} ${column.header}`.toLowerCase();

  if (column.renderType === 'document' || key.indexOf('document') !== -1 || key.indexOf('attachment') !== -1) {
    return 190;
  }

  if (column.renderType === 'amount') {
    return 132;
  }

  if (column.renderType === 'date' || key.indexOf('date') !== -1) {
    return 154;
  }

  if (column.renderType === 'status' || column.renderType === 'tag' || key.indexOf('status') !== -1 || key.indexOf('class') !== -1) {
    return 136;
  }

  if (key.indexOf('name') !== -1 || key.indexOf('title') !== -1 || key.indexOf('description') !== -1 || key.indexOf('customer') !== -1) {
    return 210;
  }

  if (key.indexOf('code') !== -1 || key.indexOf('number') !== -1 || key.indexOf('role') !== -1) {
    return 148;
  }

  return DEFAULT_COLUMN_WIDTH;
};

const getTextActionWidth = (label: string): number => {
  return Math.max(TEXT_ACTION_MIN_WIDTH, Math.min(112, (label.length * 6) + 28));
};

const getActionColumnWidth = <TItem,>(
  rowActions: readonly IEntityTableAction<TItem>[],
  overflowActions: readonly IEntityTableAction<TItem>[],
  hasRowClick: boolean,
  rowActionLabel: string
): number => {
  if (!hasRowClick && !rowActions.length && !overflowActions.length) {
    return 0;
  }

  const primaryWidth = hasRowClick ? getTextActionWidth(rowActionLabel) : (rowActions.length ? getTextActionWidth(rowActions[0].label) : 0);
  const compactRowActionCount = Math.max(0, rowActions.length - (hasRowClick ? 0 : 1));
  const compactButtonCount = compactRowActionCount + (overflowActions.length ? 1 : 0);
  const visibleButtonCount = (primaryWidth ? 1 : 0) + compactButtonCount;
  const gapWidth = Math.max(0, visibleButtonCount - 1) * ACTION_GAP_WIDTH;
  const calculatedWidth = primaryWidth + (compactButtonCount * ICON_ACTION_WIDTH) + gapWidth + ACTION_CELL_HORIZONTAL_PADDING;

  return Math.max(ACTION_COLUMN_WIDTH, calculatedWidth);
};

const getCellClassName = (align?: TableColumnAlign): string => {
  if (align === 'center') {
    return `${styles.cell} ${styles.alignCenter}`;
  }

  if (align === 'right') {
    return `${styles.cell} ${styles.alignRight}`;
  }

  return styles.cell;
};

const Icon: React.FC<IIconProps> = ({ name }) => {
  if (name === 'more') {
    return (
      <svg aria-hidden="true" className={styles.icon} focusable="false" viewBox="0 0 16 16">
        <circle cx="3.5" cy="8" r="1.1" />
        <circle cx="8" cy="8" r="1.1" />
        <circle cx="12.5" cy="8" r="1.1" />
      </svg>
    );
  }

  const paths: Record<IIconProps['name'], React.ReactNode> = {
    view: (
      <>
        <path d="M2.2 8s2.2-3.6 5.8-3.6S13.8 8 13.8 8 11.6 11.6 8 11.6 2.2 8 2.2 8Z" />
        <circle cx="8" cy="8" r="1.6" />
      </>
    ),
    edit: (
      <>
        <path d="M9.7 3.2 12.8 6.3" />
        <path d="M4.1 11.9 3 13l1.1-.2 7.8-7.8-1.9-1.9-7.8 7.8-.2 1.1Z" />
      </>
    ),
    delete: (
      <>
        <path d="M3.2 4.6h9.6" />
        <path d="M6.2 4.6V3.4h3.6v1.2" />
        <path d="M5 6.3v6.2h6V6.3" />
      </>
    ),
    download: (
      <>
        <path d="M8 2.8v6.5" />
        <path d="M5.6 7.1 8 9.5l2.4-2.4" />
        <path d="M3.6 12.6h8.8" />
      </>
    ),
    print: (
      <>
        <path d="M4.5 5V2.8h7V5" />
        <path d="M4.5 11.2H3.2V6.4h9.6v4.8h-1.3" />
        <path d="M4.5 9.2h7v4h-7z" />
        <path d="M10.8 7.6h.1" />
      </>
    ),
    previous: <path d="M9.8 3.8 5.6 8l4.2 4.2" />,
    next: <path d="M6.2 3.8 10.4 8l-4.2 4.2" />,
    more: null
  };

  return (
    <svg aria-hidden="true" className={styles.icon} fill="none" focusable="false" viewBox="0 0 16 16">
      {paths[name]}
    </svg>
  );
};

const SortIcon: React.FC<{ active?: boolean }> = ({ active = false }) => {
  return (
    <svg aria-hidden="true" className={active ? `${styles.sortIcon} ${styles.sortIconActive}` : styles.sortIcon} focusable="false" viewBox="0 0 16 16">
      <path d="M5 12V4" />
      <path d="M2.8 6.2 5 4l2.2 2.2" />
      <path d="M11 4v8" />
      <path d="M8.8 9.8 11 12l2.2-2.2" />
    </svg>
  );
};

const renderTag = (value: string): React.ReactNode => {
  const normalized = value.toLowerCase();
  let tone = styles.tagNeutral;

  if (normalized.indexOf('active') !== -1 || normalized.indexOf('approved') !== -1 || normalized.indexOf('paid') !== -1 || normalized.indexOf('all') !== -1) {
    tone = styles.tagSuccess;
  } else if (normalized.indexOf('pending') !== -1 || normalized.indexOf('draft') !== -1 || normalized.indexOf('hold') !== -1) {
    tone = styles.tagWarning;
  } else if (normalized.indexOf('reject') !== -1 || normalized.indexOf('cancel') !== -1 || normalized.indexOf('delete') !== -1) {
    tone = styles.tagDanger;
  } else if (normalized.indexOf('legal') !== -1 || normalized.indexOf('asset') !== -1) {
    tone = styles.tagPurple;
  } else if (normalized.indexOf('subscription') !== -1 || normalized.indexOf('service') !== -1) {
    tone = styles.tagBlue;
  }

  return (
    <span className={`${styles.tag} ${tone}`} title={value}>
      {value}
    </span>
  );
};

const renderDocumentCell = (value: unknown): React.ReactNode => {
  const documentValue = typeof value === 'object' && value !== null && 'name' in value
    ? value as IDocumentCellValue
    : { name: value ? String(value) : '-' };

  if (!documentValue.name || documentValue.name === '-') {
    return <span className={styles.fallback}>-</span>;
  }

  const content = (
    <>
      <Icon name="download" />
      <span className={styles.truncate}>{documentValue.name}</span>
    </>
  );

  if (documentValue.url) {
    return (
      <a className={styles.documentLink} href={documentValue.url} title={documentValue.name}>
        {content}
      </a>
    );
  }

  return (
    <span className={styles.documentLink} title={documentValue.name}>
      {content}
    </span>
  );
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

  if (column.renderType === 'tag') {
    return renderTag(typeof value === 'string' ? value : '-');
  }

  if (column.renderType === 'document') {
    return renderDocumentCell(value);
  }

  if (column.renderType === 'date') {
    return formatDate(typeof value === 'string' ? value : undefined);
  }

  if (value === undefined || value === null || value === '') {
    return <span className={styles.fallback}>-</span>;
  }

  return String(value);
};

const resolveActionState = <TItem,>(state: boolean | ((item: TItem) => boolean) | undefined, item: TItem): boolean => {
  return typeof state === 'function' ? state(item) : Boolean(state);
};

const renderActionButton = <TItem,>(item: TItem, action: IEntityTableAction<TItem>, compact: boolean): React.ReactNode => {
  const disabled = resolveActionState(action.disabled, item);
  const iconName = action.icon || (action.key === 'delete' ? 'delete' : action.key === 'edit' ? 'edit' : action.key === 'view' ? 'view' : 'more');

  return (
    <button
      aria-label={action.label}
      className={`${compact ? styles.iconButton : styles.viewButton} ${action.variant === 'danger' ? styles.dangerButton : ''}`}
      disabled={disabled}
      key={action.key}
      onClick={event => {
        event.stopPropagation();
        if (!disabled) {
          if (action.variant === 'danger' || action.key === 'delete') {
            const confirmed = window.confirm(`Are you sure you want to ${action.label.toLowerCase()}?`);

            if (!confirmed) {
              return;
            }
          }

          action.onClick(item);
        }
      }}
      title={action.label}
      type="button"
    >
      {compact ? <Icon name={iconName} /> : <><Icon name={iconName} /><span>{action.label}</span></>}
    </button>
  );
};

const getVisibleActions = <TItem,>(item: TItem, actions: readonly IEntityTableAction<TItem>[]): readonly IEntityTableAction<TItem>[] => {
  return actions.filter(action => {
    if (action.visible === undefined) {
      return true;
    }

    return resolveActionState(action.visible, item);
  });
};

const buildPageNumbers = (currentPage: number, totalPages: number): readonly (number | 'ellipsis')[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
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
  cursorPaginationState,
  onSort,
  onPageChange,
  onRowClick,
  getRowKey,
  actions,
  rowActionLabel = 'View details',
  rowActions = [],
  overflowActions = [],
  selectedRowKeys = [],
  onSelectionChange,
  selectionLabel = 'Select row',
  showGoToPage = true
}: IEntityTableProps<TItem>): React.ReactElement => {
  const [openOverflowRowKey, setOpenOverflowRowKey] = React.useState<string | undefined>();
  const totalPages = paginationState ? Math.max(1, Math.ceil(paginationState.totalCount / paginationState.pageSize)) : 1;
  const rowKeys = React.useMemo(() => items.map((item, index) => getRowKey(item, index)), [items, getRowKey]);
  const selectedKeys = React.useMemo(() => new Set(selectedRowKeys), [selectedRowKeys]);
  const hasSelection = Boolean(onSelectionChange);
  const tableActions: readonly IEntityTableAction<TItem>[] = onRowClick
    ? [{ key: 'view', label: rowActionLabel, icon: 'view', onClick: onRowClick }, ...rowActions]
    : rowActions;
  const hasActions = tableActions.length > 0 || overflowActions.length > 0;
  const actionColumnWidth = getActionColumnWidth(rowActions, overflowActions, Boolean(onRowClick), rowActionLabel);
  const totalTableWidth = columns.reduce((total, column) => total + getColumnWidth(column), hasSelection ? SELECTION_COLUMN_WIDTH : 0) + (hasActions ? actionColumnWidth : 0);

  const handleSort = (column: ITableColumn<TItem>): void => {
    if (!column.sortable || !onSort) {
      return;
    }

    const fieldName = String(column.fieldName);
    const isCurrentColumn = sortState && sortState.fieldName === fieldName;
    const nextDirection: SortDirection | undefined = !isCurrentColumn
      ? 'desc'
      : sortState.direction === 'desc'
        ? 'asc'
        : undefined;

    onSort(fieldName, nextDirection);
  };

  const handleSelectAll = (checked: boolean): void => {
    onSelectionChange?.(checked ? rowKeys : []);
  };

  const handleSelectRow = (rowKey: string, checked: boolean): void => {
    const nextKeys = new Set(selectedKeys);

    if (checked) {
      nextKeys.add(rowKey);
    } else {
      nextKeys.delete(rowKey);
    }

    onSelectionChange?.(Array.from(nextKeys));
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

  const firstRecord = paginationState ? ((paginationState.pageNumber - 1) * paginationState.pageSize) + 1 : 1;
  const lastRecord = paginationState ? Math.min(paginationState.totalCount, paginationState.pageNumber * paginationState.pageSize) : items.length;
  const totalRecords = paginationState ? paginationState.totalCount : items.length;
  const pageNumbers = buildPageNumbers(paginationState?.pageNumber || 1, totalPages);

  return (
    <div className={styles.tableShell}>
      {actions ? <div className={styles.toolbar}>{actions}</div> : null}
      <div className={styles.scrollArea}>
        <table className={styles.table} style={{ minWidth: totalTableWidth }}>
          <colgroup>
            {hasSelection ? <col style={{ width: SELECTION_COLUMN_WIDTH }} /> : null}
            {columns.map(column => <col key={column.key} style={{ width: getColumnWidth(column) }} />)}
            {hasActions ? <col style={{ width: actionColumnWidth }} /> : null}
          </colgroup>
          <thead>
            <tr>
              {hasSelection ? (
                <th className={styles.selectionHeader} scope="col">
                  <input
                    aria-label="Select all rows"
                    checked={items.length > 0 && rowKeys.every(rowKey => selectedKeys.has(rowKey))}
                    className={styles.checkbox}
                    onChange={event => {
                      const checked = event.currentTarget.checked;
                      handleSelectAll(checked);
                    }}
                    type="checkbox"
                  />
                </th>
              ) : null}
              {columns.map(column => {
                const isSorted = sortState && sortState.fieldName === String(column.fieldName);
                const headerClassName = getCellClassName(column.align);

                return (
                  <th
                    aria-sort={isSorted ? (sortState && sortState.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={headerClassName}
                    key={column.key}
                    scope="col"
                    style={{ maxWidth: column.maxWidth, minWidth: column.minWidth, width: getColumnWidth(column) }}
                    title={column.header}
                  >
                    {column.sortable ? (
                      <button
                        aria-label={`Sort by ${column.header}`}
                        className={styles.sortButton}
                        onClick={() => handleSort(column)}
                        type="button"
                      >
                        <span className={styles.truncate}>{column.header}</span>
                        <SortIcon active={Boolean(isSorted)} />
                      </button>
                    ) : (
                      <span className={styles.truncate}>{column.header}</span>
                    )}
                  </th>
                );
              })}
              {hasActions ? (
                <th className={styles.actionHeader} scope="col" style={{ width: actionColumnWidth }}>
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const rowKey = rowKeys[index];
              const visibleRowActions = getVisibleActions(item, tableActions);
              const visibleOverflowActions = getVisibleActions(item, overflowActions);

              return (
                <tr
                  className={`${onRowClick ? styles.clickableRow : ''} ${selectedKeys.has(rowKey) ? styles.selectedRow : ''}`}
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={event => {
                    if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onRowClick(item);
                    }
                  }}
                >
                  {hasSelection ? (
                    <td className={styles.selectionCell} onClick={event => event.stopPropagation()}>
                      <input
                        aria-label={`${selectionLabel} ${index + 1}`}
                        checked={selectedKeys.has(rowKey)}
                        className={styles.checkbox}
                        onChange={event => {
                          const checked = event.currentTarget.checked;
                          handleSelectRow(rowKey, checked);
                        }}
                        type="checkbox"
                      />
                    </td>
                  ) : null}
                  {columns.map((column, columnIndex) => {
                    const textValue = getTextValue(item, column);
                    const cellClassName = `${getCellClassName(column.align)} ${columnIndex === 0 ? styles.primaryCell : ''}`;

                    return (
                      <td className={cellClassName} key={column.key} style={{ maxWidth: column.maxWidth, minWidth: column.minWidth, width: getColumnWidth(column) }}>
                        <span className={styles.cellContent} title={textValue}>
                          {renderCell(item, column)}
                        </span>
                      </td>
                    );
                  })}
                  {hasActions ? (
                    <td className={styles.actionCell} onClick={event => event.stopPropagation()} style={{ width: actionColumnWidth }}>
                      <div className={styles.actionGroup}>
                        {visibleRowActions.slice(0, 3).map((action, actionIndex) => renderActionButton(item, action, actionIndex > 0 || action.key !== 'view'))}
                        {visibleOverflowActions.length ? (
                          <div className={styles.overflowWrapper}>
                            <button
                              aria-expanded={openOverflowRowKey === rowKey}
                              aria-haspopup="menu"
                              aria-label="More actions"
                              className={styles.iconButton}
                              onClick={event => {
                                event.stopPropagation();
                                setOpenOverflowRowKey(openOverflowRowKey === rowKey ? undefined : rowKey);
                              }}
                              title="More actions"
                              type="button"
                            >
                              <Icon name="more" />
                            </button>
                            {openOverflowRowKey === rowKey ? (
                              <div className={styles.overflowMenu} role="menu">
                                {visibleOverflowActions.map(action => {
                                  const disabled = resolveActionState(action.disabled, item);

                                  return (
                                    <button
                                      className={action.variant === 'danger' || action.key === 'delete' ? `${styles.overflowItem} ${styles.overflowItemDanger}` : styles.overflowItem}
                                      disabled={disabled}
                                      key={action.key}
                                      onClick={event => {
                                        event.stopPropagation();

                                        if (disabled) {
                                          return;
                                        }

                                        if (action.variant === 'danger' || action.key === 'delete') {
                                          const confirmed = window.confirm(`Are you sure you want to ${action.label.toLowerCase()}?`);

                                          if (!confirmed) {
                                            return;
                                          }
                                        }

                                        action.onClick(item);
                                        setOpenOverflowRowKey(undefined);
                                      }}
                                      role="menuitem"
                                      type="button"
                                    >
                                      {action.label}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {cursorPaginationState ? (
        <div className={styles.pagination}>
          <span className={styles.recordCount}>
            Showing up to <strong>{formatNullFallback(cursorPaginationState.pageSize)}</strong> records
          </span>
          <nav aria-label="Table pagination" className={styles.pageActions}>
            <button
              aria-label="Previous page"
              className={`${styles.pageButton} ${styles.cursorPageButton}`}
              disabled={loading || cursorPaginationState.pageNumber <= 1}
              onClick={() => onPageChange?.(cursorPaginationState.pageNumber - 1)}
              type="button"
            >
              Previous
            </button>
            <span aria-current="page" className={styles.cursorPageLabel}>
              Page {cursorPaginationState.pageNumber}
            </span>
            <button
              aria-label="Next page"
              className={`${styles.pageButton} ${styles.cursorPageButton}`}
              disabled={loading || !cursorPaginationState.hasNext || !cursorPaginationState.nextToken}
              onClick={() => onPageChange?.(cursorPaginationState.pageNumber + 1)}
              type="button"
            >
              Next
            </button>
          </nav>
          <span className={styles.paginationSpacer} aria-hidden="true" />
        </div>
      ) : paginationState ? (
        <div className={styles.pagination}>
          <span className={styles.recordCount}>
            Showing <strong>{formatNullFallback(firstRecord)}-{formatNullFallback(lastRecord)}</strong> of {formatNullFallback(totalRecords)} records
          </span>
          <nav aria-label="Table pagination" className={styles.pageActions}>
            <button
              aria-label="Previous page"
              className={styles.pageButton}
              disabled={paginationState.pageNumber <= 1}
              onClick={() => onPageChange?.(paginationState.pageNumber - 1)}
              type="button"
            >
              <Icon name="previous" />
            </button>
            {pageNumbers.map((pageNumber, index) => pageNumber === 'ellipsis' ? (
              <span className={styles.pageEllipsis} key={`ellipsis-${index}`}>...</span>
            ) : (
              <button
                aria-current={pageNumber === paginationState.pageNumber ? 'page' : undefined}
                aria-label={`Page ${pageNumber}`}
                className={pageNumber === paginationState.pageNumber ? `${styles.pageButton} ${styles.pageButtonActive}` : styles.pageButton}
                key={pageNumber}
                onClick={() => onPageChange?.(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              aria-label="Next page"
              className={styles.pageButton}
              disabled={paginationState.pageNumber >= totalPages}
              onClick={() => onPageChange?.(paginationState.pageNumber + 1)}
              type="button"
            >
              <Icon name="next" />
            </button>
          </nav>
          {showGoToPage ? (
            <label className={styles.goToPage}>
              <span>Go to page</span>
              <input
                aria-label="Go to page"
                max={totalPages}
                min={1}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    const page = Number(event.currentTarget.value);

                    if (Number.isFinite(page) && page >= 1 && page <= totalPages) {
                      onPageChange?.(page);
                    }
                  }
                }}
                type="number"
              />
            </label>
          ) : <span className={styles.paginationSpacer} aria-hidden="true" />}
        </div>
      ) : null}
    </div>
  );
};
