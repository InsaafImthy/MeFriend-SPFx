export interface IEventListItem {
  id: string;
  dimensionCode: string;
  eventCode: string;
  eventName: string;
}

export type IEventDetail = IEventListItem;

export interface IEventFilters {
  searchText?: string;
}
