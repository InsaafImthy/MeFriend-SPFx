import * as React from 'react';
import {
  salesOrderLineItemFields,
  salesOrdersModuleConfig
} from '../../../config/modules/salesOrdersModuleConfig';
import type { IFormFieldConfig } from '../../../models/common/IFormFieldConfig';
import type { ILookupOption } from '../../../models/common/ILookupOption';
import type { IEventListItem } from '../../../models/events';
import type { ISalesOrderCreateFormState, ISalesOrderLineItem } from '../../../models/salesOrders';
import type { IMasterCodeItem } from '../../../models/settings/IMasterDataModels';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { CustomerService, ICustomerLookupItem } from '../../../services/customers/customerService';
import type { EventService } from '../../../services/events/eventService';
import type { IItemMasterLookupItem, ItemMasterService } from '../../../services/itemMasters';
import type { ISalespersonLookupItem, SalespersonService } from '../../../services/salespersons/salespersonService';
import type { ApprovalProcessingService } from '../../../services/sharepoint/approvalProcessingService';
import type { MasterDataService } from '../../../services/sharepoint/masterDataService';
import type { RequestSubmissionService } from '../../../services/sharepoint/requestSubmissionService';
import type { EntityFormErrors, EntityFormValue, EntityFormValues } from '../../../utils/validationUtils';
import { hasValidationErrors, validateFormValues } from '../../../utils/validationUtils';
import { Button } from '../../common/buttons/Button';
import { ConfirmationDialog } from '../../common/confirmationDialog/ConfirmationDialog';
import { EntityForm, LineItemsEditor, LineItemRecord } from '../../common/forms';
import { InputField } from '../../common/inputs/InputField';
import { PageContainer } from '../../common/pageContainer/PageContainer';
import { useToast } from '../../common/toast/useToast';
import styles from './SalesOrderCreatePage.module.scss';

