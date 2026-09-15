import * as React from 'react';
import { Icon } from '@fluentui/react';
import mefriendLogo from '../../shared/assets/unnamed.png';
import { applications } from '../config/applications';
import type { IPortalApplication } from '../config/applications';
import { buildPortalHref } from '../routing/paths';
import styles from './ApplicationsHome.module.scss';

export interface IApplicationsHomeProps {
  onLaunch?: (application: IPortalApplication) => void;
}

export const ApplicationsHome: React.FC<IApplicationsHomeProps> = ({ onLaunch }) => (
  <main className={styles.home}>
    <header className={styles.header}>
      <div className={styles.brand}>
        <img src={mefriendLogo} alt="MeFriend logo" className={styles.logo} />
        <span>MeFriend Applications</span>
      </div>
    </header>
    <div className={styles.content}>
      <div className={styles.intro}>
        <span className={styles.eyebrow}>YOUR WORKSPACE</span>
        <h1>MeFriend Applications List</h1>
        <p>Select an application to get started.</p>
      </div>
      <section aria-label="Available applications" className={styles.applicationSection}>
        <h2>Applications</h2>
        <div className={styles.grid}>
          {applications.filter(application => application.enabled).map(application => (
            <a className={styles.card} href={buildPortalHref(application.route)} key={application.id} onClick={event => {
              if (onLaunch && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                onLaunch(application);
              }
            }}>
              <span className={styles.iconFrame}>
                <Icon iconName={application.iconName} aria-hidden="true" />
              </span>
              <strong>{application.name}</strong>
              {application.description ? <span className={styles.description}>{application.description}</span> : null}
              <span className={styles.openLabel}>Open application <Icon iconName="ArrowUpRight" aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </section>
    </div>
  </main>
);
