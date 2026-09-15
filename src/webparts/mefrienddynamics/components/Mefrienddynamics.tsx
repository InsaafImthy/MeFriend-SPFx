import * as React from 'react';
import styles from './Mefrienddynamics.module.scss';
import type { IMefrienddynamicsProps } from './IMefrienddynamicsProps';
import { Portal } from '../portal/Portal';

export default class Mefrienddynamics extends React.Component<IMefrienddynamicsProps> {
  public render(): React.ReactElement<IMefrienddynamicsProps> {
    const { aadHttpClientFactory, hasTeamsContext, httpClient, pageContext, spHttpClient, userDisplayName } = this.props;

    return (
      <section className={`${styles.mefrienddynamics} ${hasTeamsContext ? styles.teams : ''}`}>
        <Portal
          aadHttpClientFactory={aadHttpClientFactory}
          httpClient={httpClient}
          pageContext={pageContext}
          spHttpClient={spHttpClient}
          userDisplayName={userDisplayName}
        />
      </section>
    );
  }
}
