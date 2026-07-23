import * as React from 'react';
import { appConfig } from '../../../config/appConfig';
import { customersModuleConfig, getCustomerFormFields } from '../../../config/modules/customersModuleConfig';
import type { IFormFieldConfig } from '../../../models/common/IFormFieldConfig';
import type { ILookupOption } from '../../../models/common/ILookupOption';
import type { ICustomerCreateFormState } from '../../../models/customers';
import type { IMasterCodeItem } from '../../../models/settings/IMasterDataModels';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { CustomerService } from '../../../services/customers/customerService';
import type { ApprovalProcessingService } from '../../../services/sharepoint/approvalProcessingService';
import type { MasterDataService } from '../../../services/sharepoint/masterDataService';
import type { RequestSubmissionService } from '../../../services/sharepoint/requestSubmissionService';
import type { EntityFormValues } from '../../../utils/validationUtils';
import { EntityForm } from '../../common/forms/EntityForm';
import { PageContainer } from '../../common/pageContainer/PageContainer';
import { useToast } from '../../common/toast/useToast';

export interface ICustomerCreatePageProps {
  approvalProcessingService?: ApprovalProcessingService;
  customerService: CustomerService;
  masterDataService: MasterDataService;
  requestSubmissionService: RequestSubmissionService;
  resubmitRequestId?: string;
  onNavigate: (path: string) => void;
}

