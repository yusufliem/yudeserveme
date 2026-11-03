// ===== app.js =====
const API = 'https://script.google.com/macros/s/AKfycbxVrmuVxaJXoD6E5rwx4mrVthfFykpXBrkVvDCOfKYXZ8GfTtHhFlqDWFwcOwsZ3-4rYQ/exec'; // tempel URL /exec dari Apps Script
const CATS = {
  out: ['KPR', 'Babeh', 'Flazz','IPL','PAM','Wifi','Listrik','Netflix','Sayur','Pampers','Sembako','Online Shop','Bensin','Parkir','Paylater','Alfa','Jajan', 'Motor','Dadakan','Mall','Pendidikan', 'Lainnya'],
  in: ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Lainnya']
};
const $ = s => document.querySelector(s);
const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const iso = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = () => iso(new Date());
const cStart = () => { const n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth() - (n.getDate() >= 24 ? 0 : 1), 24)); };
const mAgo = () => { const d = new Date(), l = new Date(d.getFullYear(), d.getMonth(), 0).getDate(); return iso(new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), l))); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtD = d => new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
let S = { data: [], tab: 'home', per: 'day', from: '', to: '', q: '', cat: '', pin: localStorage.pin || '', type: 'out', fcat: '', edit: null, loaded: false };
try { S.data = JSON.parse(localStorage.cache || '[]'); S.loaded = S.data.length > 0; } catch (e) {}

