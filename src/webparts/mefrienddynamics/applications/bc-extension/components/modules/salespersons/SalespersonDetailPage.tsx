import * as React from 'react';
import { salespersonsModuleConfig } from '../../../config/modules/salespersonsModuleConfig';
import type { ISalespersonDetail } from '../../../models/salespersons';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { SalespersonService } from '../../../services/salespersons/salespersonService';
import { DetailViewLayout } from '../../../../../shared/components/detailView/DetailViewLayout';

export interface ISalespersonDetailPageProps {
  salespersonId: string;
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Salesperson detail API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const SalespersonDetailPage: React.FC<ISalespersonDetailPageProps> = ({
  salespersonId,
  salespersonService,
  onNavigate
}) => {
  const [salesperson, setSalesperson] = React.useState<ISalespersonDetail | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!salespersonsModuleConfig.detailEnabled) {
      return;
    }

    const loadSalesperson = async (): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        setSalesperson(await salespersonService.getSalespersonById(salespersonId));
      } catch (loadError) {
        setSalesperson(undefined);
        setError(getDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadSalesperson().catch(() => undefined);
  }, [salespersonId, salespersonService]);

  if (!salespersonsModuleConfig.detailEnabled) {
    return (
      <DetailViewLayout
        title="Salesperson Detail"
        subtitle={salespersonId ? `Salesperson reference: ${salespersonId}` : undefined}
        backLabel="Back to Salespersons"
        onBack={() => onNavigate(salespersonsModuleConfig.route)}
        sections={[
          {
            title: 'Salesperson Information',
            customContent: <p>Salesperson detail API is not configured yet.</p>
          }
        ]}
      />
    );
  }

  return (
    <DetailViewLayout
      title="Salesperson Detail"
      subtitle={
        salesperson
          ? salesperson.salespersonName || salesperson.salespersonCode
          : salespersonId
            ? `Salesperson reference: ${salespersonId}`
            : undefined
      }
      backLabel="Back to Salespersons"
      onBack={() => onNavigate(salespersonsModuleConfig.route)}
      loading={loading}
      error={error}
      sections={[
        {
          title: 'Salesperson Information',
          fields: [
            { key: 'salespersonName', label: 'Salesperson', value: salesperson?.salespersonName || salesperson?.salespersonCode },
            { key: 'email', label: 'Email', value: salesperson?.email },
            { key: 'phoneNumber', label: 'Phone Number', value: salesperson?.phoneNumber },
            { key: 'mdmCode', label: 'MDM Code', value: salesperson?.mdmCode }
          ]
        }
      ]}
    />
  );
};
