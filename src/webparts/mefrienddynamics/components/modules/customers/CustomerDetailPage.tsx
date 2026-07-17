import * as React from 'react';
import { Icon } from '@fluentui/react';
import { customersModuleConfig, getCustomerFormFields } from '../../../config/modules/customersModuleConfig';
import type { ICustomerDetail } from '../../../models/customers';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { CustomerService } from '../../../services/customers/customerService';
import { Button } from '../../common/buttons/Button';
import { ErrorState } from '../../common/errorState/ErrorState';
import { ReadOnlyEntityForm } from '../../common/forms/ReadOnlyEntityForm';
import { Loader } from '../../common/loaders/Loader';
import { PageContainer } from '../../common/pageContainer/PageContainer';

export interface ICustomerDetailPageProps {
  customerId: string;
  customerService: CustomerService;
  onNavigate: (path: string) => void;
}

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404) {
    return 'The selected customer could not be found in the customer listing API.';
  }

  if (normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Customer detail API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const CustomerDetailPage: React.FC<ICustomerDetailPageProps> = ({ customerId, customerService, onNavigate }) => {
  const [customer, setCustomer] = React.useState<ICustomerDetail | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const handleBack = React.useCallback((): void => {
    onNavigate(customersModuleConfig.route);
  }, [onNavigate]);

  React.useEffect(() => {
    const loadCustomer = async (): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        setCustomer(await customerService.getCustomerById(customerId));
      } catch (loadError) {
        setCustomer(undefined);
        setError(getDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadCustomer().catch(() => undefined);
  }, [customerId, customerService]);

  const formValues = React.useMemo(
    () => ({
      name: customer?.name || '',
      name2: customer?.name2 || '',
      address: customer?.address || '',
      stateCode: customer?.stateCode || '',
      countryRegionCode: customer?.countryRegionCode || '',
      city: customer?.city || '',
      postCode: customer?.postCode || '',
      locationCode: customer?.locationCode || '',
      PAN: customer?.PAN || '',
      gstRegistrationNo: customer?.gstRegistrationNo || '',
      genPostingGroup: customer?.genPostingGroup || '',
      customerPostingGroup: customer?.customerPostingGroup || '',
      gstCustomerType: customer?.gstCustomerType || ''
    }),
    [customer]
  );

  const formFields = React.useMemo(
    () => getCustomerFormFields(customer?.countryRegionCode),
    [customer?.countryRegionCode]
  );

  return (
    <PageContainer
      title="Customer Detail"
      description={
        customer
          ? customer.name || customer.name2 || customer.customerName || customer.customerCode
          : customerId
            ? `Customer reference: ${customerId}`
            : undefined
      }
      actions={
        <Button
          label="Back to Customers"
          variant="secondary"
          icon={<Icon iconName="ChevronLeft" aria-hidden="true" />}
          onClick={handleBack}
        />
      }
    >
      {loading ? <Loader type="page" message="Loading details" /> : null}
      {!loading && error ? <ErrorState title="Unable to load details" message={error} /> : null}
      {!loading && !error ? (
        <ReadOnlyEntityForm
          fields={formFields}
          values={formValues}
        />
      ) : null}
    </PageContainer>
  );
};