const getStringValue = (values: EntityFormValues, key: keyof ICustomerCreateFormState): string => {
  const value = values[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

const toCustomerFormState = (values: EntityFormValues): ICustomerCreateFormState => ({
  name: getStringValue(values, 'name'),
  name2: getStringValue(values, 'name2'),
  address: getStringValue(values, 'address'),
  address2: getStringValue(values, 'address2'),
  stateCode: getStringValue(values, 'stateCode'),
  countryRegionCode: getStringValue(values, 'countryRegionCode'),
  city: getStringValue(values, 'city'),
  postCode: getStringValue(values, 'postCode'),
  locationCode: getStringValue(values, 'locationCode'),
  phoneNumber: getStringValue(values, 'phoneNumber'),
  PAN: getStringValue(values, 'PAN'),
  gstRegistrationNo: getStringValue(values, 'gstRegistrationNo'),
  genPostingGroup: getStringValue(values, 'genPostingGroup'),
  customerPostingGroup: getStringValue(values, 'customerPostingGroup'),
  gstCustomerType: getStringValue(values, 'gstCustomerType')
});

const toMasterCodeOptions = (items: readonly IMasterCodeItem[]): readonly ILookupOption[] =>
  items.map(item => ({
    key: item.code,
    text: item.name ? `${item.code} - ${item.name}` : item.code,
    value: item.code,
    description: item.name
  }));

export const CustomerCreatePage: React.FC<ICustomerCreatePageProps> = ({
  approvalProcessingService,
  customerService,
  masterDataService,
  requestSubmissionService,
  resubmitRequestId,
  onNavigate
}) => {
  const toast = useToast();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [lookupLoading, setLookupLoading] = React.useState<boolean>(true);
  const [countryOptions, setCountryOptions] = React.useState<readonly ILookupOption[]>([]);
  const [stateOptions, setStateOptions] = React.useState<readonly ILookupOption[]>([]);
  const [initialValues, setInitialValues] = React.useState<EntityFormValues>({ countryRegionCode: appConfig.defaultCountryCode });
  const [formValues, setFormValues] = React.useState<EntityFormValues>({
    countryRegionCode: appConfig.defaultCountryCode
  });

  React.useEffect(() => {
    let isMounted = true;

    const loadLookups = async (): Promise<void> => {
      setLookupLoading(true);

      try {
        const [countries, states] = await Promise.all([
          masterDataService.getCodes('countryCodes'),
          masterDataService.getCodes('stateCodes')
        ]);

        if (!isMounted) {
          return;
        }

        setCountryOptions(toMasterCodeOptions(countries));
        setStateOptions(toMasterCodeOptions(states));
      } catch (error) {
        if (isMounted) {
          toast.error(getUserFriendlyError(error), { title: 'Unable to load customer lookups' });
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
  }, [masterDataService, toast]);

  React.useEffect(() => {
    if (!resubmitRequestId) {
      setInitialValues({ countryRegionCode: appConfig.defaultCountryCode });
      setFormValues({ countryRegionCode: appConfig.defaultCountryCode });
      return;
    }

    let isMounted = true;

    const loadRejectedSnapshot = async (): Promise<void> => {
      setLookupLoading(true);

      try {
        const detail = await requestSubmissionService.getCustomerRequestDetail(resubmitRequestId);
        const snapshot: EntityFormValues = {
          name: detail.request.customerName,
          name2: detail.request.name2,
          address: detail.request.address,
          address2: detail.request.address2,
          stateCode: detail.request.stateCode,
          countryRegionCode: detail.request.countryRegionCode || appConfig.defaultCountryCode,
          city: detail.request.city,
          postCode: detail.request.postCode,
          locationCode: detail.request.locationCode,
          phoneNumber: detail.request.phoneNumber,
          PAN: detail.request.PAN,
          gstRegistrationNo: detail.request.gstRegistrationNo,
          genPostingGroup: detail.request.genPostingGroup,
          customerPostingGroup: detail.request.customerPostingGroup,
          gstCustomerType: detail.request.gstCustomerType
        };

        if (isMounted) {
          setInitialValues(snapshot);
          setFormValues(snapshot);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(getUserFriendlyError(error), { title: 'Unable to load rejected request' });
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

  const fields = React.useMemo<readonly IFormFieldConfig[]>(
    () =>
      getCustomerFormFields(
        typeof formValues.countryRegionCode === 'string' ? formValues.countryRegionCode : undefined,
        {
          countryRegionCodeOptions: countryOptions,
          stateCodeOptions: stateOptions
        }
      ),
    [countryOptions, formValues.countryRegionCode, stateOptions]
  );

  const handleSubmit = React.useCallback(async (values: EntityFormValues): Promise<void> => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const formState = toCustomerFormState(values);
      const request = customerService.mapCustomerFormToApiRequest(formState);

      if (resubmitRequestId && approvalProcessingService) {
        await approvalProcessingService.resubmitCustomerRequest(Number(resubmitRequestId), request);
        toast.success('Customer request resubmitted for approval.', { title: 'Customer Master' });
        onNavigate(`${customersModuleConfig.route}/requests/detail/${encodeURIComponent(resubmitRequestId)}`);
        return;
      }

      const result = await requestSubmissionService.submitCustomerRequest(request);
      toast.success('Customer request submitted for approval.', { title: 'Customer Master' });
      onNavigate(`${customersModuleConfig.route}/requests/detail/${encodeURIComponent(String(result.request.id))}`);
    } catch (error) {
      toast.error(getUserFriendlyError(error), { title: 'Unable to submit customer request' });
    } finally {
      setLoading(false);
    }
  }, [approvalProcessingService, customerService, loading, onNavigate, requestSubmissionService, resubmitRequestId, toast]);

  return (
    <PageContainer
      title={resubmitRequestId ? 'Edit and Resubmit Customer' : 'Create Customer'}
      description={resubmitRequestId ? 'Correct the rejected customer snapshot and submit it into the next approval cycle.' : 'Submit a customer request for approval.'}
    >
      <EntityForm
        fields={fields}
        initialValues={initialValues}
        submitLabel={resubmitRequestId ? 'Resubmit for Approval' : 'Submit for Approval'}
        cancelLabel="Back"
        loading={loading}
        disabled={loading || lookupLoading}
        lookupLoadingKeys={{
          countryRegionCode: lookupLoading,
          stateCode: lookupLoading
        }}
        onValuesChange={setFormValues}
        onSubmit={values => {
          handleSubmit(values).catch(() => undefined);
        }}
        onCancel={() => onNavigate(resubmitRequestId ? `${customersModuleConfig.route}/requests/detail/${encodeURIComponent(resubmitRequestId)}` : customersModuleConfig.route)}
      />
    </PageContainer>
  );
};