export interface ISalesOrderCreatePageProps {
  approvalProcessingService?: ApprovalProcessingService;
  customerService: CustomerService;
  eventService: EventService;
  itemMasterService: ItemMasterService;
  masterDataService: MasterDataService;
  requestSubmissionService: RequestSubmissionService;
  resubmitRequestId?: string;
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

interface ISalesOrderLineFormItem extends LineItemRecord {
  lineNumber: string;
  itemCode: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  lineDiscountPercentage?: number;
  lineAmount?: number;
  taxAmount?: number;
}

const eventLookupPageSize = 100;
type InvoiceDiscountMode = 'amount' | 'percent';

const getStringValue = (values: EntityFormValues, key: keyof ISalesOrderCreateFormState): string => {
  const value = values[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

const getNumberValue = (value: EntityFormValue): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const toOptionalNumberValue = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const roundCurrency = (value: number): number => Number(value.toFixed(2));

const roundPercent = (value: number): number => Number(value.toFixed(4));

const calculateLineNetAmount = (item: ISalesOrderLineFormItem): number | undefined => {
  const quantity = getNumberValue(item.quantity);
  const unitPrice = getNumberValue(item.unitPrice);
  const lineDiscountPercentage = getNumberValue(item.lineDiscountPercentage);

  if (quantity <= 0 || unitPrice < 0) {
    return undefined;
  }

  const grossAmount = quantity * unitPrice;
  return roundCurrency(grossAmount - ((grossAmount * lineDiscountPercentage) / 100));
};

const calculateLinesSubtotal = (items: readonly ISalesOrderLineFormItem[]): number => {
  return roundCurrency(items.reduce((total, item) => total + getNumberValue(calculateLineNetAmount(item)), 0));
};

const calculateDiscountAmountFromPercent = (subtotal: number, percent: number | undefined): number => {
  return roundCurrency((subtotal * getNumberValue(percent)) / 100);
};

const calculateDiscountPercentFromAmount = (subtotal: number, amount: number | undefined): number => {
  return subtotal > 0 ? roundPercent((getNumberValue(amount) / subtotal) * 100) : 0;
};

const createDefaultLine = (lineNumber: number): ISalesOrderLineFormItem => ({
  lineNumber: String(lineNumber),
  itemCode: '',
  description: '',
  quantity: undefined,
  unitPrice: undefined,
  lineDiscountPercentage: undefined,
  lineAmount: undefined,
  taxAmount: undefined
});

const calculateLine = (item: ISalesOrderLineFormItem): ISalesOrderLineFormItem => {
  const lineAmount = calculateLineNetAmount(item);

  return {
    ...item,
    lineAmount
  };
};

const validateLine = (item: ISalesOrderLineFormItem): EntityFormErrors => {
  const errors = validateFormValues(salesOrderLineItemFields as readonly IFormFieldConfig[], item);

  if (item.quantity !== undefined && item.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than zero.';
  }

  if (item.unitPrice !== undefined && item.unitPrice < 0) {
    errors.unitPrice = 'Unit price/rate cannot be negative.';
  }

  if (item.lineDiscountPercentage !== undefined && (item.lineDiscountPercentage < 0 || item.lineDiscountPercentage > 100)) {
    errors.lineDiscountPercentage = 'Line discount must be between 0 and 100%.';
  }

  return errors;
};

const hasLineValidationErrors = (lines: readonly ISalesOrderLineFormItem[]): boolean => {
  return lines.length === 0 || lines.filter(line => hasValidationErrors(validateLine(line))).length > 0;
};

const toSalesOrderLineItem = (line: ISalesOrderLineFormItem, index: number): ISalesOrderLineItem => ({
  lineNumber: line.lineNumber || String(index + 1),
  itemCode: line.itemCode.trim(),
  description: line.description.trim(),
  quantity: getNumberValue(line.quantity),
  unitPrice: getNumberValue(line.unitPrice),
  lineDiscountPercentage: getNumberValue(line.lineDiscountPercentage),
  lineAmount: getNumberValue(line.lineAmount),
  taxAmount: line.taxAmount
});

const toSalesOrderFormState = (
  values: EntityFormValues,
  lines: readonly ISalesOrderLineFormItem[],
  invoiceDiscountAmountExclVat: number,
  invoiceDiscountPercent: number
): ISalesOrderCreateFormState => ({
  customerCode: getStringValue(values, 'customerCode'),
  billToCustomerCode: getStringValue(values, 'billToCustomerCode'),
  salespersonCode: getStringValue(values, 'salespersonCode'),
  eventCode: getStringValue(values, 'eventCode'),
  countryCode: getStringValue(values, 'countryCode'),
  stateCode: getStringValue(values, 'stateCode'),
  orderDate: getStringValue(values, 'orderDate'),
  postingDate: getStringValue(values, 'postingDate'),
  externalDocumentNumber: getStringValue(values, 'externalDocumentNumber'),
  remarks: getStringValue(values, 'remarks'),
  invoiceDiscountAmountExclVat,
  invoiceDiscountPercent,
  lines: lines.map(toSalesOrderLineItem)
});

const toCustomerOptions = (items: readonly ICustomerLookupItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.no,
    text: item.name ? `${item.no} - ${item.name}` : item.no,
    value: item.no,
    description: item.name
  }));

const toEventOptions = (items: readonly IEventListItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.eventCode || item.id,
    text: item.eventName ? `${item.eventName} (${item.eventCode})` : item.eventCode,
    value: item.eventCode
  }));

const toSalespersonOptions = (items: readonly ISalespersonLookupItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.code,
    text: item.name ? `${item.code} - ${item.name}` : item.code,
    value: item.code,
    description: item.name
  }));

const toItemMasterOptions = (items: readonly IItemMasterLookupItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.number,
    text: item.description ? `${item.number} - ${item.description}` : item.number,
    value: item.number,
    description: item.description
  }));

const toMasterCodeOptions = (items: readonly IMasterCodeItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.code,
    text: item.name ? `${item.code} - ${item.name}` : item.code,
    value: item.code,
    description: item.name
  }));

