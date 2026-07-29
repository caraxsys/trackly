export interface ReminderItem {
  id: string;
  habitId: string;
  timeOfDay: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderList {
  timezone: string;
  items: ReminderItem[];
}
