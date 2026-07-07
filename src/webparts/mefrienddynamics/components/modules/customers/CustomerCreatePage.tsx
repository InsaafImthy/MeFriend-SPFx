import * as React from 'react';
import { appConfig } from '../../../config/appConfig';
import { customersModuleConfig } from '../../../config/modules/customersModuleConfig';
import type { ICustomerCreateFormState } from '../../../models/customers';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { CustomerService } from '../../../services/customers/customerService';
import type { EntityFormValues } from '../../../utils/validationUtils';
import { EntityForm } from '../../common/forms/EntityForm';
import { PageContainer } from '../../common/pageContainer/PageContainer';
import { useToast } from '../../common/toast/useToast';

export interface ICustomerCreatePageProps {
  customerService: CustomerService;
  onNavigate: (path: string) => void;
}

const getStringValue = (values: EntityFormValues, key: keyof ICustomerCreateFormState): string => {
  const value = values[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

const toCustomerFormState = (values: EntityFormValues): ICustomerCreateFormState => ({
  branch: getStringValue(values, 'branch'),
  department: getStringValue(values, 'department'),
  customerCode: getStringValue(values, 'customerCode'),
  customerName: getStringValue(values, 'customerName'),
  address: getStringValue(values, 'address'),
  stateCode: getStringValue(values, 'stateCode'),
  countryCode: getStringValue(values, 'countryCode'),
  city: getStringValue(values, 'city'),
  postCode: getStringValue(values, 'postCode'),
  locationCode: getStringValue(values, 'locationCode'),
  panNo: getStringValue(values, 'panNo'),
  gstNo: getStringValue(values, 'gstNo')
});

export const CustomerCreatePage: React.FC<ICustomerCreatePageProps> = ({ customerService, onNavigate }) => {
  const toast = useToast();
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleSubmit = React.useCallback(async (values: EntityFormValues): Promise<void> => {
    setLoading(true);

    try {
      const formState = toCustomerFormState(values);
      const request = customerService.mapCustomerFormToApiRequest(formState);
      await customerService.createCustomer(request);
      toast.success('Customer created successfully.', { title: 'Customer Master' });
      onNavigate(customersModuleConfig.route);
    } catch (error) {
      toast.error(getUserFriendlyError(error), { title: 'Unable to create customer' });
    } finally {
      setLoading(false);
    }
  }, [customerService, onNavigate, toast]);

  return (
    <PageContainer title="Create Customer" description="Create a Business Central customer through the MeFriend API.">
      <EntityForm
        fields={customersModuleConfig.formFields || []}
        initialValues={{ countryCode: appConfig.defaultCountryCode }}
        submitLabel="Create Customer"
        cancelLabel="Back"
        loading={loading}
        disabled={loading}
        onSubmit={values => {
          handleSubmit(values).catch(() => undefined);
        }}
        onCancel={() => onNavigate(customersModuleConfig.route)}
      />
    </PageContainer>
  );
};
