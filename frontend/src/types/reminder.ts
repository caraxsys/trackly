export interface Reminder {
  id: string;
  habitId: string;
  timeOfDay: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderListData {
  timezone: string;
  items: Reminder[];
}

export interface ReminderPayload {
  timeOfDay: string;
  isEnabled: boolean;
}