const getOptionDescription = (options: readonly ILookupOption[], value?: string): string => {
  const normalizedValue = (value || '').trim().toLowerCase();
  const option = options.filter(item => String(item.value || item.key).trim().toLowerCase() === normalizedValue)[0];
  return option ? option.description || option.text || String(option.value || option.key) : '';
};

export const SalesOrderCreatePage: React.FC<ISalesOrderCreatePageProps> = ({
  approvalProcessingService,
  customerService,
  eventService,
  itemMasterService,
  masterDataService,
  requestSubmissionService,
  resubmitRequestId,
  salespersonService,
  onNavigate
}) => {
  const toast = useToast();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [lookupLoading, setLookupLoading] = React.useState<boolean>(false);
  const [headerDirty, setHeaderDirty] = React.useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState<boolean>(false);
  const [showLineValidation, setShowLineValidation] = React.useState<boolean>(false);
  const [customerOptions, setCustomerOptions] = React.useState<readonly ILookupOption[]>([]);
  const [eventOptions, setEventOptions] = React.useState<readonly ILookupOption[]>([]);
  const [itemMasterOptions, setItemMasterOptions] = React.useState<readonly ILookupOption[]>([]);
  const [salespersonOptions, setSalespersonOptions] = React.useState<readonly ILookupOption[]>([]);
  const [stateOptions, setStateOptions] = React.useState<readonly ILookupOption[]>([]);
  const [initialFormValues, setInitialFormValues] = React.useState<EntityFormValues>({ billToCustomerCode: '' });
  const [snapshotNames, setSnapshotNames] = React.useState({
    sellToCustomerName: '',
    billToCustomerName: '',
    salespersonName: '',
    eventName: ''
  });
  const [lines, setLines] = React.useState<readonly ISalesOrderLineFormItem[]>([]);
  const [invoiceDiscountMode, setInvoiceDiscountMode] = React.useState<InvoiceDiscountMode>('amount');
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = React.useState<number | undefined>();
  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = React.useState<number | undefined>();

  const linesSubtotal = React.useMemo(() => calculateLinesSubtotal(lines), [lines]);
  const hasInvoiceDiscount = getNumberValue(invoiceDiscountAmount) > 0 || getNumberValue(invoiceDiscountPercent) > 0;
  const invoiceDiscountAmountValue = getNumberValue(invoiceDiscountAmount);
  const invoiceDiscountPercentValue = getNumberValue(invoiceDiscountPercent);
  const orderTotalAfterDiscount = Math.max(0, roundCurrency(linesSubtotal - invoiceDiscountAmountValue));

  React.useEffect(() => {
    let isMounted = true;

    const loadLookups = async (): Promise<void> => {
      setLookupLoading(true);

      try {
        const [customers, events, itemMasters, salespersons, states] = await Promise.all([
          customerService.getCustomerLookup(),
          eventService.getEvents({}, { pageNumber: 1, pageSize: eventLookupPageSize }),
          itemMasterService.getItemMasterLookup(),
          salespersonService.getSalespersonLookup(),
          masterDataService.getCodes('stateCodes')
        ]);

        if (!isMounted) {
          return;
        }

        setCustomerOptions(toCustomerOptions(customers));
        setEventOptions(toEventOptions(events.items));
        setItemMasterOptions(toItemMasterOptions(itemMasters));
        setSalespersonOptions(toSalespersonOptions(salespersons));
        setStateOptions(toMasterCodeOptions(states));
      } catch (error) {
        if (isMounted) {
          toast.error(getUserFriendlyError(error), { title: 'Unable to load sales order lookups' });
        }
      } finally {
        if (isMounted) {
          setLookupLoading(false);
        }
      }
    };

    loadLookups().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [customerService, eventService, itemMasterService, masterDataService, salespersonService, toast]);

  React.useEffect(() => {
    if (!resubmitRequestId) {
      setInitialFormValues({ billToCustomerCode: '' });
      setSnapshotNames({
        sellToCustomerName: '',
        billToCustomerName: '',
        salespersonName: '',
        eventName: ''
      });
      return;
    }

    let isMounted = true;

    const loadRejectedSnapshot = async (): Promise<void> => {
      setLookupLoading(true);

      try {
        const detail = await requestSubmissionService.getSalesOrderRequestDetail(resubmitRequestId);
        const headerValues: EntityFormValues = {
          customerCode: detail.request.sellToCustomerCode,
          billToCustomerCode: detail.request.billToCustomerCode,
          salespersonCode: detail.request.salespersonCode,
          eventCode: detail.request.eventCode,
          countryCode: detail.request.countryCode,
          stateCode: detail.request.stateCode,
          orderDate: detail.request.orderDate,
          postingDate: detail.request.postingDate,
          externalDocumentNumber: detail.request.externalDocumentNumber,
          remarks: detail.request.remarks
        };
        const restoredLines = detail.lines.map(line => ({
          lineNumber: String(line.lineNumber),
          itemCode: line.itemCode,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.rate,
          lineDiscountPercentage: line.lineDiscountPercentage,
          lineAmount: line.netLineAmount
        }));

        if (isMounted) {
          setInitialFormValues(headerValues);
          setSnapshotNames({
            sellToCustomerName: detail.request.sellToCustomerName,
            billToCustomerName: detail.request.billToCustomerName,
            salespersonName: detail.request.salespersonName,
            eventName: detail.request.eventName
          });
          setLines(restoredLines);
          setInvoiceDiscountAmount(detail.request.invoiceDiscountAmountExclVat || undefined);
          setInvoiceDiscountPercent(detail.request.invoiceDiscountPercent || undefined);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(getUserFriendlyError(error), { title: 'Unable to load rejected sales order' });
        }
      } finally {
        if (isMounted) {
          setLookupLoading(false);
        }
      }
    };

    loadRejectedSnapshot().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [requestSubmissionService, resubmitRequestId, toast]);

  const fields = React.useMemo<readonly IFormFieldConfig[]>(() => {
    return (salesOrdersModuleConfig.formFields || []).map(field => {
      if (field.key === 'customerCode' || field.key === 'billToCustomerCode') {
        return { ...field, options: customerOptions, disabled: lookupLoading };
      }

      if (field.key === 'eventCode') {
        return { ...field, options: eventOptions, disabled: lookupLoading };
      }

      if (field.key === 'salespersonCode') {
        return { ...field, options: salespersonOptions, disabled: lookupLoading };
      }

      if (field.key === 'stateCode') {
        return { ...field, options: stateOptions, disabled: lookupLoading };
      }

      return field;
    });
  }, [customerOptions, eventOptions, lookupLoading, salespersonOptions, stateOptions]);

  const lineDirty = lines.length > 0 || hasInvoiceDiscount;
  const isDirty = headerDirty || lineDirty;
  const lineItemFields = React.useMemo<readonly IFormFieldConfig[]>(() => {
    return (salesOrderLineItemFields as readonly IFormFieldConfig[]).map(field => {
      if (field.key === 'itemCode') {
        return {
          ...field,
          disabled: lookupLoading,
          options: itemMasterOptions,
          placeholder: lookupLoading ? 'Loading items...' : 'Select item'
        };
      }

      return field;
    });
  }, [itemMasterOptions, lookupLoading]);

  const handleCancel = React.useCallback((): void => {
    if (isDirty) {
      setShowCancelDialog(true);
      return;
    }

    onNavigate(resubmitRequestId ? `${salesOrdersModuleConfig.route}/requests/detail/${encodeURIComponent(resubmitRequestId)}` : salesOrdersModuleConfig.route);
  }, [isDirty, onNavigate, resubmitRequestId]);

  const resetInvoiceDiscount = React.useCallback((): void => {
    if (!hasInvoiceDiscount) {
      return;
    }

    setInvoiceDiscountAmount(undefined);
    setInvoiceDiscountPercent(undefined);
  }, [hasInvoiceDiscount]);

  const handleInvoiceDiscountModeChange = React.useCallback((mode: InvoiceDiscountMode): void => {
    setInvoiceDiscountMode(mode);

    if (mode === 'amount') {
      setInvoiceDiscountAmount(calculateDiscountAmountFromPercent(linesSubtotal, invoiceDiscountPercent));
      return;
    }

    setInvoiceDiscountPercent(calculateDiscountPercentFromAmount(linesSubtotal, invoiceDiscountAmount));
  }, [invoiceDiscountAmount, invoiceDiscountPercent, linesSubtotal]);

  const handleInvoiceDiscountAmountChange = React.useCallback((value: string): void => {
    const amount = Math.min(Math.max(getNumberValue(toOptionalNumberValue(value)), 0), linesSubtotal);

    setInvoiceDiscountAmount(amount || undefined);
    setInvoiceDiscountPercent(calculateDiscountPercentFromAmount(linesSubtotal, amount) || undefined);
  }, [linesSubtotal]);

  const handleInvoiceDiscountPercentChange = React.useCallback((value: string): void => {
    const percent = Math.min(Math.max(getNumberValue(toOptionalNumberValue(value)), 0), 100);

    setInvoiceDiscountPercent(percent || undefined);
    setInvoiceDiscountAmount(calculateDiscountAmountFromPercent(linesSubtotal, percent) || undefined);
  }, [linesSubtotal]);

  const handleSubmit = React.useCallback(async (values: EntityFormValues): Promise<void> => {
    if (loading) {
      return;
    }

    setShowLineValidation(true);

    if (hasLineValidationErrors(lines)) {
      toast.error('Add at least one valid sales order line item before submitting.', { title: 'Review line items' });
      return;
    }

    setLoading(true);

    try {
      const formState = toSalesOrderFormState(values, lines, invoiceDiscountAmountValue, invoiceDiscountPercentValue);
      const submissionInput = {
        form: formState,
        sellToCustomerName: getOptionDescription(customerOptions, formState.customerCode) || snapshotNames.sellToCustomerName,
        billToCustomerName: getOptionDescription(customerOptions, formState.billToCustomerCode || formState.customerCode) || snapshotNames.billToCustomerName,
        salespersonName: getOptionDescription(salespersonOptions, formState.salespersonCode) || snapshotNames.salespersonName,
        eventName: getOptionDescription(eventOptions, formState.eventCode) || snapshotNames.eventName,
        lineSnapshots: formState.lines.map(line => ({
          item: line,
          description: getOptionDescription(itemMasterOptions, line.itemCode) || line.description,
          unitOfMeasureCode: line.unitOfMeasureCode || ''
        }))
      };

      if (resubmitRequestId && approvalProcessingService) {
        await approvalProcessingService.resubmitSalesOrderRequest(Number(resubmitRequestId), submissionInput);
        toast.success('Sales order request resubmitted for approval.', { title: 'Sales Order' });
        onNavigate(`${salesOrdersModuleConfig.route}/requests/detail/${encodeURIComponent(resubmitRequestId)}`);
        return;
      }

      const result = await requestSubmissionService.submitSalesOrderRequest(submissionInput);
      toast.success('Sales order request submitted for approval.', { title: 'Sales Order' });

      onNavigate(`${salesOrdersModuleConfig.route}/requests/detail/${encodeURIComponent(String(result.request.id))}`);
    } catch (error) {
      toast.error(getUserFriendlyError(error), { title: 'Unable to submit sales order request' });
    } finally {
      setLoading(false);
    }
  }, [
    customerOptions,
    eventOptions,
    invoiceDiscountAmountValue,
    invoiceDiscountPercentValue,
    itemMasterOptions,
    lines,
    loading,
    onNavigate,
    approvalProcessingService,
    requestSubmissionService,
    resubmitRequestId,
    salespersonOptions,
    snapshotNames,
    toast
  ]);

  return (
    <PageContainer
      title={resubmitRequestId ? 'Edit and Resubmit Sales Order' : 'Create Sales Order'}
      description={resubmitRequestId ? 'Correct the rejected sales-order snapshot and submit it into the next approval cycle.' : 'Submit a sales order request for approval.'}
      actions={<Button label={resubmitRequestId ? 'Back to Request' : 'Back to Sales Orders'} variant="secondary" disabled={loading} onClick={handleCancel} />}
    >
      <EntityForm
        fields={fields}
        initialValues={initialFormValues}
        submitLabel={resubmitRequestId ? 'Resubmit for Approval' : 'Submit for Approval'}
        cancelLabel="Cancel"
        loading={loading}
        disabled={loading}
        lookupLoadingKeys={{
          customerCode: lookupLoading,
          billToCustomerCode: lookupLoading,
          eventCode: lookupLoading,
          salespersonCode: lookupLoading,
          stateCode: lookupLoading
        }}
        onDirtyChange={setHeaderDirty}
        onSubmit={values => {
          handleSubmit(values).catch(() => undefined);
        }}
        onCancel={handleCancel}
      >
        <LineItemsEditor<ISalesOrderLineFormItem>
          title="Line Items"
          fields={lineItemFields}
          items={lines}
          addLabel="Add Line"
          disabled={loading}
          requireAtLeastOneLine={true}
          showValidationErrors={showLineValidation}
          createDefaultItem={() => createDefaultLine(lines.length + 1)}
          calculateItem={calculateLine}
          validateLine={validateLine}
          onChange={nextLines => {
            resetInvoiceDiscount();
            setLines(nextLines.map((line, index) => ({ ...line, lineNumber: String(index + 1) })));
          }}
          getRowKey={(item, index) => item.lineNumber || String(index)}
          emptyTitle="No line items"
          emptyMessage="Add at least one line item to create a sales order."
        />
        <section className={styles.discountPanel} aria-label="Invoice discount">
          <div className={styles.discountHeader}>
            <div>
              <h3>Invoice Discount</h3>
              <p>Choose whether the invoice-level discount is entered as an amount or as a percentage.</p>
            </div>
            <div className={styles.discountMode} aria-label="Invoice discount entry mode">
              <button
                className={invoiceDiscountMode === 'amount' ? styles.activeModeButton : styles.modeButton}
                disabled={loading}
                onClick={() => handleInvoiceDiscountModeChange('amount')}
                type="button"
              >
                Amount
              </button>
              <button
                className={invoiceDiscountMode === 'percent' ? styles.activeModeButton : styles.modeButton}
                disabled={loading}
                onClick={() => handleInvoiceDiscountModeChange('percent')}
                type="button"
              >
                Percent
              </button>
            </div>
          </div>
          <div className={styles.discountGrid}>
            <InputField
              label="Invoice Discount Amount Excl. VAT"
              type="number"
              value={invoiceDiscountAmountValue || ''}
              disabled={loading || linesSubtotal <= 0}
              readOnly={invoiceDiscountMode !== 'amount'}
              min={0}
              max={linesSubtotal}
              onChange={handleInvoiceDiscountAmountChange}
            />
            <InputField
              label="Invoice Discount %"
              type="number"
              value={invoiceDiscountPercentValue || ''}
              disabled={loading || linesSubtotal <= 0}
              readOnly={invoiceDiscountMode !== 'percent'}
              min={0}
              max={100}
              onChange={handleInvoiceDiscountPercentChange}
            />
            <div className={styles.discountMetric}>
              <span>Line Subtotal</span>
              <strong>{linesSubtotal.toFixed(2)}</strong>
            </div>
            <div className={styles.discountMetric}>
              <span>Total After Discount</span>
              <strong>{orderTotalAfterDiscount.toFixed(2)}</strong>
            </div>
          </div>
        </section>
      </EntityForm>
      <ConfirmationDialog
        isOpen={showCancelDialog}
        title="Discard sales order?"
        message="You have unsaved sales order changes. Discard them and leave this page?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="danger"
        onConfirm={() => onNavigate(resubmitRequestId ? `${salesOrdersModuleConfig.route}/requests/detail/${encodeURIComponent(resubmitRequestId)}` : salesOrdersModuleConfig.route)}
        onCancel={() => setShowCancelDialog(false)}
      />
    </PageContainer>
  );
};
