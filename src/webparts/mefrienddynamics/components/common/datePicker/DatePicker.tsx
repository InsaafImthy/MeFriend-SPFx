import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Icon } from '@fluentui/react';
import styles from './DatePicker.module.scss';

export type DatePickerTimeMode = 'none' | 'single' | 'range';
type CalendarPanelView = 'calendar' | 'month' | 'year';

export interface IDatePickerQuickAction {
  label: string;
  getValue: () => string;
}

export interface IDatePickerProps {
  label: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  errorMessage?: string;
  onChange?: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  useCustomPicker?: boolean;
  showQuickActions?: boolean;
  quickActions?: readonly IDatePickerQuickAction[];
  timeMode?: DatePickerTimeMode;
  startTime?: string;
  endTime?: string;
  onStartTimeChange?: (value: string) => void;
  onEndTimeChange?: (value: string) => void;
}

interface ICalendarDay {
  date: Date;
  isoValue: string;
  isCurrentMonth: boolean;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));

const toIsoDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateValue = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const dateParts = value.substring(0, 10).split('-');

  if (dateParts.length !== 3) {
    return undefined;
  }

  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const day = Number(dateParts[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined;
  }

  const parsedDate = new Date(year, month - 1, day);

  return parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day ? parsedDate : undefined;
};

const formatDisplayValue = (value?: string): string => {
  const parsedDate = parseDateValue(value);

  return parsedDate ? `${pad(parsedDate.getDate())}/${pad(parsedDate.getMonth() + 1)}/${parsedDate.getFullYear()}` : '';
};

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getDefaultQuickActions = (): readonly IDatePickerQuickAction[] => [
  {
    label: 'Today',
    getValue: () => toIsoDate(new Date())
  },
  {
    label: 'Tomorrow',
    getValue: () => toIsoDate(addDays(new Date(), 1))
  }
];

const getCalendarDays = (viewDate: Date): readonly ICalendarDay[] => {
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayBasedDay = (firstDayOfMonth.getDay() + 6) % 7;
  const firstVisibleDay = addDays(firstDayOfMonth, -mondayBasedDay);
  const days: ICalendarDay[] = [];

  for (let dayIndex = 0; dayIndex < 42; dayIndex += 1) {
    const date = addDays(firstVisibleDay, dayIndex);

    days.push({
      date,
      isoValue: toIsoDate(date),
      isCurrentMonth: date.getMonth() === viewDate.getMonth()
    });
  }

  return days;
};

const getYearOptions = (year: number): readonly number[] => {
  const rangeStart = Math.floor(year / 12) * 12;
  const years: number[] = [];

  for (let yearIndex = 0; yearIndex < 12; yearIndex += 1) {
    years.push(rangeStart + yearIndex);
  }

  return years;
};

const isDateDisabled = (isoValue: string, minDate?: string, maxDate?: string): boolean => {
  if (minDate && isoValue < minDate) {
    return true;
  }

  if (maxDate && isoValue > maxDate) {
    return true;
  }

  return false;
};

