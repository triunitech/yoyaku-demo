// データの保存先（デモのためブラウザの localStorage を使用）
// 本番導入時は、この関数群を API 呼び出しに置き換えるだけで UI はそのまま使える構成にしている。
import { addDays, startOfWeek, toDateKey } from './date.js';
import { buildReservation } from './booking.js';

export const STORAGE_KEY = 'triunitech-yoyaku-demo-v1';

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export { newId };

/** 初期データ（すべて架空のサンプルです） */
export function seedData(today = toDateKey(new Date())) {
  const menus = [
    { id: 'm1', name: 'カット', duration: 60, price: 4400 },
    { id: 'm2', name: 'カラー', duration: 90, price: 7700 },
    { id: 'm3', name: 'カット＋カラー', duration: 150, price: 11000 },
    { id: 'm4', name: 'ヘッドスパ', duration: 30, price: 3300 },
  ];
  const staff = [
    { id: 's1', name: '佐藤', color: '#1A7F4B' },
    { id: 's2', name: '鈴木', color: '#2563EB' },
  ];
  const settings = {
    shopName: 'サンプル美容室',
    open: '10:00',
    close: '19:00',
    step: 30,
    closedWeekdays: [2], // 火曜定休
  };

  // 今週の水・木・金・土にサンプル予約を配置
  const mon = startOfWeek(today);
  const samples = [
    { d: 2, start: '10:00', menuId: 'm1', staffId: 's1', customerName: '山田 花子', phone: '09012345678' },
    { d: 2, start: '13:00', menuId: 'm3', staffId: 's2', customerName: '田中 美咲', phone: '08011112222' },
    { d: 3, start: '11:00', menuId: 'm2', staffId: 's1', customerName: '高橋 健', phone: '07033334444' },
    { d: 4, start: '15:30', menuId: 'm4', staffId: 's2', customerName: '伊藤 さくら', phone: '09055556666', memo: '初回来店' },
    { d: 5, start: '10:30', menuId: 'm1', staffId: 's2', customerName: '渡辺 大輔', phone: '08077778888' },
  ];
  const reservations = samples.map((s) =>
    buildReservation(
      {
        id: newId(),
        date: addDays(mon, s.d),
        start: s.start,
        menuId: s.menuId,
        staffId: s.staffId,
        customerName: s.customerName,
        phone: s.phone,
        memo: s.memo ?? '',
        status: addDays(mon, s.d) < today ? 'visited' : 'booked',
      },
      menus
    )
  );

  return { version: 1, settings, menus, staff, reservations };
}

export function loadData() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === 1) return data;
    }
  } catch {
    // 破損データ・ストレージ無効時は初期データで起動
  }
  return seedData();
}

export function saveData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // プライベートモード等で保存できない場合は、画面上のデータのみ保持
  }
}

export function resetData() {
  const data = seedData();
  saveData(data);
  return data;
}
