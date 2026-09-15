import * as React from 'react';
import { Icon } from '@fluentui/react';
import mefriendLogo from '../../shared/assets/unnamed.png';
import styles from './PortalTransition.module.scss';

export interface IPortalTransitionProps {
  label: string;
  iconName: string;
  finishing: boolean;
}

export const PortalTransition: React.FC<IPortalTransitionProps> = ({ finishing, iconName, label }) => (
  <div className={finishing ? `${styles.overlay} ${styles.finishing}` : styles.overlay} role="status" aria-live="polite" aria-label={label}>
    <div className={styles.glowOne} aria-hidden="true" />
    <div className={styles.glowTwo} aria-hidden="true" />
    <div className={styles.panel}>
      <div className={styles.mark} aria-hidden="true">
        <span className={styles.orbit} />
        <span className={styles.iconTile}><Icon iconName={iconName} /></span>
        <span className={styles.logoTile}><img src={mefriendLogo} alt="" /></span>
      </div>
      <span className={styles.kicker}>MEFRIEND APPLICATIONS</span>
      <strong>{label}</strong>
      <span className={styles.detail}>Preparing your workspace</span>
      <span className={styles.progressTrack} aria-hidden="true"><span className={styles.progress} /></span>
    </div>
  </div>
);
