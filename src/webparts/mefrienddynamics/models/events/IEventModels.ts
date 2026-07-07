export interface IEventListItem {
  id: string;
  eventCode: string;
  eventName: string;
  startDate?: string;
  endDate?: string;
  status: string;
}

export interface IEventDetail extends IEventListItem {
  description?: string;
  venue?: string;
}

export interface IEventFilters {
  searchText?: string;
  status?: string;
  startDateFrom?: string;
  startDateTo?: string;
}
