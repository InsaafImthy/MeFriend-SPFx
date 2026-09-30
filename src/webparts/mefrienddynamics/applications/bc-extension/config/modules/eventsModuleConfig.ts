import type { IModuleConfig } from '../../../../shared/models/IModuleConfig';
import type { IEventListItem } from '../../models/events/IEventModels';

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
    { key: 'eventName', header: 'Event Name', fieldName: 'eventName', sortable: true, renderType: 'text', minWidth: 180 }
  ],
  filters: [
    { key: 'searchText', label: 'Search', type: 'text' }
  ]
};
