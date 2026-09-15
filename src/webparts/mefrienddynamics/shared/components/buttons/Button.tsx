import * as React from 'react';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface IButtonProps {
  label?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

export const Button: React.FC<IButtonProps> = ({
  label,
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  onClick,
  type = 'button',
  ariaLabel
}) => {
  const content = children || label;
  const classNames = [styles.button, styles[variant], styles[size]];

  if (loading) {
    classNames.push(styles.loading);
  }

  return (
    <button
      aria-busy={loading}
      aria-label={ariaLabel || label}
      className={classNames.join(' ')}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon ? <span className={styles.icon}>{icon}</span> : null}
      {content ? <span className={styles.label}>{content}</span> : null}
    </button>
  );
};
