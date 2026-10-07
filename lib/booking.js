// 予約の業務ロジック（UI から独立させ、単体テスト可能にしている）
import { timeToMin, minToTime, weekdayOf, WEEKDAYS_JA } from './date.js';

export const STATUS = {
  booked: '予約',
  visited: '来店済',
  cancelled: 'キャンセル',
};

/** 営業時間内の予約枠の開始時刻一覧 */
export function generateSlots(open, close, step) {
  const slots = [];
  for (let t = timeToMin(open); t + step <= timeToMin(close); t += step) {
    slots.push(minToTime(t));
  }
  return slots;
}

/** 開始時刻 + 所要分数 → 終了時刻 */
export function endTime(start, durationMin) {
  return minToTime(timeToMin(start) + Number(durationMin));
}

/** 時間帯の重なり判定（終了時刻ちょうどに次が始まるのは重ならない扱い） */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return timeToMin(aStart) < timeToMin(bEnd) && timeToMin(bStart) < timeToMin(aEnd);
}

/** 電話番号の正規化（全角数字・ハイフン・空白を除去） */
export function normalizePhone(phone) {
  return String(phone || '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[-－ー\s]/g, '');
}

/** 国内の電話番号（0 始まり 10〜11 桁）か */
export function isValidPhone(phone) {
  return /^0\d{9,10}$/.test(normalizePhone(phone));
}

/**
 * 予約の入力チェック。問題がなければ空配列を返す。
 * @param {object} r        保存しようとしている予約
 * @param {object} ctx      { reservations, menus, staff, settings, today }
 */
export function validateReservation(r, ctx) {
  const { reservations, menus, staff, settings, today } = ctx;
  const errors = [];

  if (!r.customerName || !r.customerName.trim()) errors.push('お客様名を入力してください。');
  if (!isValidPhone(r.phone)) errors.push('電話番号の形式が正しくありません（例：090-1234-5678）。');

  const menu = menus.find((m) => m.id === r.menuId);
  if (!menu) errors.push('メニューを選択してください。');
  if (!staff.some((s) => s.id === r.staffId)) errors.push('担当スタッフを選択してください。');

  if (!r.date) {
    errors.push('日付を選択してください。');
    return errors;
  }
  // 「予約」状態のまま過去日にはできない（来店済・キャンセルへの変更は可）
  if (r.status === 'booked' && r.date < today) {
    errors.push('過去の日付には予約できません。');
  }
  if (settings.closedWeekdays.includes(weekdayOf(r.date))) {
    errors.push(`${WEEKDAYS_JA[weekdayOf(r.date)]}曜日は定休日です。`);
  }
  if (!menu || !r.start) return errors;

  const end = endTime(r.start, menu.duration);
  if (timeToMin(r.start) < timeToMin(settings.open) || timeToMin(end) > timeToMin(settings.close)) {
    errors.push(`営業時間（${settings.open}〜${settings.close}）内に収まりません（終了予定 ${end}）。`);
  }

  if (r.status !== 'cancelled') {
    const clash = reservations.find(
      (o) =>
        o.id !== r.id &&
        o.status !== 'cancelled' &&
        o.date === r.date &&
        o.staffId === r.staffId &&
        overlaps(r.start, end, o.start, o.end)
    );
    if (clash) {
      errors.push(`担当スタッフの予約（${clash.start}〜${clash.end} ${clash.customerName}様）と重なっています。`);
    }
  }
  return errors;
}

/** 入力値から保存用の予約データを作る（終了時刻・料金はメニューから確定） */
export function buildReservation(input, menus) {
  const menu = menus.find((m) => m.id === input.menuId);
  return {
    ...input,
    customerName: input.customerName.trim(),
    phone: normalizePhone(input.phone),
    end: endTime(input.start, menu.duration),
    price: menu.price,
    menuName: menu.name, // メニュー変更・削除後も履歴として残す
  };
}

/** CSV 1 セルのエスケープ */
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 予約一覧 → CSV 文字列（Excel で文字化けしないよう、出力時に BOM を付与する） */
export function toCSV(reservations, staff) {
  const header = ['予約日', '開始', '終了', 'お客様名', '電話番号', 'メニュー', '担当', '料金', '状態', 'メモ'];
  const staffName = (id) => staff.find((s) => s.id === id)?.name ?? '';
  const rows = [...reservations]
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map((r) => [
      r.date, r.start, r.end, r.customerName, r.phone, r.menuName,
      staffName(r.staffId), r.price, STATUS[r.status] ?? r.status, r.memo ?? '',
    ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** 集計：指定日の予約件数、期間内の売上見込み（キャンセル除く） */
export function summarize(reservations, today, weekKeys) {
  const active = reservations.filter((r) => r.status !== 'cancelled');
  return {
    todayCount: active.filter((r) => r.date === today).length,
    weekCount: active.filter((r) => weekKeys.includes(r.date)).length,
    weekSales: active.filter((r) => weekKeys.includes(r.date)).reduce((sum, r) => sum + Number(r.price), 0),
  };
}

/** メニューが有効な予約（未来・キャンセル以外）で使われているか */
export function isMenuInUse(menuId, reservations, today) {
  return reservations.some((r) => r.menuId === menuId && r.status === 'booked' && r.date >= today);
}
