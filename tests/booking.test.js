// 実行: npm test（Node.js 標準のテストランナーを使用。追加パッケージ不要）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSlots, endTime, overlaps, normalizePhone, isValidPhone,
  validateReservation, buildReservation, toCSV, summarize, isMenuInUse,
} from '../lib/booking.js';
import { startOfWeek, weekDays, formatJa, addDays, weekdayOf } from '../lib/date.js';
import { seedData } from '../lib/store.js';

const TODAY = '2026-10-07'; // 水曜日
const base = () => seedData(TODAY);

const input = (over = {}) => ({
  id: 'new', date: '2026-10-08', start: '10:00', menuId: 'm1', staffId: 's1',
  customerName: 'テスト 太郎', phone: '090-0000-0000', memo: '', status: 'booked', ...over,
});

const ctx = (data) => ({ ...data, today: TODAY });

test('日付: 週の開始は月曜日', () => {
  assert.equal(startOfWeek('2026-10-07'), '2026-10-05');
  assert.equal(startOfWeek('2026-10-11'), '2026-10-05'); // 日曜 → 同じ週の月曜
  assert.equal(startOfWeek('2026-10-05'), '2026-10-05');
  assert.deepEqual(weekDays('2026-10-07').at(-1), '2026-10-11');
});

test('日付: 月またぎ・表示形式', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(formatJa('2026-10-07'), '10月7日（水）');
  assert.equal(weekdayOf('2026-10-06'), 2); // 火曜
});

test('予約枠: 営業時間内で終了時刻を超えない', () => {
  const slots = generateSlots('10:00', '19:00', 30);
  assert.equal(slots[0], '10:00');
  assert.equal(slots.at(-1), '18:30');
  assert.equal(slots.length, 18);
});

test('時間計算と重なり判定', () => {
  assert.equal(endTime('10:00', 150), '12:30');
  assert.equal(overlaps('10:00', '11:00', '10:30', '11:30'), true);
  assert.equal(overlaps('10:00', '11:00', '11:00', '12:00'), false); // 連続は OK
});

test('電話番号: 全角・ハイフンを正規化', () => {
  assert.equal(normalizePhone('０９０－１２３４－５６７８'), '09012345678');
  assert.equal(isValidPhone('03-1234-5678'), true);
  assert.equal(isValidPhone('12345'), false);
});

test('入力チェック: 正常な予約はエラーなし', () => {
  assert.deepEqual(validateReservation(input(), ctx(base())), []);
});

test('入力チェック: 必須項目・過去日・定休日', () => {
  const data = base();
  assert.ok(validateReservation(input({ customerName: ' ' }), ctx(data)).some((e) => e.includes('お客様名')));
  assert.ok(validateReservation(input({ date: '2026-10-01' }), ctx(data)).some((e) => e.includes('過去')));
  assert.ok(validateReservation(input({ date: '2026-10-13' }), ctx(data)).some((e) => e.includes('定休日')));
  // 過去日でも「来店済」への更新は可能
  assert.equal(validateReservation(input({ date: '2026-10-01', status: 'visited' }), ctx(data))
    .some((e) => e.includes('過去')), false);
});

test('入力チェック: 営業時間を超える施術は不可', () => {
  const errs = validateReservation(input({ start: '17:30', menuId: 'm3' }), ctx(base())); // 150分 → 20:00
  assert.ok(errs.some((e) => e.includes('営業時間')));
});

test('入力チェック: 同じ担当者の重複予約は不可、別担当・キャンセル済は可', () => {
  const data = base();
  const existing = buildReservation(input({ id: 'x1', start: '10:00' }), data.menus); // 10:00-11:00 s1
  data.reservations = [existing];
  assert.ok(validateReservation(input({ start: '10:30' }), ctx(data)).some((e) => e.includes('重なって')));
  assert.deepEqual(validateReservation(input({ start: '10:30', staffId: 's2' }), ctx(data)), []);
  assert.deepEqual(validateReservation(input({ start: '11:00' }), ctx(data)), []);
  data.reservations = [{ ...existing, status: 'cancelled' }];
  assert.deepEqual(validateReservation(input({ start: '10:30' }), ctx(data)), []);
  // 自分自身の編集では重複扱いしない
  data.reservations = [existing];
  assert.deepEqual(validateReservation({ ...existing, phone: '09000000000' }, ctx(data)), []);
});

test('CSV: ヘッダー・並び順・エスケープ', () => {
  const data = base();
  const r1 = buildReservation(input({ id: 'a', date: '2026-10-09', memo: '駐車場, 利用' }), data.menus);
  const r2 = buildReservation(input({ id: 'b', date: '2026-10-08', customerName: '"引用" 様' }), data.menus);
  const lines = toCSV([r1, r2], data.staff).split('\r\n');
  assert.equal(lines[0], '予約日,開始,終了,お客様名,電話番号,メニュー,担当,料金,状態,メモ');
  assert.ok(lines[1].startsWith('2026-10-08')); // 日付順
  assert.ok(lines[1].includes('"""引用"" 様"'));
  assert.ok(lines[2].endsWith('"駐車場, 利用"'));
});

test('集計: キャンセルは件数・売上に含めない', () => {
  const data = base();
  const week = weekDays(TODAY);
  const all = summarize(data.reservations, TODAY, week);
  assert.equal(all.weekCount, 5);
  assert.equal(all.weekSales, 4400 + 11000 + 7700 + 3300 + 4400);
  data.reservations[0].status = 'cancelled';
  assert.equal(summarize(data.reservations, TODAY, week).weekCount, 4);
});

test('メニュー削除可否: 今後の有効な予約で使用中なら不可', () => {
  const data = base();
  assert.equal(isMenuInUse('m4', data.reservations, TODAY), true);
  assert.equal(isMenuInUse('m9', data.reservations, TODAY), false);
});

test('サンプルデータ: 定休日・重複・営業時間の違反がない', () => {
  const data = base();
  for (const r of data.reservations) {
    const others = { ...data, reservations: data.reservations };
    const errs = validateReservation(r, { ...others, today: '2000-01-01' });
    assert.deepEqual(errs, [], `${r.customerName}: ${errs.join(' / ')}`);
  }
});