export const DatePicker: React.FC<IDatePickerProps> = ({
  label,
  value = '',
  required = false,
  disabled = false,
  readOnly = false,
  errorMessage,
  onChange,
  minDate,
  maxDate,
  useCustomPicker = false,
  showQuickActions = false,
  quickActions,
  timeMode = 'none',
  startTime = '00:00:00',
  endTime = '00:00:00',
  onStartTimeChange,
  onEndTimeChange
}) => {
  const fieldId = React.useMemo(() => `date-${Math.random().toString(36).substr(2, 9)}`, []);
  const errorId = `${fieldId}-error`;
  const pickerId = `${fieldId}-picker`;
  const fieldRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const selectedDate = React.useMemo(() => parseDateValue(value), [value]);
  const [viewDate, setViewDate] = React.useState<Date>(selectedDate || new Date());
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [panelView, setPanelView] = React.useState<CalendarPanelView>('calendar');
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({});
  const shouldUseCustomPicker = useCustomPicker || timeMode !== 'none' || showQuickActions || Boolean(quickActions && quickActions.length);
  const resolvedQuickActions = quickActions || getDefaultQuickActions();
  const calendarDays = React.useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const yearOptions = React.useMemo(() => getYearOptions(viewDate.getFullYear()), [viewDate]);
  const todayValue = toIsoDate(new Date());

  const updatePanelPosition = React.useCallback((): void => {
    if (!triggerRef.current) {
      return;
    }

    const viewportPadding = 12;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const panelWidth = panelRef.current ? panelRef.current.offsetWidth : 286;
    const panelHeight = panelRef.current ? panelRef.current.offsetHeight : 338;
    const maxPanelWidth = Math.max(280, window.innerWidth - viewportPadding * 2);
    const resolvedPanelWidth = Math.min(panelWidth, maxPanelWidth);
    const left = Math.min(Math.max(triggerRect.left, viewportPadding), window.innerWidth - resolvedPanelWidth - viewportPadding);
    const belowTop = triggerRect.bottom + 8;
    const aboveTop = triggerRect.top - panelHeight - 8;
    const hasSpaceBelow = belowTop + panelHeight <= window.innerHeight - viewportPadding;
    const top = hasSpaceBelow || aboveTop < viewportPadding ? belowTop : aboveTop;

    setPanelStyle({
      left,
      maxHeight: Math.max(260, window.innerHeight - viewportPadding * 2),
      top: Math.max(viewportPadding, top),
      width: resolvedPanelWidth
    });
  }, []);

  React.useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleDocumentMouseDown = (event: MouseEvent): void => {
      const target = event.target;
      const isInsideField = fieldRef.current && target instanceof Node && fieldRef.current.contains(target);
      const isInsidePanel = panelRef.current && target instanceof Node && panelRef.current.contains(target);

      if (!isInsideField && !isInsidePanel) {
        setIsOpen(false);
        setPanelView('calendar');
      }
    };

    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setPanelView('calendar');
      }
    };

    updatePanelPosition();
    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleDocumentKeyDown);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition]);

  React.useLayoutEffect(() => {
    if (isOpen) {
      updatePanelPosition();
    }
  }, [isOpen, panelView, timeMode, updatePanelPosition]);

  const moveMonth = (monthOffset: number): void => {
    setViewDate(currentDate => new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1));
    setPanelView('calendar');
  };

  const selectDate = (nextValue: string): void => {
    if (isDateDisabled(nextValue, minDate, maxDate)) {
      return;
    }

    if (onChange) {
      onChange(nextValue);
    }

    const nextDate = parseDateValue(nextValue);

    if (nextDate) {
      setViewDate(nextDate);
    }

    if (timeMode === 'none') {
      setIsOpen(false);
    }
  };

  const clearDate = (): void => {
    if (onChange) {
      onChange('');
    }
  };

  const selectMonth = (monthIndex: number): void => {
    setViewDate(currentDate => new Date(currentDate.getFullYear(), monthIndex, 1));
    setPanelView('calendar');
  };

  const moveYearRange = (yearOffset: number): void => {
    setViewDate(currentDate => new Date(currentDate.getFullYear() + yearOffset, currentDate.getMonth(), 1));
  };

  const selectYear = (year: number): void => {
    setViewDate(currentDate => new Date(year, currentDate.getMonth(), 1));
    setPanelView('month');
  };

  const renderNativePicker = (): React.ReactElement => (
    <input
      aria-describedby={errorMessage ? errorId : undefined}
      aria-invalid={errorMessage ? true : undefined}
      className={errorMessage ? `${styles.control} ${styles.hasError}` : styles.control}
      disabled={disabled}
      id={fieldId}
      max={maxDate}
      min={minDate}
      onChange={event => onChange && onChange(event.currentTarget.value)}
      readOnly={readOnly}
      required={required}
      type="date"
      value={value}
    />
  );

  const renderPickerPanel = (): React.ReactElement => (
    <div className={styles.pickerPanel} id={pickerId} ref={panelRef} role="dialog" aria-label={`${label} calendar`} style={panelStyle}>
      {showQuickActions || quickActions ? (
        <div className={styles.quickActions}>
          {resolvedQuickActions.map(action => (
            <button key={action.label} onClick={() => selectDate(action.getValue())} type="button">
              {action.label}
            </button>
          ))}
          <button className={styles.moreAction} onClick={() => setPanelView(currentValue => (currentValue === 'calendar' ? 'month' : 'calendar'))} type="button">
            More <Icon iconName="ChevronDown" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <div className={styles.calendarHeader}>
        <button aria-label="Previous month" className={styles.iconButton} onClick={() => moveMonth(-1)} type="button">
          <Icon iconName="ChevronLeft" aria-hidden="true" />
        </button>
        <button className={styles.monthButton} onClick={() => setPanelView(currentValue => (currentValue === 'calendar' ? 'month' : 'calendar'))} type="button">
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          <Icon iconName="ChevronDown" aria-hidden="true" />
        </button>
        <button aria-label="Next month" className={styles.iconButton} onClick={() => moveMonth(1)} type="button">
          <Icon iconName="ChevronRight" aria-hidden="true" />
        </button>
      </div>
      {panelView === 'year' ? (
        <React.Fragment>
          <div className={styles.yearSelector}>
            <button aria-label="Previous year range" className={styles.iconButton} onClick={() => moveYearRange(-12)} type="button">
              <Icon iconName="ChevronLeft" aria-hidden="true" />
            </button>
            <span>
              {yearOptions[0]} - {yearOptions[yearOptions.length - 1]}
            </span>
            <button aria-label="Next year range" className={styles.iconButton} onClick={() => moveYearRange(12)} type="button">
              <Icon iconName="ChevronRight" aria-hidden="true" />
            </button>
          </div>
          <div className={styles.yearGrid}>
            {yearOptions.map(year => (
              <button
                className={year === viewDate.getFullYear() ? styles.selectedMonth : undefined}
                key={year}
                onClick={() => selectYear(year)}
                type="button"
              >
                {year}
              </button>
            ))}
          </div>
        </React.Fragment>
      ) : panelView === 'month' ? (
        <React.Fragment>
          <div className={styles.yearSelector}>
            <button aria-label="Previous year" className={styles.iconButton} onClick={() => moveYearRange(-1)} type="button">
              <Icon iconName="ChevronLeft" aria-hidden="true" />
            </button>
            <button className={styles.yearButton} onClick={() => setPanelView('year')} type="button">
              {viewDate.getFullYear()}
              <Icon iconName="ChevronDown" aria-hidden="true" />
            </button>
            <button aria-label="Next year" className={styles.iconButton} onClick={() => moveYearRange(1)} type="button">
              <Icon iconName="ChevronRight" aria-hidden="true" />
            </button>
          </div>
          <div className={styles.monthGrid}>
            {monthNames.map((monthName, monthIndex) => (
              <button
                className={monthIndex === viewDate.getMonth() ? styles.selectedMonth : undefined}
                key={monthName}
                onClick={() => selectMonth(monthIndex)}
                type="button"
              >
                {monthName.substring(0, 3)}
              </button>
            ))}
          </div>
        </React.Fragment>
      ) : (
        <div className={styles.calendarGrid}>
          {weekDays.map(day => (
            <span className={styles.weekDay} key={day}>
              {day}
            </span>
          ))}
          {calendarDays.map(day => {
            const isSelected = value === day.isoValue;
            const disabledDay = isDateDisabled(day.isoValue, minDate, maxDate);
            const dayClassName = [
              styles.dayButton,
              day.isCurrentMonth ? '' : styles.outsideMonth,
              day.isoValue === todayValue ? styles.today : '',
              isSelected ? styles.selectedDay : ''
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                aria-pressed={isSelected}
                className={dayClassName}
                disabled={disabledDay}
                key={day.isoValue}
                onClick={() => selectDate(day.isoValue)}
                type="button"
              >
                {day.date.getDate()}
              </button>
            );
          })}
        </div>
      )}
      {timeMode !== 'none' ? (
        <div className={styles.timeFields}>
          <label>
            <span>{timeMode === 'range' ? 'Start time' : 'Time'}</span>
            <input onChange={event => onStartTimeChange && onStartTimeChange(event.currentTarget.value)} type="time" value={startTime.substring(0, 5)} />
          </label>
          {timeMode === 'range' ? (
            <label>
              <span>End time</span>
              <input onChange={event => onEndTimeChange && onEndTimeChange(event.currentTarget.value)} type="time" value={endTime.substring(0, 5)} />
            </label>
          ) : null}
        </div>
      ) : null}
      <div className={styles.panelFooter}>
        <button className={styles.clearButton} onClick={clearDate} type="button">
          Clear
        </button>
        {timeMode === 'none' ? (
          <button className={styles.todayButton} onClick={() => selectDate(todayValue)} type="button">
            Today
          </button>
        ) : (
          <React.Fragment>
            <button className={styles.cancelButton} onClick={() => setIsOpen(false)} type="button">
              Cancel
            </button>
            <button className={styles.doneButton} onClick={() => setIsOpen(false)} type="button">
              Done
            </button>
          </React.Fragment>
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
      {!shouldUseCustomPicker ? (
        renderNativePicker()
      ) : (
        <div className={styles.customPickerShell}>
          <button
            aria-controls={pickerId}
            aria-describedby={errorMessage ? errorId : undefined}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-invalid={errorMessage ? true : undefined}
            className={errorMessage ? `${styles.customTrigger} ${styles.hasError}` : styles.customTrigger}
            disabled={disabled || readOnly}
            id={fieldId}
            onClick={() => setIsOpen(currentValue => !currentValue)}
            ref={triggerRef}
            type="button"
          >
            <span className={value ? styles.triggerValue : styles.triggerPlaceholder}>{value ? formatDisplayValue(value) : 'dd/mm/yyyy'}</span>
            <Icon iconName="Calendar" aria-hidden="true" />
          </button>
          {isOpen ? ReactDom.createPortal(renderPickerPanel(), document.body) : null}
        </div>
      )}
      {errorMessage ? (
        <span className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
};
