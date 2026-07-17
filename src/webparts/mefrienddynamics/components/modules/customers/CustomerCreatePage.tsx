import * as React from 'react';
import { appConfig } from '../../../config/appConfig';
import { customersModuleConfig, getCustomerFormFields } from '../../../config/modules/customersModuleConfig';
import type { IFormFieldConfig } from '../../../models/common/IFormFieldConfig';
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
  name: getStringValue(values, 'name'),
  name2: getStringValue(values, 'name2'),
  address: getStringValue(values, 'address'),
  stateCode: getStringValue(values, 'stateCode'),
  countryRegionCode: getStringValue(values, 'countryRegionCode'),
  city: getStringValue(values, 'city'),
  postCode: getStringValue(values, 'postCode'),
  locationCode: getStringValue(values, 'locationCode'),
  PAN: getStringValue(values, 'PAN'),
  gstRegistrationNo: getStringValue(values, 'gstRegistrationNo'),
  genPostingGroup: getStringValue(values, 'genPostingGroup'),
  customerPostingGroup: getStringValue(values, 'customerPostingGroup'),
  gstCustomerType: getStringValue(values, 'gstCustomerType')
});

export const CustomerCreatePage: React.FC<ICustomerCreatePageProps> = ({ customerService, onNavigate }) => {
  const toast = useToast();
  const [loading, setLoading] = React.useState<boolean>(false);
  const initialValues = React.useMemo<EntityFormValues>(
    () => ({ countryRegionCode: appConfig.defaultCountryCode }),
    []
  );
  const [formValues, setFormValues] = React.useState<EntityFormValues>({
    countryRegionCode: appConfig.defaultCountryCode
  });

  const fields = React.useMemo<readonly IFormFieldConfig[]>(
    () => getCustomerFormFields(typeof formValues.countryRegionCode === 'string' ? formValues.countryRegionCode : undefined),
    [formValues.countryRegionCode]
  );

  const handleSubmit = React.useCallback(async (values: EntityFormValues): Promise<void> => {
    setLoading(true);

    try {
      const formState = toCustomerFormState(values);
      await customerService.createCustomer(formState);
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
        fields={fields}
        initialValues={initialValues}
        submitLabel="Create Customer"
        cancelLabel="Back"
        loading={loading}
        disabled={loading}
        onValuesChange={setFormValues}
        onSubmit={values => {
          handleSubmit(values).catch(() => undefined);
        }}
        onCancel={() => onNavigate(customersModuleConfig.route)}
      />
    </PageContainer>
  );
};
