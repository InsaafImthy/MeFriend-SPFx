import * as React from 'react';
import type { IFilterConfig } from '../../../models/common/IFilterConfig';
import type { IPaginationState } from '../../../models/common/IPaginationState';
import type { ISortState, SortDirection } from '../../../models/common/ISortState';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import { Button, ButtonVariant } from '../buttons/Button';
import { EntityFilters, EntityFilterValues, FilterValue } from '../filters/EntityFilters';
import { PageContainer } from '../pageContainer/PageContainer';
import { EntityTable } from '../table/EntityTable';
import styles from './EntityDashboard.module.scss';

export interface IEntityDashboardCreateButtonConfig {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  visible?: boolean;
}

export interface IEntityDashboardProps<TItem> {
  title: string;
  subtitle?: string;
  columns: readonly ITableColumn<TItem>[];
  filters?: readonly IFilterConfig[];
  filterValues?: EntityFilterValues;
  items: readonly TItem[];
  loading?: boolean;
  error?: string;
  createButton?: IEntityDashboardCreateButtonConfig;
  onCreate?: () => void;
  onRowClick?: (item: TItem) => void;
  onFilterChange?: (key: string, value: FilterValue) => void;
  onFilterApply?: () => void;
  onFilterClear?: () => void;
  pagination?: IPaginationState;
  onPageChange?: (pageNumber: number) => void;
  sorting?: ISortState;
  onSort?: (fieldName: string, direction?: SortDirection) => void;
  getRowKey: (item: TItem, index: number) => string;
  emptyTitle?: string;
  emptyMessage?: string;
}

export const EntityDashboard = <TItem,>({
  title,
  subtitle,
  columns,
  filters = [],
  filterValues = {},
  items,
  loading = false,
  error,
  createButton,
  onCreate,
  onRowClick,
  onFilterChange,
  onFilterApply,
  onFilterClear,
  pagination,
  onPageChange,
  sorting,
  onSort,
  getRowKey,
  emptyTitle,
  emptyMessage
}: IEntityDashboardProps<TItem>): React.ReactElement => {
  const actions = createButton && createButton.visible !== false ? (
    <Button
      label={createButton.label}
      variant={createButton.variant || 'primary'}
      disabled={createButton.disabled}
      onClick={onCreate}
    />
  ) : undefined;

  return (
    <PageContainer title={title} description={subtitle} actions={actions}>
      <div className={styles.dashboard}>
        {filters.length && onFilterChange && onFilterApply && onFilterClear ? (
          <EntityFilters
            filters={filters}
            values={filterValues}
            onChange={onFilterChange}
            onApply={onFilterApply}
            onClear={onFilterClear}
            loading={loading}
          />
        ) : null}
        <EntityTable
          columns={columns}
          items={items}
          loading={loading}
          error={error}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
          sortState={sorting}
          paginationState={pagination}
          onSort={onSort}
          onPageChange={onPageChange}
          onRowClick={onRowClick}
          getRowKey={getRowKey}
        />
      </div>
    </PageContainer>
  );
};
