import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
import { useCursorPagination } from '../../../../../shared/hooks/useCursorPagination';
import type { IInvoiceDetail, IInvoiceFilters, IInvoiceListItem, PaymentStatus } from '../../../models/invoices';
import type { IAppUser } from '../../../models/settings/IAppAccessModels';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { InvoiceService } from '../../../services/invoices/invoiceService';
import type { SalespersonService } from '../../../services/salespersons/salespersonService';
import { useSalespersonFilter } from '../../../hooks/useSalespersonFilter';
import { EntityDashboard } from '../../../../../shared/components/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../../../../shared/components/filters/EntityFilters';
import { useToast } from '../../../../../shared/components/toast/useToast';
import {
  downloadInvoicePdf,
  openInvoicePrintPreviewWindow,
  printInvoice,
  writeInvoicePrintError,
  writeInvoicePrintPreview
} from './invoicePrintTemplate';

export interface IInvoicePageProps {
  currentUser?: IAppUser;
  invoiceService: InvoiceService;
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

interface IInvoiceDocumentAction {
  type: 'download' | 'print';
}

const toInvoiceFilters = (values: EntityFilterValues): IInvoiceFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  customerCode: typeof values.customerCode === 'string' ? values.customerCode : undefined,
  salespersonCode: typeof values.salespersonCode === 'string' ? values.salespersonCode : undefined,
  salesOrderNumber: typeof values.salesOrderNumber === 'string' ? values.salesOrderNumber : undefined,
  invoiceStatus: typeof values.invoiceStatus === 'string' ? values.invoiceStatus : undefined,
  paymentStatus: typeof values.paymentStatus === 'string' ? (values.paymentStatus as PaymentStatus) : undefined,
  invoiceDateFrom: typeof values.invoiceDateFrom === 'string' ? values.invoiceDateFrom : undefined,
  invoiceDateTo: typeof values.invoiceDateTo === 'string' ? values.invoiceDateTo : undefined,
  dueDateFrom: typeof values.dueDateFrom === 'string' ? values.dueDateFrom : undefined,
  dueDateTo: typeof values.dueDateTo === 'string' ? values.dueDateTo : undefined,
  outstandingOnly: values.outstandingOnly === true
});

const getListErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Invoice listing API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

const normalizeInvoiceDescriptions = (invoice: IInvoiceDetail): IInvoiceDetail => ({
  ...invoice,
  lines: invoice.lines.map(line => ({
    ...line,
    description: line.description || line.itemCode || ''
  }))
});

