import * as React from 'react';
import { PageContainer } from '../pageContainer/PageContainer';
import styles from './ErrorBoundary.module.scss';

export interface IErrorBoundaryProps {
  children: React.ReactNode;
}

export interface IErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
  public state: IErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(): IErrorBoundaryState {
    return {
      hasError: true
    };
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <PageContainer title="Something went wrong">
          <div className={styles.errorPanel}>
            <strong>Unable to render this workspace.</strong>
            <span>Please refresh the page or contact the administrator if the issue continues.</span>
          </div>
        </PageContainer>
      );
    }

    return this.props.children;
  }
}
