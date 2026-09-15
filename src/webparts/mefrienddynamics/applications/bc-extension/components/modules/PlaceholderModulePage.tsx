import * as React from 'react';
import { PageContainer } from '../../../../shared/components/pageContainer/PageContainer';
import { moduleDefinitions } from '../../config/moduleConfig';
import type { IResolvedRoute } from '../../models/common/AppRoute';
import styles from './PlaceholderModulePage.module.scss';

export interface IPlaceholderModulePageProps {
  route: IResolvedRoute;
}

export const PlaceholderModulePage: React.FC<IPlaceholderModulePageProps> = ({ route }) => {
  const moduleDefinition = moduleDefinitions.filter(moduleItem => moduleItem.key === route.moduleKey)[0];
  const description = moduleDefinition ? moduleDefinition.description : undefined;

  return (
    <PageContainer title={route.title} description={description}>
      <div className={styles.placeholder}>
        <span className={styles.status}>Baseline ready</span>
        <p>
          This route is connected to the shared application shell. Module UI, data services, and API calls will be added
          in the service-backed implementation phase.
        </p>
        {route.params.id ? <div className={styles.reference}>Record reference: {route.params.id}</div> : null}
      </div>
    </PageContainer>
  );
};
