export type HabitView = 'today' | 'all' | 'inactive';
export type HabitSort = 'position' | 'name' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';
export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface HabitCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export interface HabitDateProjection {
  date: string;
  isScheduled: boolean;
  completedCount: number;
  isCompleted: boolean;
}

export interface HabitListItem {
  id: string;
  name: string;
  description: string | null;
  frequencyType: HabitFrequency;
  targetCount: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  position: number;
  category: HabitCategory | null;
  schedule: { weekdays: number[] };
  selectedDate: HabitDateProjection;
  createdAt: string;
  updatedAt: string;
}

export interface HabitCollectionData {
  items: HabitListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  query: {
    view: HabitView;
    date: string;
    timezone: string;
    search: string;
    sort: HabitSort;
    order: SortOrder;
  };
}

export interface HabitDetail extends Omit<HabitListItem, 'selectedDate'> {
  today: HabitDateProjection;
  timezone: string;
}

export interface HabitCollectionParams {
  view?: string;
  date?: string;
  search?: string;
  sort?: string;
  order?: string;
  page?: string;
}
