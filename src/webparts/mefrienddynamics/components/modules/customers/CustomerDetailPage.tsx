import * as React from 'react';
import { customersModuleConfig } from '../../../config/modules/customersModuleConfig';
import { DetailViewLayout } from '../../common/detailView/DetailViewLayout';

export interface ICustomerDetailPageProps {
  customerId: string;
  onNavigate: (path: string) => void;
}

export const CustomerDetailPage: React.FC<ICustomerDetailPageProps> = ({ customerId, onNavigate }) => (
  <DetailViewLayout
    title="Customer Detail"
    subtitle={customerId ? `Customer reference: ${customerId}` : undefined}
    backLabel="Back to Customers"
    onBack={() => onNavigate(customersModuleConfig.route)}
    sections={[
      {
        title: 'Customer Information',
        customContent: <p>Customer detail API is not configured yet.</p>
      }
    ]}
  />
);
