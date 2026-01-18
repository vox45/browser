import { getAllSchedules, updateScheduleLastRun, getProfile } from '../core/database';
import { FarmingSchedule } from '../core/types';
import { notifyFarmingStart } from './telegram';

type FarmingHandler = (profileIds: string[], config: FarmingSchedule['config']) => Promise<void>;

let schedulerInterval: NodeJS.Timeout | null = null;
let farmingHandler: FarmingHandler | null = null;

export function setFarmingHandler(handler: FarmingHandler): void {
  farmingHandler = handler;
}

export function startScheduler(): void {
  if (schedulerInterval) {
    return;
  }

  // Check every minute
  schedulerInterval = setInterval(checkSchedules, 60000);
  console.log('Scheduler started');

  // Run initial check
  checkSchedules();
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Scheduler stopped');
  }
}

async function checkSchedules(): Promise<void> {
  const schedules = getAllSchedules();
  const now = new Date();
  const currentDay = now.getDay(); // 0-6
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  for (const schedule of schedules) {
    if (!schedule.schedule.enabled) {
      continue;
    }

    // Check if today is a scheduled day
    if (!schedule.schedule.days.includes(currentDay)) {
      continue;
    }

    // Check if current time matches schedule time
    if (schedule.schedule.time !== currentTime) {
      continue;
    }

    // Check if already ran today
    if (schedule.lastRun) {
      const lastRun = new Date(schedule.lastRun);
      if (
        lastRun.getDate() === now.getDate() &&
        lastRun.getMonth() === now.getMonth() &&
        lastRun.getFullYear() === now.getFullYear()
      ) {
        continue;
      }
    }

    // Filter valid profile IDs
    const validProfileIds = schedule.profileIds.filter(id => getProfile(id) !== null);

    if (validProfileIds.length === 0) {
      console.log(`Schedule "${schedule.name}" has no valid profiles, skipping`);
      continue;
    }

    console.log(`Running scheduled farming: ${schedule.name}`);

    // Update last run time
    updateScheduleLastRun(schedule.id);

    // Notify via Telegram
    await notifyFarmingStart(validProfileIds.length);

    // Run farming
    if (farmingHandler) {
      try {
        await farmingHandler(validProfileIds, schedule.config);
      } catch (e) {
        console.error(`Scheduled farming failed:`, e);
      }
    }
  }
}

export function getNextScheduledRun(): { schedule: FarmingSchedule; nextRun: Date } | null {
  const schedules = getAllSchedules().filter(s => s.schedule.enabled);

  if (schedules.length === 0) {
    return null;
  }

  const now = new Date();
  let nearest: { schedule: FarmingSchedule; nextRun: Date } | null = null;

  for (const schedule of schedules) {
    const nextRun = getNextRunTime(schedule, now);
    if (nextRun && (!nearest || nextRun < nearest.nextRun)) {
      nearest = { schedule, nextRun };
    }
  }

  return nearest;
}

function getNextRunTime(schedule: FarmingSchedule, from: Date): Date | null {
  if (!schedule.schedule.enabled || schedule.schedule.days.length === 0) {
    return null;
  }

  const [hours, minutes] = schedule.schedule.time.split(':').map(Number);
  const result = new Date(from);
  result.setHours(hours, minutes, 0, 0);

  // Check up to 7 days ahead
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(result);
    checkDate.setDate(checkDate.getDate() + i);
    const dayOfWeek = checkDate.getDay();

    if (schedule.schedule.days.includes(dayOfWeek)) {
      // If it's today but time has passed, skip to next occurrence
      if (i === 0 && checkDate <= from) {
        continue;
      }
      return checkDate;
    }
  }

  return null;
}
