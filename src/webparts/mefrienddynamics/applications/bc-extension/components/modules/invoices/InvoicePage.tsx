import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
import { useCursorPagination } from '../../../../../shared/hooks/useCursorPagination';
import type { IInvoiceDetail, IInvoiceFilters, IInvoiceListItem } from '../../../models/invoices';
import type { IAppUser } from '../../../models/settings/IAppAccessModels';
import { isMefriendBusinessSolutionsCompany, type BcCompany } from '../../../config/bcCompanies';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { InvoiceService } from '../../../services/invoices/invoiceService';
import type { IItemMasterLookupItem, ItemMasterService } from '../../../services/itemMasters';
import type { SalespersonService } from '../../../services/salespersons/salespersonService';
import type { SalesOrderRequestService } from '../../../services/sharepoint/salesOrderRequestService';
import { useSalespersonFilter } from '../../../hooks/useSalespersonFilter';
import { buildInvoiceDetailPath, requireInvoiceNumber } from '../../../utils/invoiceReference';
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
import { enrichInvoiceLinesForPrint } from './invoicePrintUtils';

export interface IInvoicePageProps {
  currentUser?: IAppUser;
  itemMasterService: ItemMasterService;
  invoiceService: InvoiceService;
  salesOrderRequestService: SalesOrderRequestService;
  selectedCompany?: BcCompany;
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
  invoiceDateFrom: typeof values.invoiceDateFrom === 'string' ? values.invoiceDateFrom : undefined,
  invoiceDateTo: typeof values.invoiceDateTo === 'string' ? values.invoiceDateTo : undefined
});

const getListErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Invoice listing API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const InvoicePage: React.FC<IInvoicePageProps> = ({
  currentUser,
  itemMasterService,
  invoiceService,
  selectedCompany,
  salespersonService,
  onNavigate
}) => {
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
  const itemMasterLookupPromiseRef = React.useRef<Promise<readonly IItemMasterLookupItem[]> | undefined>();

  const getItemMasterLookup = React.useCallback((): Promise<readonly IItemMasterLookupItem[]> => {
    if (!itemMasterLookupPromiseRef.current) {
      itemMasterLookupPromiseRef.current = itemMasterService.getItemMasterLookup().then(result => result.items);
    }

    return itemMasterLookupPromiseRef.current;
  }, [itemMasterService]);

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

  const loadPrintableInvoice = React.useCallback(async (invoiceNumber: string): Promise<IInvoiceDetail> => {
    const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber, currentUser);
    const itemMasters = await getItemMasterLookup().catch(() => []);

    return {
      ...invoice,
      lines: enrichInvoiceLinesForPrint(invoice.lines, [], itemMasters)
    };
  }, [currentUser, getItemMasterLookup, invoiceService]);

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
    let invoiceNumber: string;
    let preview: Window | undefined;

    if (documentActionsInProgress.current.size) {
      return;
    }

    try {
      invoiceNumber = requireInvoiceNumber(item.invoiceNumber);
    } catch (referenceError) {
      toast.error(getUserFriendlyError(normalizeError(referenceError)), { title: 'Unable to print invoice' });
      return;
    }

    documentActionsInProgress.current.add(invoiceNumber);
    setDocumentAction({ type: 'print' });

    try {
      preview = openInvoicePrintPreviewWindow();
      const printableInvoice = await loadPrintableInvoice(invoiceNumber);

      await writeInvoicePrintPreview(preview, printableInvoice);
      await printInvoice(printableInvoice, preview);
    } catch (printError) {
      const message = getUserFriendlyError(normalizeError(printError));
      toast.error(message, { title: 'Unable to print invoice' });
      if (preview) {
        writeInvoicePrintError(preview, message);
      }
    } finally {
      documentActionsInProgress.current.delete(invoiceNumber);
      setDocumentAction(undefined);
    }
  }, [loadPrintableInvoice, toast]);

  const handleDownload = React.useCallback(async (item: IInvoiceListItem): Promise<void> => {
    let invoiceNumber: string;

    if (documentActionsInProgress.current.size) {
      return;
    }

    try {
      invoiceNumber = requireInvoiceNumber(item.invoiceNumber);
    } catch (referenceError) {
      toast.error(getUserFriendlyError(normalizeError(referenceError)), { title: 'Unable to download invoice' });
      return;
    }

    documentActionsInProgress.current.add(invoiceNumber);
    setDocumentAction({ type: 'download' });

    try {
      const downloadableInvoice = await loadPrintableInvoice(invoiceNumber);

      await downloadInvoicePdf(downloadableInvoice);
      toast.success('Invoice PDF download started.', { title: downloadableInvoice.invoiceNumber || 'Invoice' });
    } catch (downloadError) {
      toast.error(getUserFriendlyError(normalizeError(downloadError)), { title: 'Unable to download invoice' });
    } finally {
      documentActionsInProgress.current.delete(invoiceNumber);
      setDocumentAction(undefined);
    }
  }, [loadPrintableInvoice, toast]);

  const handleRowClick = React.useCallback((item: IInvoiceListItem): void => {
    try {
      onNavigate(buildInvoiceDetailPath(item.invoiceNumber));
    } catch (referenceError) {
      toast.error(getUserFriendlyError(normalizeError(referenceError)), { title: 'Unable to open invoice' });
    }
  }, [onNavigate, toast]);

  const showDocumentActions = isMefriendBusinessSolutionsCompany(selectedCompany);

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
          ? handleRowClick
          : undefined
      }
      rowActions={showDocumentActions ? [
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
      ] : undefined}
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      cursorPagination={pagination}
      onPageChange={changePage}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={item => item.id}
      emptyTitle="No invoices found"
      emptyMessage="No invoice records are available from the configured service."
    />
  );
};
