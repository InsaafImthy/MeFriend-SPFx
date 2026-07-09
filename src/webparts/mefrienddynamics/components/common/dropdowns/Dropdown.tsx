import * as React from 'react';
import * as ReactDom from 'react-dom';
import type { ILookupOption } from '../../../models/common/ILookupOption';
import styles from './Dropdown.module.scss';

const menuAnimationDurationMs = 150;

export interface IDropdownProps<TValue = string> {
  label: string;
  value?: TValue;
  values?: readonly TValue[];
  options: readonly ILookupOption<TValue>[];
  searchable?: boolean;
  multiSelect?: boolean;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  errorMessage?: string;
  onChange?: (value: TValue | readonly TValue[] | undefined) => void;
  placeholder?: string;
  showOptionDetails?: boolean;
  showSelectedDetail?: boolean;
  renderOptionDetail?: (option: ILookupOption<TValue>) => React.ReactNode;
  renderSelectedDetail?: (option: ILookupOption<TValue>) => React.ReactNode;
}

export const Dropdown = <TValue extends string | number = string>({
  label,
  value,
  values = [],
  options,
  searchable = false,
  multiSelect = false,
  required = false,
  disabled = false,
  loading = false,
  readOnly = false,
  errorMessage,
  onChange,
  placeholder = 'Select',
  showOptionDetails = false,
  showSelectedDetail = false,
  renderOptionDetail,
  renderSelectedDetail
}: IDropdownProps<TValue>): React.ReactElement => {
  const fieldId = React.useMemo(() => `dropdown-${Math.random().toString(36).substr(2, 9)}`, []);
  const listboxId = `${fieldId}-listbox`;
  const errorId = `${fieldId}-error`;
  const [query, setQuery] = React.useState<string>('');
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isMenuVisible, setIsMenuVisible] = React.useState<boolean>(false);
  const [isMenuClosing, setIsMenuClosing] = React.useState<boolean>(false);
  const fieldRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const closeTimerRef = React.useRef<number | undefined>(undefined);

  const getOptionKeyByValue = (optionValue?: TValue): string => {
    const matchingOption = options.filter(option => String(option.value) === String(optionValue))[0];
    return matchingOption ? matchingOption.key : '';
  };
  const selectedValues = multiSelect ? values : value !== undefined ? [value] : [];
  const selectedKeys = selectedValues.map(item => getOptionKeyByValue(item)).filter(item => item);
  const selectedOptions = options.filter(option => selectedKeys.indexOf(option.key) !== -1);
  const selectedOption = selectedOptions[0];
  const isDisabled = disabled || loading || readOnly;
  const loadingId = `${fieldId}-loading`;
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});
  const filteredOptions = searchable && query
    ? options.filter(option => option.text.toLowerCase().indexOf(query.toLowerCase()) !== -1)
    : options;

  const updateMenuPosition = React.useCallback((): void => {
    if (!triggerRef.current || typeof window === 'undefined') {
      return;
    }

    const viewportPadding = 12;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuGap = 7;
    const emptyMenuHeight = 54;
    const optionListHeight = filteredOptions.length ? 18 + filteredOptions.length * 39 : emptyMenuHeight;
    const preferredMenuHeight = searchable
      ? Math.min(300, 54 + (filteredOptions.length ? filteredOptions.length * 39 : emptyMenuHeight))
      : Math.min(300, optionListHeight);
    const availableBelow = window.innerHeight - triggerRect.bottom - viewportPadding - menuGap;
    const availableAbove = triggerRect.top - viewportPadding - menuGap;
    const shouldOpenAbove = availableBelow < 180 && availableAbove > availableBelow;
    const availableHeight = Math.max(emptyMenuHeight, shouldOpenAbove ? availableAbove : availableBelow);
    const resolvedHeight = Math.min(preferredMenuHeight, availableHeight);
    const maxLeft = window.innerWidth - viewportPadding - triggerRect.width;
    const resolvedLeft = Math.max(viewportPadding, Math.min(triggerRect.left, maxLeft));

    setMenuStyle({
      left: resolvedLeft,
      maxHeight: resolvedHeight,
      minWidth: triggerRect.width,
      top: shouldOpenAbove ? triggerRect.top - resolvedHeight - menuGap : triggerRect.bottom + menuGap,
      width: triggerRect.width
    });
  }, [filteredOptions.length, searchable]);

  const openMenu = React.useCallback((): void => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }

    updateMenuPosition();
    setIsMenuVisible(true);
    setIsMenuClosing(false);
    setIsOpen(true);
  }, [updateMenuPosition]);

  const closeMenu = React.useCallback((): void => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    setIsOpen(false);
    setIsMenuClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setIsMenuVisible(false);
      setIsMenuClosing(false);
      closeTimerRef.current = undefined;
    }, menuAnimationDurationMs);
  }, []);

  const toggleMenu = React.useCallback((): void => {
    if (isOpen) {
      closeMenu();
      return;
    }

    openMenu();
  }, [closeMenu, isOpen, openMenu]);

  React.useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (!isMenuVisible) {
      return undefined;
    }

    const handleDocumentMouseDown = (event: MouseEvent): void => {
      const target = event.target;
      const isInsideField = fieldRef.current && target instanceof Node && fieldRef.current.contains(target);
      const isInsideMenu = menuRef.current && target instanceof Node && menuRef.current.contains(target);

      if (!isInsideField && !isInsideMenu) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [closeMenu, isMenuVisible]);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  const handleOptionSelect = (option: ILookupOption<TValue>): void => {
    if (!onChange || readOnly) {
      return;
    }

    if (multiSelect) {
      const nextSelectedKeys = selectedKeys.indexOf(option.key) === -1
        ? [...selectedKeys, option.key]
        : selectedKeys.filter(selectedKey => selectedKey !== option.key);
      const nextValues: TValue[] = options
        .filter(item => nextSelectedKeys.indexOf(item.key) !== -1)
        .map(item => item.value);
      onChange(nextValues);
      return;
    }

    onChange(option.value);
    closeMenu();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (isDisabled) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu();
      return;
    }

    if (event.key === 'Escape') {
      closeMenu();
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, option: ILookupOption<TValue>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOptionSelect(option);
      return;
    }

    if (event.key === 'Escape') {
      closeMenu();
    }
  };

  const hasSelection = selectedOptions.length > 0;
  const displayText = multiSelect
    ? hasSelection
      ? selectedOptions.map(option => option.text).join(', ')
      : placeholder
    : selectedOption
      ? selectedOption.text
      : placeholder;
  const describedBy = errorMessage ? errorId : loading ? loadingId : undefined;
  const getOptionDetail = (option: ILookupOption<TValue>): React.ReactNode => {
    if (renderOptionDetail) {
      return renderOptionDetail(option);
    }

    if (showOptionDetails) {
      return option.description || option.detailText;
    }

    return undefined;
  };
  const getSelectedDetail = (option: ILookupOption<TValue>): React.ReactNode => {
    if (renderSelectedDetail) {
      return renderSelectedDetail(option);
    }

    if (showSelectedDetail) {
      return option.description || option.detailText;
    }

    return undefined;
  };

  const renderMenu = (): React.ReactElement => (
    <div
      className={isMenuClosing ? `${styles.menu} ${styles.menuClosing}` : styles.menu}
      ref={menuRef}
      role="presentation"
      style={menuStyle}
    >
      {searchable ? (
        <input
          aria-label={`Search ${label}`}
          className={styles.search}
          disabled={isDisabled}
          onChange={event => setQuery(event.currentTarget.value)}
          placeholder={`Search ${label}`}
          type="search"
          value={query}
        />
      ) : null}
      <div className={styles.optionList} id={listboxId} role="listbox" aria-multiselectable={multiSelect || undefined}>
        {filteredOptions.length ? filteredOptions.map(option => {
          const isSelected = selectedKeys.indexOf(option.key) !== -1;
          const optionDetail = getOptionDetail(option);

          return (
            <button
              aria-selected={isSelected}
              className={[
                styles.option,
                isSelected ? styles.optionSelected : '',
                option.disabled ? styles.optionDisabled : ''
              ].filter(Boolean).join(' ')}
              disabled={option.disabled}
              key={option.key}
              onClick={() => handleOptionSelect(option)}
              onKeyDown={event => handleOptionKeyDown(event, option)}
              role="option"
              type="button"
            >
              <span className={styles.optionContent}>
                {option.iconText ? <span className={styles.optionIcon}>{option.iconText}</span> : null}
                <span className={styles.optionText}>{option.text}</span>
                {optionDetail ? <span className={styles.optionDetail}>{optionDetail}</span> : null}
              </span>
              <span className={multiSelect ? styles.multiIndicator : styles.singleIndicator} aria-hidden="true">
                {isSelected ? <span className={styles.checkMark} /> : null}
              </span>
            </button>
          );
        }) : (
          <span className={styles.emptyOption}>No options available.</span>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.field} ref={fieldRef}>
      <label className={styles.label} htmlFor={fieldId}>
        <span>{label}</span>
        {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
      </label>
      <div className={styles.dropdown}>
        <button
          aria-busy={loading}
          aria-controls={isOpen ? listboxId : undefined}
          aria-describedby={describedBy}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={errorMessage ? true : undefined}
          className={[
            styles.trigger,
            isOpen ? styles.triggerOpen : '',
            errorMessage ? styles.hasError : '',
            !hasSelection ? styles.placeholder : ''
          ].filter(Boolean).join(' ')}
          disabled={isDisabled}
          id={fieldId}
          onClick={toggleMenu}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
        >
          <span className={styles.selectedContent}>
            <span className={styles.selectedText}>{loading ? 'Loading options...' : displayText}</span>
            {!multiSelect && selectedOption && getSelectedDetail(selectedOption) ? (
              <span className={styles.selectedDetail}>{getSelectedDetail(selectedOption)}</span>
            ) : null}
          </span>
          <span className={styles.triggerActions}>
            {hasSelection && !required && !isDisabled ? (
              <span
                aria-label={`Clear ${label}`}
                className={styles.clearButton}
                onClick={event => {
                  event.stopPropagation();
                  if (!onChange || readOnly) {
                    return;
                  }
                  onChange(multiSelect ? [] : undefined);
                }}
                role="button"
                tabIndex={-1}
              >
                <span aria-hidden="true" />
              </span>
            ) : null}
            <span className={isOpen ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron} aria-hidden="true" />
          </span>
        </button>

        {isMenuVisible && typeof document !== 'undefined' ? ReactDom.createPortal(renderMenu(), document.body) : null}

        {multiSelect && selectedOptions.length > 0 ? (
          <div className={styles.selectedPills} aria-label={`Selected ${label}`}>
            {selectedOptions.map(option => (
              <span className={styles.pill} key={option.key}>
                <span>{option.text}</span>
                {!isDisabled ? (
                  <button aria-label={`Remove ${option.text}`} onClick={() => handleOptionSelect(option)} type="button">
                    x
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}

        {multiSelect && selectedOptions.length > 0 && (renderSelectedDetail || showSelectedDetail) ? (
          <div className={styles.selectedDetails}>
            {selectedOptions.map(option => {
              const selectedDetail = getSelectedDetail(option);

              return selectedDetail ? (
                <div className={styles.selectedDetailRow} key={option.key}>
                  <strong>{option.text}</strong>
                  <span>{selectedDetail}</span>
                </div>
              ) : null;
            })}
          </div>
        ) : null}
      </div>
      {loading ? (
        <span className={styles.loadingText} id={loadingId} role="status">
          Loading {label.toLowerCase()} options
        </span>
      ) : null}
      {errorMessage ? (
        <span className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
};
