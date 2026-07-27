import { relations } from 'drizzle-orm';

import { categories } from './categories.js';
import { goalSteps } from './goal-steps.js';
import { goals } from './goals.js';
import { habitCheckIns } from './habit-check-ins.js';
import { habitSchedules } from './habit-schedules.js';
import { habits } from './habits.js';
import { tasks } from './tasks.js';

export const categoriesRelations = relations(categories, ({ many }) => ({
  habits: many(habits),
  tasks: many(tasks),
  goals: many(goals),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  category: one(categories, {
    fields: [habits.categoryId],
    references: [categories.id],
  }),
  schedules: many(habitSchedules),
  checkIns: many(habitCheckIns),
}));

export const habitSchedulesRelations = relations(habitSchedules, ({ one }) => ({
  habit: one(habits, {
    fields: [habitSchedules.habitId],
    references: [habits.id],
  }),
}));

export const habitCheckInsRelations = relations(habitCheckIns, ({ one }) => ({
  habit: one(habits, {
    fields: [habitCheckIns.habitId],
    references: [habits.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  category: one(categories, {
    fields: [tasks.categoryId],
    references: [categories.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  category: one(categories, {
    fields: [goals.categoryId],
    references: [categories.id],
  }),
  steps: many(goalSteps),
}));

export const goalStepsRelations = relations(goalSteps, ({ one }) => ({
  goal: one(goals, {
    fields: [goalSteps.goalId],
    references: [goals.id],
  }),
}));
