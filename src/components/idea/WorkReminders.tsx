import type { PublicWorkReminder } from "@/lib/types";

export function WorkReminders({
  reminders,
  compact = false,
}: {
  reminders: PublicWorkReminder[];
  compact?: boolean;
}) {
  if (!reminders?.length) return null;
  if (compact) {
    return (
      <ul className="work-reminder-tags">
        {reminders.map((reminder) => (
          <li key={reminder.id}>{reminder.title}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="public-work-reminders">
      <small>迭代提醒</small>
      {reminders.map((reminder) => (
        <p key={reminder.id}>
          <strong>{reminder.title}</strong>
          {reminder.summary}
        </p>
      ))}
    </div>
  );
}
