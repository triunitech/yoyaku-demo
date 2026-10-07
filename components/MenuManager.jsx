'use client';

import { useState } from 'react';
import { isMenuInUse } from '@/lib/booking';
import { formatYen } from '@/lib/date';
import { newId } from '@/lib/store';

const EMPTY = { id: null, name: '', duration: 60, price: 0 };

export default function MenuManager({ data, today, update }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const step = data.settings.step;

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const duration = Number(form.duration);
    const price = Number(form.price);
    if (!name) return setError('メニュー名を入力してください。');
    if (!Number.isInteger(duration) || duration <= 0 || duration % step !== 0) {
      return setError(`所要時間は ${step} 分単位で入力してください。`);
    }
    if (!Number.isInteger(price) || price < 0) return setError('料金は 0 以上の整数で入力してください。');

    const menu = { id: form.id ?? newId(), name, duration, price };
    update((d) => ({
      ...d,
      menus: form.id ? d.menus.map((m) => (m.id === form.id ? menu : m)) : [...d.menus, menu],
    }));
    setForm(EMPTY);
    setError('');
  };

  const remove = (m) => {
    if (isMenuInUse(m.id, data.reservations, today)) {
      setError(`「${m.name}」は今後の予約で使われているため削除できません。`);
      return;
    }
    if (window.confirm(`「${m.name}」を削除します。よろしいですか？`)) {
      update((d) => ({ ...d, menus: d.menus.filter((x) => x.id !== m.id) }));
      setError('');
    }
  };

  return (
    <div className="two-col">
      <div className="table-wrap">
        <table>
          <thead><tr><th>メニュー名</th><th className="num">所要時間</th><th className="num">料金（税込）</th><th /></tr></thead>
          <tbody>
            {data.menus.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td className="num">{m.duration}分</td>
                <td className="num">{formatYen(m.price)}</td>
                <td className="actions">
                  <button onClick={() => { setForm(m); setError(''); }}>編集</button>
                  <button className="danger" onClick={() => remove(m)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">※ メニューを変更しても、登録済みの予約の料金・メニュー名は予約時点のまま保持されます。</p>
      </div>

      <form className="card" onSubmit={submit} noValidate>
        <h3>{form.id ? 'メニューの編集' : 'メニューの追加'}</h3>
        {error && <p className="errors" role="alert">{error}</p>}
        <label>メニュー名
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label>所要時間（分）
          <input type="number" min={step} step={step} value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
        </label>
        <label>料金（円・税込）
          <input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
        </label>
        <div className="modal-actions">
          {form.id && <button type="button" onClick={() => { setForm(EMPTY); setError(''); }}>取消</button>}
          <span className="spacer" />
          <button type="submit" className="primary">{form.id ? '更新' : '追加'}</button>
        </div>
      </form>
    </div>
  );
}
