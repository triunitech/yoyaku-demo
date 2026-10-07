'use client';

import { useEffect, useState } from 'react';
import { generateSlots, validateReservation, buildReservation, endTime, STATUS } from '@/lib/booking';
import { formatYen } from '@/lib/date';

export default function ReservationModal({ initial, data, today, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState([]);
  const isNew = !initial.id;
  const { menus, staff, settings, reservations } = data;
  const slots = generateSlots(settings.open, settings.close, settings.step);
  const menu = menus.find((m) => m.id === form.menuId);

  // Esc キーで閉じる
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = validateReservation(form, { reservations, menus, staff, settings, today });
    setErrors(errs);
    if (errs.length === 0) onSave(buildReservation(form, menus));
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} noValidate aria-label={isNew ? '新規予約' : '予約の編集'}>
        <h2>{isNew ? '新規予約' : '予約の編集'}</h2>

        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}

        <div className="grid2">
          <label>日付
            <input type="date" value={form.date} min={isNew ? today : undefined} onChange={set('date')} required />
          </label>
          <label>開始時刻
            <select value={form.start} onChange={set('start')}>
              {slots.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>メニュー
            <select value={form.menuId} onChange={set('menuId')}>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>{m.name}（{m.duration}分・{formatYen(m.price)}）</option>
              ))}
            </select>
          </label>
          <label>担当スタッフ
            <select value={form.staffId} onChange={set('staffId')}>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>お客様名
            <input value={form.customerName} onChange={set('customerName')} placeholder="例：山田 花子" />
          </label>
          <label>電話番号
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="例：090-1234-5678" />
          </label>
        </div>

        <label>メモ
          <textarea rows={2} value={form.memo} onChange={set('memo')} placeholder="ご要望など" />
        </label>

        {!isNew && (
          <label>状態
            <select value={form.status} onChange={set('status')}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        )}

        {menu && form.start && (
          <p className="hint">終了予定：{endTime(form.start, menu.duration)}　／　料金：{formatYen(menu.price)}（税込）</p>
        )}

        <div className="modal-actions">
          {!isNew && (
            <button
              type="button"
              className="danger"
              onClick={() => window.confirm('この予約を削除します。よろしいですか？（通常は「キャンセル」状態への変更をおすすめします）') && onDelete(form.id)}
            >
              削除
            </button>
          )}
          <span className="spacer" />
          <button type="button" onClick={onClose}>閉じる</button>
          <button type="submit" className="primary">保存</button>
        </div>
      </form>
    </div>
  );
}
