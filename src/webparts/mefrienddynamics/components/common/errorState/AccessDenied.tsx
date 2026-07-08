import * as React from 'react';
import { ErrorState } from './ErrorState';

export interface IAccessDeniedProps {
  title?: string;
  message?: string;
}

export const AccessDenied: React.FC<IAccessDeniedProps> = ({
  title = 'Access denied',
  message = 'You do not have permission to access this area. Contact your administrator if you need access.'
}) => <ErrorState title={title} message={message} />;
