export interface IEventListItem {
  id: string;
  eventCode: string;
  eventName: string;
}

export interface IEventDetail extends IEventListItem {
  description?: string;
  venue?: string;
}

export interface IEventFilters {
  searchText?: string;
}
