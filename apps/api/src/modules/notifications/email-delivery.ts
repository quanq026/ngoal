import {
  db,
  emailSource,
  getDeliveryConfig,
  getInstanceEmailConfig,
  getProjectEmailConfig,
  notificationDelivery,
  project,
  teamInvite,
  type DeliveryPayload,
  type JobSettings,
} from '@repo/db';
import { emailBody, sendEmail, type EmailConfig, type SendResult } from '@repo/mailer';
import { and, eq, sql } from 'drizzle-orm';

interface ClaimedNotification {
  id: number;
  projectId: number;
  channel: string;
  recipient: string | null;
  payload: DeliveryPayload;
  attempts: number;
}

type NotificationJobs = JobSettings['notifications'];

function equalJitterBackoffMs(attempts: number, baseMs: number, capMs: number): number {
  const window = Math.min(capMs, baseMs * 2 ** Math.max(0, attempts - 1));
  const half = window / 2;
  return Math.floor(half + Math.random() * half);
}

/** Drains due email rows from the notification_delivery outbox inside the API process. */
export async function processEmailNotificationDeliveries(jobs: NotificationJobs): Promise<void> {
  const claimed = await claimDueDeliveries(jobs);
  await Promise.all(claimed.map((row) => processDelivery(row, jobs.maxAttempts)));
}

async function claimDueDeliveries({
  batchSize,
  leaseSeconds,
}: NotificationJobs): Promise<ClaimedNotification[]> {
  const rows = await db.execute(sql`
    UPDATE notification_delivery d
    SET attempts = d.attempts + 1,
        next_attempt_at = now() + make_interval(secs => ${leaseSeconds})
    WHERE d.id IN (
      SELECT id FROM notification_delivery
      WHERE status = 'pending' AND next_attempt_at <= now()
      ORDER BY next_attempt_at, id
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    )
    RETURNING
      d.id,
      d.project_id AS "projectId",
      d.channel,
      d.recipient,
      d.payload,
      d.attempts
  `);
  return rows as unknown as ClaimedNotification[];
}

async function isInvitePending(projectId: number, inviteId: number): Promise<boolean> {
  const rows = await db
    .select({ id: teamInvite.id })
    .from(teamInvite)
    .where(
      and(
        eq(teamInvite.projectId, projectId),
        eq(teamInvite.id, inviteId),
        eq(teamInvite.status, 'pending'),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function teamOf(projectId: number): Promise<number | null> {
  const rows = await db
    .select({ teamId: project.teamId })
    .from(project)
    .where(eq(project.id, projectId));
  return rows[0]?.teamId ?? null;
}

async function deliverEmailRow(row: ClaimedNotification): Promise<SendResult> {
  if (row.channel !== 'email') {
    return { ok: false, retryable: false, error: `channel disabled in lite: ${row.channel}` };
  }
  if (
    row.payload.projectInviteId != null &&
    !(await isInvitePending(row.projectId, row.payload.projectInviteId))
  ) {
    return { ok: true };
  }
  if (!row.recipient) return { ok: false, retryable: false, error: 'no recipient' };

  const teamId = await teamOf(row.projectId);
  if (teamId == null) return { ok: false, retryable: false, error: 'Project not found' };

  const config = await getDeliveryConfig(teamId);
  const source = emailSource(config);
  const emailConfig: EmailConfig | null =
    row.payload.emailSource === 'instance'
      ? await getInstanceEmailConfig()
      : source === 'system'
        ? await getProjectEmailConfig()
        : source === 'none'
          ? null
          : { smtp: config.smtp, resend: config.resend, from: config.from };

  if (!emailConfig) return { ok: false, retryable: false, error: 'email not configured' };

  const { text, html } = row.payload.html
    ? { text: row.payload.text, html: row.payload.html }
    : emailBody(row.payload.text, row.payload.url);

  return sendEmail(emailConfig, {
    to: row.recipient,
    subject: row.payload.subject ?? '',
    text,
    html,
    idempotencyKey: row.payload.idempotencyKey,
  });
}

async function processDelivery(d: ClaimedNotification, maxAttempts: number): Promise<void> {
  let result: SendResult;
  try {
    result = await deliverEmailRow(d);
  } catch (err) {
    result = {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err.message : 'send failed',
    };
  }

  if (result.ok) {
    await db.delete(notificationDelivery).where(eq(notificationDelivery.id, d.id));
    return;
  }

  const error = (result.error ?? 'delivery failed').slice(0, 500);
  if (result.retryable && d.attempts < maxAttempts) {
    const delaySeconds = Math.ceil(equalJitterBackoffMs(d.attempts, 30_000, 30 * 60_000) / 1000);
    await db
      .update(notificationDelivery)
      .set({ nextAttemptAt: sql`now() + make_interval(secs => ${delaySeconds})`, lastError: error })
      .where(eq(notificationDelivery.id, d.id));
    return;
  }

  await db
    .update(notificationDelivery)
    .set({ status: 'failed', lastError: error })
    .where(eq(notificationDelivery.id, d.id));
}
