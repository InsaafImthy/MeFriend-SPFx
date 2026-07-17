import * as React from 'react';
import {
  salesOrderLineItemFields,
  salesOrdersModuleConfig
} from '../../../config/modules/salesOrdersModuleConfig';
import type { IFormFieldConfig } from '../../../models/common/IFormFieldConfig';
import type { ILookupOption } from '../../../models/common/ILookupOption';
import type { ICustomerListItem } from '../../../models/customers';
import type { IEventListItem } from '../../../models/events';
import type { ISalesOrderCreateFormState, ISalesOrderLineItem } from '../../../models/salesOrders';
import type { ISalespersonListItem } from '../../../models/salespersons';
import type { IMasterCodeItem } from '../../../models/settings/IMasterDataModels';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { CustomerService } from '../../../services/customers/customerService';
import type { EventService } from '../../../services/events/eventService';
import type { SalesOrderService } from '../../../services/salesOrders/salesOrderService';
import type { SalespersonService } from '../../../services/salespersons/salespersonService';
import type { MasterDataService } from '../../../services/sharepoint/masterDataService';
import type { EntityFormErrors, EntityFormValue, EntityFormValues } from '../../../utils/validationUtils';
import { hasValidationErrors, validateFormValues } from '../../../utils/validationUtils';
import { Button } from '../../common/buttons/Button';
import { ConfirmationDialog } from '../../common/confirmationDialog/ConfirmationDialog';
import { EntityForm, LineItemsEditor, LineItemRecord } from '../../common/forms';
import { PageContainer } from '../../common/pageContainer/PageContainer';
import { useToast } from '../../common/toast/useToast';

export interface ISalesOrderCreatePageProps {
  customerService: CustomerService;
  eventService: EventService;
  masterDataService: MasterDataService;
  salesOrderService: SalesOrderService;
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

interface ISalesOrderLineFormItem extends LineItemRecord {
  lineNumber: string;
  itemCode: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  lineAmount?: number;
  taxAmount?: number;
}

const pageSize = 100;

const getStringValue = (values: EntityFormValues, key: keyof ISalesOrderCreateFormState): string => {
  const value = values[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

const getNumberValue = (value: EntityFormValue): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const createDefaultLine = (lineNumber: number): ISalesOrderLineFormItem => ({
  lineNumber: String(lineNumber),
  itemCode: '',
  description: '',
  quantity: undefined,
  unitPrice: undefined,
  lineAmount: undefined,
  taxAmount: undefined
});

const calculateLine = (item: ISalesOrderLineFormItem): ISalesOrderLineFormItem => {
  const quantity = getNumberValue(item.quantity);
  const unitPrice = getNumberValue(item.unitPrice);
  const lineAmount = quantity > 0 && unitPrice >= 0 ? Number((quantity * unitPrice).toFixed(2)) : undefined;

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
  lineAmount: getNumberValue(line.lineAmount),
  taxAmount: line.taxAmount
});

const toSalesOrderFormState = (
  values: EntityFormValues,
  lines: readonly ISalesOrderLineFormItem[]
): ISalesOrderCreateFormState => ({
  customerCode: getStringValue(values, 'customerCode'),
  salespersonCode: getStringValue(values, 'salespersonCode'),
  eventCode: getStringValue(values, 'eventCode'),
  countryCode: getStringValue(values, 'countryCode'),
  stateCode: getStringValue(values, 'stateCode'),
  orderDate: getStringValue(values, 'orderDate'),
  postingDate: getStringValue(values, 'postingDate'),
  externalDocumentNumber: getStringValue(values, 'externalDocumentNumber'),
  remarks: getStringValue(values, 'remarks'),
  lines: lines.map(toSalesOrderLineItem)
});

const toCustomerOptions = (items: readonly ICustomerListItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.customerCode || item.id,
    text: item.customerName ? `${item.customerName} (${item.customerCode})` : item.customerCode,
    value: item.customerCode
  }));

const toEventOptions = (items: readonly IEventListItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.eventCode || item.id,
    text: item.eventName ? `${item.eventName} (${item.eventCode})` : item.eventCode,
    value: item.eventCode
  }));

const toSalespersonOptions = (items: readonly ISalespersonListItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.salespersonCode || item.id,
    text: item.salespersonName ? `${item.salespersonName} (${item.salespersonCode})` : item.salespersonCode,
    value: item.salespersonCode
  }));

const toMasterCodeOptions = (items: readonly IMasterCodeItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.code,
    text: item.name ? `${item.code} - ${item.name}` : item.code,
    value: item.code,
    description: item.name
  }));