async function api(action, p = {}) {
  const r = await fetch(API, { method: 'POST', body: JSON.stringify({ pin: S.pin, action, ...p }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j;
}
let tt;
function toast(m, err) {
  const t = $('#toast'); t.textContent = m; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(tt); tt = setTimeout(() => t.className = '', 2600);
}

// ---------- data & periode ----------
function range() {
  const n = new Date(), t = today(); let a, b = t;
  if (S.per === 'day') a = t;
  else if (S.per === 'week') { const d = new Date(n); d.setDate(n.getDate() - 6); a = iso(d); } // 7 hari terakhir
  else if (S.per === 'month') a = cStart();
  else if (S.per === 'last') { a = iso(new Date(n.getFullYear(), n.getMonth() - 2, 24)); b = iso(new Date(n.getFullYear(), n.getMonth() - 1, 25)); } // 24 dua bulan lalu s/d 25 bulan lalu
  else { a = S.from || mAgo(); b = S.to || t; if (a > b) [a, b] = [b, a]; }
  const len = Math.round((new Date(b) - new Date(a)) / 864e5) + 1;
  const pb = new Date(new Date(a) - 864e5), pa = new Date(pb - (len - 1) * 864e5);
  return { a, b, len, pa: iso(pa), pb: iso(pb) };
}
const inR = (r, a, b) => r.date >= a && r.date <= b;
const tot = (a, b, t) => S.data.filter(r => r.type === t && inR(r, a, b)).reduce((s, r) => s + r.amt, 0);

async function load() {
  try {
    const j = await api('list'); S.data = j.data; S.loaded = true; S.err = false;
    localStorage.cache = JSON.stringify(j.data);
  } catch (e) {
    if (e.message === 'PIN salah') { localStorage.removeItem('pin'); S.pin = ''; return askPin('PIN salah, coba lagi'); }
    toast('Gagal memuat data. Periksa koneksi.', 1); S.loaded = true; S.err = true;
  }
  render();
}

// ---------- tampilan ----------
const chips = () => `<div class="chips">${[['day', 'Hari ini'], ['week', 'Minggu ini'], ['month', 'Bulan ini'], ['last', 'Bulan lalu'], ['custom', 'Kustom']]
  .map(([k, l]) => `<button class="chip ${S.per === k ? 'on' : ''}" data-per="${k}">${l}</button>`).join('')}</div>` +
  (S.per === 'custom' ? `<div class="row"><input type="date" id="from" value="${S.from || mAgo()}"><input type="date" id="to" value="${S.to || today()}"></div>` : '');
const txRow = r => `<button class="tx" data-id="${r.id}" data-ty="${r.type}"><i class="dot ${r.type}"></i><span><b>${esc(r.cat)}</b><small>${fmtD(r.date)}${r.note ? ' - ' + esc(r.note) : ''}</small></span><em class="${r.type}">${r.type === 'in' ? '+' : '-'}${rp(r.amt)}</em></button>`;
const empty = (m) => `<div class="empty"><i>🗂️</i>${m}<br>Ketuk "+ Tambah Transaksi" untuk mulai.</div>`;
const sorted = a => [...a].sort((x, y) => y.date.localeCompare(x.date));

function render() {
  const R = range(), inc = tot(R.a, R.b, 'in'), exp = tot(R.a, R.b, 'out');
  const v = $('#view');
  if (!S.loaded && S.pin) v.innerHTML = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  else if (S.tab === 'home') {
    const nw = new Date(), sd = iso(new Date(nw.getFullYear(), nw.getMonth() - (nw.getDate() >= 24 ? 0 : 1), 24));
    const recent = S.per === 'day' ? sorted(S.data.filter(r => inR(r, R.a, R.b))) : S.per === 'month' ? sorted(S.data.filter(r => r.date >= sd && r.date <= R.b)) : sorted(S.data.filter(r => inR(r, R.a, R.b))).slice(0, 6);
    const fs = d => new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const box = (l, n) => `<div class="glass"><small>${l}</small><b>${rp(n)}</b></div>`;
    const all = S.data.reduce((s, r) => s + (r.type === 'in' ? r.amt : -r.amt), 0);
    const rg = `${fs(R.a)} - ${fs(R.b)}`;
    let label, big = null, boxes;
    if (S.per === 'day') { label = 'Saldo bersih (total sejak awal)'; big = all; boxes = [box('Pemasukan hari ini', inc), box('Pengeluaran hari ini', exp)]; }
    else if (S.per === 'week') { label = 'Pengeluaran 7 hari terakhir'; big = exp; boxes = []; }
    else { label = (S.per === 'month' ? 'Bulan ini' : S.per === 'last' ? 'Bulan lalu' : 'Periode kustom') + (S.per === 'month' ? ` (${new Date(R.a + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} - hari ini)` : ` (${rg})`); boxes = [box('Pemasukan', inc), box('Pengeluaran', exp)]; }
    v.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:6px 0 14px"><h1 style="margin:0">Kas Mama Joel Jess</h1><img src="celengan.gif" alt="" width="46" height="52" style="flex:none;object-fit:contain;margin:-8px 0"></div>${chips()}
      <div class="hero"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><small style="flex:1;min-width:0">${label}</small>${S.per === 'day' ? '' : `<div style="text-align:right;flex:none"><small>Saldo bersih</small><b style="display:block;font-size:16px">${rp(all)}</b></div>`}</div>${big !== null ? `<div class="big">${rp(big)}</div>` : ''}
      ${boxes.length ? `<div class="two" style="margin-top:${big !== null ? 16 : 12}px;grid-template-columns:repeat(${boxes.length},1fr)">${boxes.join('')}</div>` : ''}</div>
      ${`<h2>${S.per === 'month' ? 'Transaksi sejak ' + fs(sd) : S.per === 'day' ? 'Transaksi hari ini' : 'Transaksi terbaru'}</h2>${recent.length ? recent.map(txRow).join('') : empty(S.per === 'day' ? 'Belum ada transaksi hari ini.' : 'Belum ada transaksi di periode ini.')}`}`;
  } else if (S.tab === 'chart') {
    const ex = S.data.filter(r => r.type === 'out' && inR(r, R.a, R.b)), by = {};
    ex.forEach(r => by[r.cat] = (by[r.cat] || 0) + r.amt);
    const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0], prev = tot(R.pa, R.pb, 'out');
    const diff = prev ? Math.round((exp - prev) / prev * 100) : null;
    v.innerHTML = `<h1>Grafik</h1>${chips()}` + (S.data.some(r => inR(r, R.a, R.b)) ? `
      <div class="ins">
        <div><small>Kategori pengeluaran terbesar</small><b>${top ? esc(top[0]) + ' - ' + rp(top[1]) : '-'}</b></div>
        <div><small>Rata-rata pengeluaran harian</small><b>${rp(exp / R.len)}</b></div>
        <div><small>Dibanding periode sebelumnya (${rp(prev)})</small><b>${diff === null ? 'Belum ada pembanding' : (diff > 0 ? 'Naik ' : 'Turun ') + Math.abs(diff) + '%'}</b></div>
      </div>
      <h2>Pengeluaran per kategori</h2><div class="card"><canvas id="c1"></canvas></div>
      <h2>Pemasukan vs pengeluaran</h2><div class="card"><canvas id="c2"></canvas></div>` : empty('Belum ada data untuk digrafikkan.'));
    drawCharts(R, by);
  } else {
    const cats = [...new Set(S.data.map(r => r.cat))].sort();
    const q = S.q.toLowerCase();
    const list = sorted(S.data.filter(r => (!S.cat || r.cat === S.cat) && (!q || (r.cat + ' ' + (r.note || '') + ' ' + r.date).toLowerCase().includes(q))));
    v.innerHTML = `<h1>Riwayat</h1>
      <input id="q" placeholder="Cari catatan, kategori, tanggal" value="${esc(S.q)}" style="margin-bottom:8px">
      <select id="fc" style="margin-bottom:10px"><option value="">Semua kategori</option>${cats.map(c => `<option ${S.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <div id="list">${list.length ? list.slice(0, 200).map(txRow).join('') : empty('Tidak ada transaksi yang cocok.')}</div>`;
  }
  if (S.err && S.pin) v.insertAdjacentHTML('afterbegin', '<div class="card" style="background:#fff1f3;color:#e0455f"><b>Data belum bisa dimuat.</b><br><small>Periksa internet dan URL di app.js, lalu coba lagi.</small><button id="retry" class="chip on" style="margin-top:10px">Coba lagi</button></div>');
  document.querySelectorAll('nav [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === S.tab));
}

let ch = [];
function drawCharts(R, by) {
  ch.forEach(c => c.destroy()); ch = [];
  if (!$('#c1') || !window.Chart) return;
  const pal = ['#12b5c0', '#6a5cff', '#e0455f', '#f5a524', '#0e9f8c', '#8b5cf6', '#38bdf8', '#94a3b8'];
  const ks = Object.keys(by);
  ch.push(new Chart($('#c1'), { type: 'doughnut', data: { labels: ks, datasets: [{ data: ks.map(k => by[k]), backgroundColor: pal, borderWidth: 0 }] },
    options: { cutout: '62%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ' ' + rp(c.raw) } } } } }));
  const key = d => R.len > 35 ? d.slice(0, 7) : d, m = {};
  S.data.filter(r => inR(r, R.a, R.b)).forEach(r => { const k = key(r.date); (m[k] = m[k] || { in: 0, out: 0 })[r.type] += r.amt; });
  const lb = Object.keys(m).sort();
  ch.push(new Chart($('#c2'), { type: 'bar', data: { labels: lb.map(l => l.length > 7 ? l.slice(8) + '/' + l.slice(5, 7) : l), datasets: [
    { label: 'Pemasukan', data: lb.map(l => m[l].in), backgroundColor: '#12b5c0', borderRadius: 6 },
    { label: 'Pengeluaran', data: lb.map(l => m[l].out), backgroundColor: '#6a5cff', borderRadius: 6 }] },
    options: { plugins: { tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + rp(c.raw) } } }, scales: { y: { ticks: { callback: v => v >= 1e6 ? v / 1e6 + 'jt' : v >= 1e3 ? v / 1e3 + 'rb' : v } } } } }));
}

// ---------- form tambah/edit ----------
const catChips = () => `<div class="cats">${CATS[S.type].map(c => `<button class="chip ${S.fcat === c ? 'on' : ''}" data-fc="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
function openSheet(edit) {
  S.edit = edit || null; S.type = edit ? edit.type : 'out'; S.fcat = edit ? edit.cat : '';
  if (edit && !CATS[S.type].includes(edit.cat)) CATS[S.type].push(edit.cat);
  const s = $('#sheet'); s.hidden = false;
  s.innerHTML = `<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b style="font-size:18px">${edit ? 'Edit transaksi' : 'Tambah transaksi'}</b><button id="close" aria-label="Tutup" style="width:42px;height:42px;border-radius:50%;background:#f5f7fc;font-size:18px;color:#7a8199">✕</button></div><div class="seg"><button data-ty="out" class="${S.type === 'out' ? 'on' : ''}">Pengeluaran</button><button data-ty="in" class="${S.type === 'in' ? 'on' : ''}">Pemasukan</button></div>
    <label>Nominal (Rp)</label><input id="amt" inputmode="numeric" placeholder="0" value="${edit ? edit.amt.toLocaleString('id-ID') : ''}" autocomplete="off">
    <label>Kategori</label><div id="cc">${catChips()}</div>
    <label>Tanggal</label><input type="date" id="dt" value="${edit ? edit.date : today()}" style="margin-bottom:12px">
    <label>Catatan (opsional)</label><input id="note" value="${esc(edit ? edit.note : '')}" style="margin-bottom:10px">
    <button class="go" id="save">${edit ? 'Simpan perubahan' : 'Simpan transaksi'}</button>
    ${edit ? '<button class="del" id="del">Hapus transaksi</button>' : ''}</div>`;
  setTimeout(() => !edit && $('#amt').focus(), 300);
}
const closeSheet = () => $('#sheet').hidden = true;
async function save() {
  const amt = parseInt($('#amt').value.replace(/\D/g, ''), 10), date = $('#dt').value;
  if (!amt || amt <= 0) return toast('Nominal harus lebih dari 0', 1);
  if (!S.fcat) return toast('Pilih kategori dulu', 1);
  if (!date) return toast('Tanggal wajib diisi', 1);
  const b = $('#save'); b.disabled = true; b.textContent = 'Menyimpan...';
  try {
    await api(S.edit ? 'update' : 'add', { id: S.edit?.id, from: S.edit?.type, type: S.type, date, cat: S.fcat, amt, note: $('#note').value.trim() });
    closeSheet(); toast(S.edit ? 'Perubahan tersimpan' : 'Transaksi tersimpan'); load();
  } catch (e) { b.disabled = false; b.textContent = 'Coba simpan lagi'; toast('Gagal menyimpan: ' + e.message, 1); }
}
async function del() {
  if (!confirm('Hapus transaksi ini? Baris di spreadsheet juga akan terhapus.')) return;
  try { await api('delete', { id: S.edit.id, type: S.edit.type }); closeSheet(); toast('Transaksi dihapus'); load(); }
  catch (e) { toast('Gagal menghapus: ' + e.message, 1); }
}

// ---------- PIN ----------
function askPin(msg) {
  const s = $('#sheet'); s.hidden = false;
  s.innerHTML = `<div class="panel"><h1>Masuk</h1><label>${msg || 'Masukkan kode rahasia'}</label><input id="pin" type="password" autocomplete="off" style="margin-bottom:12px"><button class="go" id="okpin">Masuk</button></div>`;
}

// ---------- event ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'retry') { S.err = false; S.loaded = false; render(); load(); }
  else if (t.id === 'fab') openSheet();
  else if (t.id === 'close') closeSheet();
  else if (t.dataset.t) { S.tab = t.dataset.t; render(); scrollTo(0, 0); }
  else if (t.dataset.per) { S.per = t.dataset.per; render(); }
  else if (t.classList.contains('tx')) { const r = S.data.find(x => x.id === t.dataset.id && x.type === t.dataset.ty); if (r) openSheet(r); }
  else if (t.dataset.ty && t.closest('.seg')) { S.type = t.dataset.ty; S.fcat = ''; document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b === t)); $('#cc').innerHTML = catChips(); }
  else if (t.dataset.fc) { S.fcat = t.dataset.fc; $('#cc').innerHTML = catChips(); }
  else if (t.id === 'save') save();
  else if (t.id === 'del') del();
  else if (t.id === 'okpin') { const v = $('#pin').value.trim(); if (v) { S.pin = v; localStorage.pin = v; closeSheet(); S.loaded = false; render(); load(); } }
});
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet' && S.pin) closeSheet(); });
document.addEventListener('input', e => {
  if (e.target.id === 'amt') { const n = e.target.value.replace(/\D/g, ''); e.target.value = n ? (+n).toLocaleString('id-ID') : ''; }
  else if (e.target.id === 'q') { S.q = e.target.value; const l = sorted(S.data.filter(r => !S.cat || r.cat === S.cat)).filter(r => (r.cat + ' ' + (r.note || '') + ' ' + r.date).toLowerCase().includes(S.q.toLowerCase())); $('#list').innerHTML = l.length ? l.slice(0, 200).map(txRow).join('') : empty('Tidak ada transaksi yang cocok.'); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'fc') { S.cat = e.target.value; render(); }
  else if (e.target.id === 'from' || e.target.id === 'to') { S.from = $('#from').value; S.to = $('#to').value; render(); }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
render();
S.pin ? load() : askPin();
