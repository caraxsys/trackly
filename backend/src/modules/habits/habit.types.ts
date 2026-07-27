import type { CategoryProjection } from '../shared/query.types.js';

export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type HabitView = 'today' | 'all' | 'inactive';
export type HabitSort = 'position' | 'name' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface TodayHabit {
  category: CategoryProjection | null;
  completedCount: number;
  description: string | null;
  frequencyType: HabitFrequency;
  id: string;
  isCompleted: boolean;
  name: string;
  position: number;
  targetCount: number;
}

export interface HabitSelectedDate {
  completedCount: number;
  date: string;
  isCompleted: boolean;
  isScheduled: boolean;
}

export interface HabitListItem {
  category: CategoryProjection | null;
  createdAt: string;
  description: string | null;
  endDate: string | null;
  frequencyType: HabitFrequency;
  id: string;
  isActive: boolean;
  name: string;
  position: number;
  schedule: { weekdays: number[] };
  selectedDate: HabitSelectedDate;
  startDate: string;
  targetCount: number;
  updatedAt: string;
}

export interface HabitCollectionQuery {
  date: string;
  limit: number;
  order: SortOrder;
  page: number;
  search: string;
  sort: HabitSort;
  view: HabitView;
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
  query: Omit<HabitCollectionQuery, 'limit' | 'page'> & { timezone: string };
}

export interface HabitDetail extends Omit<HabitListItem, 'selectedDate'> {
  today: HabitSelectedDate;
  timezone: string;
}