export const SalesOrderCreatePage: React.FC<ISalesOrderCreatePageProps> = ({
  customerService,
  eventService,
  masterDataService,
  salesOrderService,
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
  const [countryOptions, setCountryOptions] = React.useState<readonly ILookupOption[]>([]);
  const [eventOptions, setEventOptions] = React.useState<readonly ILookupOption[]>([]);
  const [salespersonOptions, setSalespersonOptions] = React.useState<readonly ILookupOption[]>([]);
  const [stateOptions, setStateOptions] = React.useState<readonly ILookupOption[]>([]);
  const [lines, setLines] = React.useState<readonly ISalesOrderLineFormItem[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    const loadLookups = async (): Promise<void> => {
      setLookupLoading(true);

      try {
        const [customers, events, salespersons, countries, states] = await Promise.all([
          customerService.getCustomers({}, { pageNumber: 1, pageSize }),
          eventService.getEvents({}, { pageNumber: 1, pageSize }),
          salespersonService.getSalespersons({}, { pageNumber: 1, pageSize }),
          masterDataService.getCodes('countryCodes'),
          masterDataService.getCodes('stateCodes')
        ]);

        if (!isMounted) {
          return;
        }

        setCustomerOptions(toCustomerOptions(customers.items));
        setEventOptions(toEventOptions(events.items));
        setSalespersonOptions(toSalespersonOptions(salespersons.items));
        setCountryOptions(toMasterCodeOptions(countries));
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
  }, [customerService, eventService, masterDataService, salespersonService, toast]);

  const fields = React.useMemo<readonly IFormFieldConfig[]>(() => {
    return (salesOrdersModuleConfig.formFields || []).map(field => {
      if (field.key === 'customerCode') {
        return { ...field, options: customerOptions, disabled: lookupLoading };
      }

      if (field.key === 'eventCode') {
        return { ...field, options: eventOptions, disabled: lookupLoading };
      }

      if (field.key === 'salespersonCode') {
        return { ...field, options: salespersonOptions, disabled: lookupLoading };
      }

      if (field.key === 'countryCode') {
        return { ...field, options: countryOptions, disabled: lookupLoading };
      }

      if (field.key === 'stateCode') {
        return { ...field, options: stateOptions, disabled: lookupLoading };
      }

      return field;
    });
  }, [countryOptions, customerOptions, eventOptions, lookupLoading, salespersonOptions, stateOptions]);

  const lineDirty = lines.length > 0;
  const isDirty = headerDirty || lineDirty;

  const handleCancel = React.useCallback((): void => {
    if (isDirty) {
      setShowCancelDialog(true);
      return;
    }

    onNavigate(salesOrdersModuleConfig.route);
  }, [isDirty, onNavigate]);

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
      const formState = toSalesOrderFormState(values, lines);
      const request = salesOrderService.mapSalesOrderFormToApiRequest(formState);
      const createdSalesOrder = await salesOrderService.createSalesOrder(request);
      toast.success('Sales order created successfully.', { title: 'Sales Order' });

      const detailId = createdSalesOrder.id || createdSalesOrder.salesOrderNumber;
      onNavigate(detailId ? `${salesOrdersModuleConfig.route}/detail/${encodeURIComponent(detailId)}` : salesOrdersModuleConfig.route);
    } catch (error) {
      toast.error(getUserFriendlyError(error), { title: 'Unable to create sales order' });
    } finally {
      setLoading(false);
    }
  }, [lines, loading, onNavigate, salesOrderService, toast]);

  return (
    <PageContainer
      title="Create Sales Order"
      description="Create a sales order header and line items through the MeFriend API."
      actions={<Button label="Back to Sales Orders" variant="secondary" disabled={loading} onClick={handleCancel} />}
    >
      <EntityForm
        fields={fields}
        initialValues={{ countryCode: 'IN' }}
        submitLabel="Create Sales Order"
        cancelLabel="Cancel"
        loading={loading}
        disabled={loading}
        lookupLoadingKeys={{
          customerCode: lookupLoading,
          eventCode: lookupLoading,
          salespersonCode: lookupLoading,
          countryCode: lookupLoading,
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
          fields={salesOrderLineItemFields as readonly IFormFieldConfig[]}
          items={lines}
          addLabel="Add Line"
          disabled={loading}
          requireAtLeastOneLine={true}
          showValidationErrors={showLineValidation}
          createDefaultItem={() => createDefaultLine(lines.length + 1)}
          calculateItem={calculateLine}
          validateLine={validateLine}
          onChange={nextLines => {
            setLines(nextLines.map((line, index) => ({ ...line, lineNumber: String(index + 1) })));
          }}
          getRowKey={(item, index) => item.lineNumber || String(index)}
          emptyTitle="No line items"
          emptyMessage="Add at least one line item to create a sales order."
        />
      </EntityForm>
      <ConfirmationDialog
        isOpen={showCancelDialog}
        title="Discard sales order?"
        message="You have unsaved sales order changes. Discard them and return to the sales order list?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="danger"
        onConfirm={() => onNavigate(salesOrdersModuleConfig.route)}
        onCancel={() => setShowCancelDialog(false)}
      />
    </PageContainer>
  );
};
