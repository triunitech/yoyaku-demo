// 日付・時刻ユーティリティ
// 日付は "YYYY-MM-DD"（ローカル時刻）、時刻は "HH:MM" の文字列で扱う。
// タイムゾーンのずれを避けるため、Date の UTC 系メソッドは使わない。

export const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

const pad = (n) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" */
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → Date（その日の 0:00、ローカル時刻） */
export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "YYYY-MM-DD" に n 日加算 */
export function addDays(key, n) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** 週の開始日（月曜日）を返す */
export function startOfWeek(key) {
  const d = parseDateKey(key);
  const diff = (d.getDay() + 6) % 7; // 月曜=0 … 日曜=6
  return addDays(key, -diff);
}

/** 週の 7 日分の日付キー（月〜日） */
export function weekDays(key) {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 曜日番号（0=日曜） */
export function weekdayOf(key) {
  return parseDateKey(key).getDay();
}

/** "HH:MM" → 0 時からの分数 */
export function timeToMin(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 分数 → "HH:MM" */
export function minToTime(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** "2026-10-07" → "10月7日（水）" */
export function formatJa(key) {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS_JA[d.getDay()]}）`;
}

/** 金額 → "4,400円" */
export function formatYen(n) {
  return `${Number(n).toLocaleString('ja-JP')}円`;
}
