import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import type { IPaginationState } from '../../../models/common/IPaginationState';
import type { ISortState, SortDirection } from '../../../models/common/ISortState';
import type { IInvoiceDetail, IInvoiceFilters, IInvoiceListItem, PaymentStatus } from '../../../models/invoices';
import type { IAppUser } from '../../../models/settings/IAppAccessModels';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { InvoiceService } from '../../../services/invoices/invoiceService';
import type { IItemMasterLookupItem, ItemMasterService } from '../../../services/itemMasters';
import type { ISalespersonLookupItem, SalespersonService } from '../../../services/salespersons/salespersonService';
import { useSalespersonFilter } from '../../../hooks/useSalespersonFilter';
import { EntityDashboard } from '../../common/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../common/filters/EntityFilters';
import { useToast } from '../../common/toast/useToast';
import {
  downloadInvoicePdf,
  openInvoicePrintPreviewWindow,
  printInvoice,
  writeInvoicePrintError,
  writeInvoicePrintPreview
} from './invoicePrintTemplate';

export interface IInvoicePageProps {
  currentUser?: IAppUser;
  itemMasterService: ItemMasterService;
  invoiceService: InvoiceService;
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

const pageSize = 10;

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

const findSalespersonName = (
  salespersons: readonly ISalespersonLookupItem[],
  salespersonValue?: string
): string | undefined => {
  const normalizedValue = (salespersonValue || '').trim().toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  const matchingSalesperson = salespersons.find(item => item.code.trim().toLowerCase() === normalizedValue);

  return matchingSalesperson?.name || undefined;
};

const findItemDescription = (
  itemMasters: readonly IItemMasterLookupItem[],
  itemCode?: string
): string | undefined => {
  const normalizedCode = (itemCode || '').trim().toLowerCase();

  if (!normalizedCode) {
    return undefined;
  }

  const matchingItem = itemMasters.find(item => item.number.trim().toLowerCase() === normalizedCode);

  return matchingItem?.description || undefined;
};

const enrichInvoiceItemDescriptions = (
  invoice: IInvoiceDetail,
  itemMasters: readonly IItemMasterLookupItem[]
): IInvoiceDetail => ({
  ...invoice,
  lines: invoice.lines.map(line => ({
    ...line,
    description: line.description || findItemDescription(itemMasters, line.itemCode) || line.itemCode || ''
  }))
});

export const InvoicePage: React.FC<IInvoicePageProps> = ({ currentUser, itemMasterService, invoiceService, salespersonService, onNavigate }) => {
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
  const [pagination, setPagination] = React.useState<IPaginationState>({
    pageNumber: 1,
    pageSize,
    totalCount: 0
  });
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const [documentAction, setDocumentAction] = React.useState<IInvoiceDocumentAction | undefined>();
  const documentActionsInProgress = React.useRef<Set<string>>(new Set());
  const itemMasterLookupPromiseRef = React.useRef<Promise<readonly IItemMasterLookupItem[]> | undefined>();
  const salespersonLookupPromiseRef = React.useRef<Promise<readonly ISalespersonLookupItem[]> | undefined>();

  const getItemMasterLookup = React.useCallback((): Promise<readonly IItemMasterLookupItem[]> => {
    if (!itemMasterLookupPromiseRef.current) {
      itemMasterLookupPromiseRef.current = itemMasterService.getItemMasterLookup();
    }

    return itemMasterLookupPromiseRef.current;
  }, [itemMasterService]);

  const getSalespersonLookup = React.useCallback((): Promise<readonly ISalespersonLookupItem[]> => {
    if (!salespersonLookupPromiseRef.current) {
      salespersonLookupPromiseRef.current = salespersonService.getSalespersonLookup();
    }

    return salespersonLookupPromiseRef.current;
  }, [salespersonService]);

  const loadInvoices = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const filters = toInvoiceFilters(appliedFilterValues);
      const result = await invoiceService.getInvoices(filters, pagination, sorting, currentUser);

      setItems(result.items);
      setPagination(current => ({
        ...current,
        pageNumber: result.pageNumber || current.pageNumber,
        pageSize: result.pageSize || current.pageSize,
        totalCount: result.totalCount || 0
      }));
    } catch (loadError) {
      setItems([]);
      setError(getListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, currentUser, invoiceService, pagination.pageNumber, pagination.pageSize, sorting]);

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
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
    setAppliedFilterValues(restrictedSalespersonCode
      ? { ...filterValues, salespersonCode: restrictedSalespersonCode }
      : filterValues);
  }, [filterValues, restrictedSalespersonCode]);

  const handleFilterClear = React.useCallback((): void => {
    const clearedValues = restrictedSalespersonCode ? { salespersonCode: restrictedSalespersonCode } : {};
    setFilterValues(clearedValues);
    setAppliedFilterValues(clearedValues);
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
  }, [restrictedSalespersonCode]);

  const handleSort = React.useCallback((fieldName: string, direction?: SortDirection): void => {
    setSorting(direction ? {
      fieldName,
      direction
    } : undefined);
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
  }, []);

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
      const invoice = await invoiceService.getInvoiceById(invoiceId, currentUser);
      const [salespersons, itemMasters] = await Promise.all([
        getSalespersonLookup().catch(() => []),
        getItemMasterLookup().catch(() => [])
      ]);
      const salespersonName = findSalespersonName(salespersons, invoice.salespersonCode || invoice.salesPerson);
      const invoiceWithItemDescriptions = enrichInvoiceItemDescriptions(invoice, itemMasters);
      const printableInvoice = salespersonName
        ? { ...invoiceWithItemDescriptions, salesPerson: salespersonName }
        : invoiceWithItemDescriptions;

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
  }, [currentUser, getItemMasterLookup, getSalespersonLookup, invoiceService, toast]);

  const handleDownload = React.useCallback(async (item: IInvoiceListItem): Promise<void> => {
    const invoiceId = item.id || item.invoiceNumber;

    if (documentActionsInProgress.current.size) {
      return;
    }

    documentActionsInProgress.current.add(invoiceId);
    setDocumentAction({ type: 'download' });

    try {
      const invoice = await invoiceService.getInvoiceById(invoiceId, currentUser);
      const [salespersons, itemMasters] = await Promise.all([
        getSalespersonLookup().catch(() => []),
        getItemMasterLookup().catch(() => [])
      ]);
      const salespersonName = findSalespersonName(salespersons, invoice.salespersonCode || invoice.salesPerson);
      const invoiceWithItemDescriptions = enrichInvoiceItemDescriptions(invoice, itemMasters);
      const downloadableInvoice = salespersonName
        ? { ...invoiceWithItemDescriptions, salesPerson: salespersonName }
        : invoiceWithItemDescriptions;

      await downloadInvoicePdf(downloadableInvoice);
      toast.success('Invoice PDF download started.', { title: invoice.invoiceNumber || 'Invoice' });
    } catch (downloadError) {
      toast.error(getUserFriendlyError(normalizeError(downloadError)), { title: 'Unable to download invoice' });
    } finally {
      documentActionsInProgress.current.delete(invoiceId);
      setDocumentAction(undefined);
    }
  }, [currentUser, getItemMasterLookup, getSalespersonLookup, invoiceService, toast]);

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
      pagination={pagination}
      onPageChange={pageNumber => setPagination(current => ({ ...current, pageNumber }))}
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
