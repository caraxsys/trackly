import type { CategoryProjection } from '../shared/query.types.js';

export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type HabitView = 'today' | 'all' | 'archived' | 'inactive';
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

export interface CreateHabitInput {
  categoryId?: string | null | undefined;
  description?: string | null | undefined;
  endDate?: string | null | undefined;
  frequencyType: HabitFrequency;
  isActive?: boolean | undefined;
  name: string;
  startDate: string;
  targetCount?: number | undefined;
  weekdays?: number[] | undefined;
}

export interface UpdateHabitInput {
  categoryId?: string | null | undefined;
  description?: string | null | undefined;
  endDate?: string | null | undefined;
  frequencyType?: HabitFrequency | undefined;
  isActive?: boolean | undefined;
  name?: string | undefined;
  startDate?: string | undefined;
  targetCount?: number | undefined;
  weekdays?: number[] | undefined;
}

export interface HabitCommandResult {
  categoryId: string | null;
  description: string | null;
  endDate: string | null;
  frequencyType: HabitFrequency;
  id: string;
  isActive: boolean;
  name: string;
  startDate: string;
  targetCount: number;
  weekdays: number[];
}

export interface HabitCheckInInput {
  completedCount: number;
  date?: string | undefined;
}

export interface HabitCheckInResult {
  completedCount: number;
  date: string;
  habitId: string;
  isCompleted: boolean;
  targetCount: number;
}