export const InvoicePage: React.FC<IInvoicePageProps> = ({ currentUser, invoiceService, salespersonService, onNavigate }) => {
  const toast = useToast();
  const { filters, restrictedSalespersonCode } = useSalespersonFilter(
    invoicesModuleConfig.filters || [],
    salespersonService,
    currentUser
  );
  const initialFilterValues = restrictedSalespersonCode ? { salespersonCode: restrictedSalespersonCode } : {};
  const [items, setItems] = React.useState<readonly IInvoiceListItem[]>([]);
  const [filterValues, setFilterValues] = React.useState<EntityFilterValues>(initialFilterValues);
  const [appliedFilterValues, setAppliedFilterValues] = React.useState<EntityFilterValues>(initialFilterValues);
  const { pagination, applyResult, changePage, reset } = useCursorPagination();
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const [documentAction, setDocumentAction] = React.useState<IInvoiceDocumentAction | undefined>();
  const documentActionsInProgress = React.useRef<Set<string>>(new Set());
  const loadInvoices = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const filters = toInvoiceFilters(appliedFilterValues);
      const result = await invoiceService.getInvoices(filters, pagination, sorting, currentUser);

      setItems(result.items);
      applyResult(result);
    } catch (loadError) {
      setItems([]);
      setError(getListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, applyResult, currentUser, invoiceService, pagination.currentToken, pagination.pageNumber, pagination.pageSize, sorting]);

  React.useEffect(() => {
    loadInvoices().catch(() => undefined);
  }, [loadInvoices]);

  React.useEffect(() => {
    if (!restrictedSalespersonCode) {
      return;
    }

    setFilterValues(current => ({ ...current, salespersonCode: restrictedSalespersonCode }));
    setAppliedFilterValues(current => ({ ...current, salespersonCode: restrictedSalespersonCode }));
  }, [restrictedSalespersonCode]);

  const handleFilterChange = React.useCallback((key: string, value: FilterValue): void => {
    if (key === 'salespersonCode' && currentUser?.isSalesperson === true) {
      return;
    }

    setFilterValues(current => ({
      ...current,
      [key]: value
    }));
  }, [currentUser?.isSalesperson]);

  const handleFilterApply = React.useCallback((): void => {
    reset();
    setAppliedFilterValues(restrictedSalespersonCode
      ? { ...filterValues, salespersonCode: restrictedSalespersonCode }
      : filterValues);
  }, [filterValues, reset, restrictedSalespersonCode]);

  const handleFilterClear = React.useCallback((): void => {
    const clearedValues = restrictedSalespersonCode ? { salespersonCode: restrictedSalespersonCode } : {};
    setFilterValues(clearedValues);
    setAppliedFilterValues(clearedValues);
    reset();
  }, [reset, restrictedSalespersonCode]);

  const handleSort = React.useCallback((fieldName: string, direction?: SortDirection): void => {
    setSorting(direction ? {
      fieldName,
      direction
    } : undefined);
    reset();
  }, [reset]);

  const handlePrint = React.useCallback(async (item: IInvoiceListItem): Promise<void> => {
    const invoiceId = item.id || item.invoiceNumber;
    let preview: Window | undefined;

    if (documentActionsInProgress.current.size) {
      return;
    }

    documentActionsInProgress.current.add(invoiceId);
    setDocumentAction({ type: 'print' });

    try {
      preview = openInvoicePrintPreviewWindow();
      const printableInvoice = normalizeInvoiceDescriptions(await invoiceService.getInvoiceById(invoiceId, currentUser));

      await writeInvoicePrintPreview(preview, printableInvoice);
      await printInvoice(printableInvoice, preview);
    } catch (printError) {
      const message = getUserFriendlyError(normalizeError(printError));
      toast.error(message, { title: 'Unable to print invoice' });
      if (preview) {
        writeInvoicePrintError(preview, message);
      }
    } finally {
      documentActionsInProgress.current.delete(invoiceId);
      setDocumentAction(undefined);
    }
  }, [currentUser, invoiceService, toast]);

  const handleDownload = React.useCallback(async (item: IInvoiceListItem): Promise<void> => {
    const invoiceId = item.id || item.invoiceNumber;

    if (documentActionsInProgress.current.size) {
      return;
    }

    documentActionsInProgress.current.add(invoiceId);
    setDocumentAction({ type: 'download' });

    try {
      const invoice = await invoiceService.getInvoiceById(invoiceId, currentUser);
      const downloadableInvoice = normalizeInvoiceDescriptions(invoice);

      await downloadInvoicePdf(downloadableInvoice);
      toast.success('Invoice PDF download started.', { title: invoice.invoiceNumber || 'Invoice' });
    } catch (downloadError) {
      toast.error(getUserFriendlyError(normalizeError(downloadError)), { title: 'Unable to download invoice' });
    } finally {
      documentActionsInProgress.current.delete(invoiceId);
      setDocumentAction(undefined);
    }
  }, [currentUser, invoiceService, toast]);

  const outstandingOnlyActive = appliedFilterValues.outstandingOnly === true;

  return (
    <EntityDashboard<IInvoiceListItem>
      title={invoicesModuleConfig.title}
      subtitle={invoicesModuleConfig.description}
      columns={invoicesModuleConfig.tableColumns || []}
      filters={filters}
      filterValues={filterValues}
      items={items}
      loading={loading}
      error={error}
      onRowClick={
        invoicesModuleConfig.detailEnabled
          ? item => onNavigate(`${invoicesModuleConfig.route}/detail/${encodeURIComponent(item.id || item.invoiceNumber)}`)
          : undefined
      }
      rowActions={[
        {
          key: 'print',
          label: documentAction?.type === 'print' ? 'Preparing print...' : 'Print',
          icon: 'print',
          disabled: () => Boolean(documentAction),
          onClick: item => {
            handlePrint(item).catch(() => undefined);
          }
        },
        {
          key: 'download',
          label: documentAction?.type === 'download' ? 'Downloading...' : 'Download',
          icon: 'download',
          disabled: () => Boolean(documentAction),
          onClick: item => {
            handleDownload(item).catch(() => undefined);
          }
        }
      ]}
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      cursorPagination={pagination}
      onPageChange={changePage}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.id || item.invoiceNumber || String(index)}
      emptyTitle={outstandingOnlyActive ? 'No outstanding invoices found.' : 'No invoices found'}
      emptyMessage={
        outstandingOnlyActive
          ? 'No outstanding invoices found.'
          : 'No invoice records are available from the configured service.'
      }
    />
  );
};
