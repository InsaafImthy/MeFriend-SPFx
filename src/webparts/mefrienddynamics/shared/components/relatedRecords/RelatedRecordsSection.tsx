import * as React from 'react';
import type { ITableColumn } from '../../models/ITableColumn';
import { EntityTable } from '../table/EntityTable';
import styles from './RelatedRecordsSection.module.scss';

export interface IRelatedRecordsSectionProps<TItem> {
  title: string;
  subtitle?: string;
  items: readonly TItem[];
  columns: readonly ITableColumn<TItem>[];
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  onRowClick?: (item: TItem) => void;
  getRowKey: (item: TItem, index: number) => string;
}

export const RelatedRecordsSection = <TItem,>({
  title,
  subtitle,
  items,
  columns,
  loading = false,
  error,
  emptyTitle = 'No related records',
  emptyMessage = 'No related records are available.',
  onRowClick,
  getRowKey
}: IRelatedRecordsSectionProps<TItem>): React.ReactElement => (
  <section className={styles.relatedRecords}>
    <div className={styles.header}>
      <h3>{title}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
    <EntityTable
      columns={columns}
      items={items}
      loading={loading}
      error={error}
      emptyTitle={emptyTitle}
      emptyMessage={emptyMessage}
      onRowClick={onRowClick}
      getRowKey={getRowKey}
    />
  </section>
);
