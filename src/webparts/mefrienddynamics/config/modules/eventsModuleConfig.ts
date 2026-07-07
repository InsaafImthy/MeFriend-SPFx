import type { IModuleConfig } from '../../models/common/IModuleConfig';
import type { ILookupOption } from '../../models/common/ILookupOption';
import type { IEventListItem } from '../../models/events/IEventModels';

const eventStatusOptions: readonly ILookupOption[] = [
  { key: 'active', text: 'Active', value: 'Active' },
  { key: 'open', text: 'Open', value: 'Open' },
  { key: 'closed', text: 'Closed', value: 'Closed' }
];

export const eventsModuleConfig: IModuleConfig<IEventListItem> = {
  key: 'events',
  title: 'Events',
  route: 'events',
  icon: 'Calendar',
  description: 'Read-only event listing with search and filtering.',
  createEnabled: false,
  detailEnabled: false,
  order: 2,
  visible: true,
  tableColumns: [
    { key: 'eventCode', header: 'Event Code', fieldName: 'eventCode', sortable: true, renderType: 'text' },
    { key: 'eventName', header: 'Event Name', fieldName: 'eventName', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'startDate', header: 'Start Date', fieldName: 'startDate', sortable: true, renderType: 'date' },
    { key: 'endDate', header: 'End Date', fieldName: 'endDate', sortable: true, renderType: 'date' },
    { key: 'status', header: 'Status', fieldName: 'status', sortable: true, renderType: 'status' }
  ],
  filters: [
    { key: 'searchText', label: 'Search', type: 'text' },
    { key: 'startDate', label: 'Start Date', type: 'dateRange' },
    { key: 'status', label: 'Status', type: 'status', options: eventStatusOptions }
  ]
};
