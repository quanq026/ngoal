import { getJobSettings, type JobSettings } from '@repo/db';
import { sweepStaleIssues } from '#modules/issues/auto-archive';
import { processEmailNotificationDeliveries } from '#modules/notifications/email-delivery';

// The api's background jobs, started by index.ts rather than assembled into the app,
// so importing the app in a test starts nothing.
export function startBackgroundJobs(): void {
  startLoop('auto-archive', autoArchive, (jobs) => minutes(jobs.sweeps.autoArchiveMinutes));
  startLoop(
    'email-notifications',
    sendEmailNotifications,
    (jobs) => jobs.notifications.pollIntervalMs,
  );
}

function minutes(value: number): number {
  return value * 60_000;
}

async function autoArchive(): Promise<void> {
  const archived = await sweepStaleIssues();
  if (archived > 0) console.log(`[background] auto-archived ${archived} stale issues`);
}

async function sendEmailNotifications(): Promise<void> {
  const { notifications } = await getJobSettings();
  await processEmailNotificationDeliveries(notifications);
}

// How soon a loop tries again when the job settings could not be read.
const SETTINGS_RETRY_MS = 5000;

// The interval is read from the job settings after every pass, so a change in god mode
// applies from the next one.
function startLoop(
  name: string,
  job: () => Promise<void>,
  intervalMs: (jobs: JobSettings) => number,
): void {
  const tick = async () => {
    try {
      await job();
    } catch (error) {
      console.error(`[background] ${name} failed:`, error);
    }
    setTimeout(tick, await nextDelay(name, intervalMs)).unref();
  };
  void tick();
}

async function nextDelay(name: string, intervalMs: (jobs: JobSettings) => number): Promise<number> {
  try {
    return intervalMs(await getJobSettings());
  } catch (error) {
    console.error(`[background] ${name} could not read the job settings:`, error);
    return SETTINGS_RETRY_MS;
  }
}
