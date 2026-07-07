import * as React from 'react';
import styles from './Mefrienddynamics.module.scss';
import type { IMefrienddynamicsProps } from './IMefrienddynamicsProps';
import { App } from './App/App';

export default class Mefrienddynamics extends React.Component<IMefrienddynamicsProps> {
  public render(): React.ReactElement<IMefrienddynamicsProps> {
    const { hasTeamsContext, userDisplayName } = this.props;

    return (
      <section className={`${styles.mefrienddynamics} ${hasTeamsContext ? styles.teams : ''}`}>
        <App userDisplayName={userDisplayName} />
      </section>
    );
  }
}
