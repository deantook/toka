export const DEFAULT_TIMEZONE = "Asia/Shanghai";

export function localDateString(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: DEFAULT_TIMEZONE });
}

export function formatPromptDateTime(date = new Date()): string {
  return date.toLocaleString("zh-CN", {
    timeZone: DEFAULT_TIMEZONE,
    dateStyle: "full",
    timeStyle: "short",
  });
}

export function startOfLocalDay(date: Date): Date {
  const ymd = localDateString(date);
  return new Date(`${ymd}T00:00:00+08:00`);
}

export function addLocalDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function resolveDateRangeFromMessage(msg: string): {
  start: Date;
  end: Date;
  label: string;
} | null {
  const now = new Date();
  const today = startOfLocalDay(now);

  if (/今天|今日/.test(msg)) {
    const end = addLocalDays(today, 1);
    return { start: today, end, label: `今天 (${localDateString(today)})` };
  }
  if (/明天/.test(msg)) {
    const start = addLocalDays(today, 1);
    const end = addLocalDays(start, 1);
    return { start, end, label: `明天 (${localDateString(start)})` };
  }
  if (/后天/.test(msg)) {
    const start = addLocalDays(today, 2);
    const end = addLocalDays(start, 1);
    return { start, end, label: `后天 (${localDateString(start)})` };
  }
  if (/本周|这周/.test(msg)) {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = addLocalDays(today, mondayOffset);
    const end = addLocalDays(start, 7);
    return {
      start,
      end,
      label: `本周 (${localDateString(start)} ~ ${localDateString(addLocalDays(end, -1))})`,
    };
  }
  return null;
}
