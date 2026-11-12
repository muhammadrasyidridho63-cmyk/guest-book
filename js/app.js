(function () {
'use strict';
const GAS = window.APP_CONFIG.GAS_URL, $ = (s, e) => (e || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const J = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const IC = { gav: 'M12 3v3M6 8h12M7 8l-3 7h6zM17 8l-3 7h6zM4 15a3 2 0 0 0 6 0M14 15a3 2 0 0 0 6 0M8 21h8', desk: 'M3 7h18v10H3zM8 21h8M12 17v4', home: 'M3 11l9-8 9 8M5 10v10h14V10', mon: 'M3 4h18v12H3zM8 20h8M12 16v4', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z', usr: 'M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', out: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9', print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z', dl: 'M12 3v12M7 10l5 5 5-5M5 21h14' };
const ico = n => '<svg viewBox="0 0 24 24"><path d="' + IC[n] + '"/></svg>';
let S = J('sess'), CFG = J('cfg'), timer = null;

// ---------- util UI ----------
function toast(m, e) { const t = $('#toast'); t.textContent = m; t.className = 'on' + (e ? ' e' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = '', 3200); }
function today() { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
const sk = n => Array(n || 3).fill('<div class="sk"></div>').join('');
function logoImg(c) { return c && c.logo ? '<img class="logo" src="' + esc(c.logo) + '" alt="Logo" onerror="this.outerHTML=\'<span class=logo>' + '&#9878;' + '</span>\'">' : '<span class="logo">' + ico('gav') + '</span>'; }

// ---------- API: dedupe baca, SWR, POST text/plain ----------
const inflight = {};
async function api(action, data, opt) {
  if (!GAS || /GANTI|XXXX/.test(GAS)) throw new Error('Konfigurasi belum lengkap: isi GAS_URL di js/config.js');
  const k = action + JSON.stringify(data || {});
  if (opt && opt.read && inflight[k]) return inflight[k];
  const p = fetch(GAS, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: S && S.token, data: data || {} }) })
    .then(r => r.json()).then(j => { if (j.code === 'AUTH') { logout(true); } if (!j.success) throw new Error(j.message || 'Gagal'); return j; });
  if (opt && opt.read) { inflight[k] = p; p.then(() => delete inflight[k], () => delete inflight[k]); }
  return p;
}
// tampilkan cache lokal seketika, lalu segarkan di latar belakang (hanya render ulang bila data berubah)
function swr(key, action, data, render) {
  const ck = 'c_' + key, c = J(ck); let last = c ? JSON.stringify(c) : null;
  if (c) render(c);
  return api(action, data, { read: true }).then(j => { const s = JSON.stringify(j.data); if (s !== last) { try { localStorage.setItem(ck, s); } catch (e) {} render(j.data); } }).catch(e => { if (!c) { render(null, e.message); } });
}
function loadCfg() { return swr('cfg', 'cfg', {}, d => { if (!d) return; const ch = JSON.stringify(d) !== JSON.stringify(CFG); CFG = d; localStorage.setItem('cfg', JSON.stringify(d)); if (!ch) return; const l = $('#brandName'); if (l) l.textContent = d.nama; const r = (location.hash || '#/kiosk').slice(2).split('/')[0] || 'kiosk'; if (r === 'kiosk' && $('#main')) { shell('kiosk'); V.kiosk($('#main')); } const sl = $('#loket'); if (sl && !sl.options.length) sl.innerHTML = (d.lokets || []).map(l => '<option>' + esc(l.nama) + '</option>').join(''); }); }
function logout(soft) { S = null; localStorage.removeItem('sess'); if (soft) toast('Sesi berakhir, silakan masuk kembali.', 1); location.hash = '#/login'; }

// ---------- shell ----------
const MENU = [['kiosk', 'Kiosk Mandiri', 'home', ['*']], ['antrean', 'Antrean Loket', 'list', ['admin', 'satpam', 'ptsp']], ['pantau', 'Layar Pantau', 'mon', ['*']], ['hadir', 'Kehadiran Sidang', 'gav', ['admin', 'pp']], ['dash', 'Dashboard & Laporan', 'chart', ['admin', 'pimpinan']], ['set', 'Pengaturan', 'cog', ['admin']]];
function menuFor() { return MENU.filter(m => m[3][0] === '*' || (S && m[3].indexOf(S.me.role) > -1)); }
function shell(route) {
  const items = menuFor(), staff = !!S, c = CFG || {};
  const links = items.map(m => '<a href="#/' + m[0] + '" class="' + (m[0] === route ? 'on' : '') + '">' + ico(m[2]) + (staff ? '<span>' + m[1] + '</span>' : m[1]) + '</a>').join('');
  $('#app').innerHTML = '<header class="top">' + logoImg(c) + '<div class="brand"><div><span id="brandName">' + esc(c.nama || 'SI-BUKU TAMU') + '</span><small>BUKU TAMU DIGITAL TERPADU</small></div></div>' +
    '<nav class="nav">' + (staff ? '<span class="pill">' + esc(S.me.nama) + ' · ' + esc(S.me.role) + '</span><a href="#/logout">Keluar</a>' : '<a href="#/kiosk" class="' + (route === 'kiosk' ? 'on' : '') + '">Kiosk</a><a href="#/pantau" class="' + (route === 'pantau' ? 'on' : '') + '">Layar Pantau</a><a href="#/login" class="' + (route === 'login' ? 'on' : '') + '">Masuk Petugas</a>') + '</nav></header>' +
    '<div class="shell"><aside class="side ' + (staff ? 'has' : '') + '">' + (staff ? links : '') + '</aside><main class="main" id="main"></main></div>';
}
// ---------- router ----------
const V = {};
function route() {
  clearInterval(timer); timer = null;
  const h = (location.hash || '#/kiosk').slice(2).split('/'), r = h[0] || 'kiosk';
  if (r === 'logout') return logout();
  const m = MENU.filter(x => x[0] === r)[0], pub = ['kiosk', 'form', 'pantau', 'login'].indexOf(r) > -1;
  if (!pub && !S) { location.hash = '#/login'; return; }
  if (m && m[3][0] !== '*' && S && m[3].indexOf(S.me.role) < 0) { toast('Akses ditolak untuk peran Anda.', 1); location.hash = '#/kiosk'; return; }
  shell(r); (V[r] || V.kiosk)($('#main'), h[1]); window.scrollTo(0, 0);
}
function poll(fn, activeMs, idleMs) { let at = Date.now(); ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, () => at = Date.now(), { passive: true })); let busy = false;
  timer = setInterval(async () => { if (document.visibilityState !== 'visible' || busy) return; busy = true; try { await fn(); } catch (e) {} busy = false; }, activeMs); }

// ---------- views ----------
V.kiosk = function (el) {
  clearInterval(timer); const c = CFG || {};
  el.innerHTML = '<div class="hero"><div class="lg">' + (c.logo ? '<img src="' + esc(c.logo) + '" alt="" style="max-width:100%;max-height:100%">' : ico('gav')) + '</div><h1>' + esc(c.nama || 'Pengadilan') + '</h1><p class="mut" style="max-width:640px;margin:8px auto">' + esc(c.sambutan || '') + '</p><span class="pill"><span class="dot"></span><b id="clk"></b></span></div>' +
    '<div class="grid g2"><a class="card gold choice" href="#/form/ptsp"><div class="ico">' + ico('desk') + '</div><h2>Pelayanan PTSP</h2><p class="mut">Informasi, pendaftaran perkara, e-Court, legalisasi, dan layanan administrasi lainnya.</p><span class="btn p w" style="margin-top:auto">Mulai Pendaftaran PTSP</span></a>' +
    '<a class="card gold choice" href="#/form/sidang"><div class="ico g">' + ico('gav') + '</div><h2>Persidangan</h2><p class="mut">Penggugat, Tergugat, Kuasa Hukum, Saksi, Ahli, dan pengunjung sidang.</p><span class="btn g w" style="margin-top:auto">Registrasi Sidang Perkara</span></a></div>' +
    '<div class="card" style="margin-top:16px"><b>Jam Operasional</b><div class="mut">' + esc(c.jam || '-') + '</div></div>';
  const t = () => { const e = $('#clk'); if (e) e.textContent = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' }).replace(/\./g, ':') + ' WIB'; }; t(); timer = setInterval(t, 1000);
};
V.form = function (el, jalur) {
  jalur = jalur === 'sidang' ? 'sidang' : 'ptsp'; const c = CFG || { lokets: [] }, P = jalur === 'ptsp';
  const f = P ? '<label>Kategori / Asal Instansi *</label><select id="kategori"><option>Pribadi / Masyarakat Umum</option><option>Kuasa Hukum / Advokat</option><option>Instansi Pemerintah / BUMN</option><option>Badan Hukum / Korporasi</option></select><label>Nama Instansi (jika ada)</label><input id="instansi" maxlength="100"><label>Loket Layanan *</label><select id="loket">' + (c.lokets || []).map(l => '<option>' + esc(l.nama) + '</option>').join('') + '</select><label>Keperluan Singkat</label><textarea id="keperluan" maxlength="250"></textarea>'
    : '<label>Peran *</label><select id="peran"><option>Penggugat</option><option>Tergugat</option><option>Turut Tergugat / Intervensi</option><option>Kuasa Hukum / Advokat</option><option>Saksi</option><option>Ahli</option><option>Pengunjung</option></select><label>Nomor Perkara *</label><input id="noPerkara" placeholder="contoh: 45/Pdt.G/2026/PN.XXX" required>';
  el.innerHTML = '<div class="grid g2" style="align-items:start"><div class="card"><div class="tabs"><a href="#/form/ptsp" class="' + (P ? 'on' : '') + '">Form PTSP</a><a href="#/form/sidang" class="' + (!P ? 'on' : '') + '">Form Persidangan</a></div><h2>Registrasi Buku Tamu</h2><form id="fm" novalidate><label>Nama Lengkap *</label><input id="nama" maxlength="100" autocomplete="name" required><label>Nomor WhatsApp Aktif *</label><input id="hp" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" required>' + f + '<input class="hp" id="website" tabindex="-1" autocomplete="off"><div class="err" id="er"></div><button class="btn p w" id="go" style="margin-top:16px;height:48px">Kirim & Buat Tiket</button></form></div>' +
    '<div class="card gold tiket" id="cetak"><div class="mut" id="tk">Tiket Anda akan tampil di sini setelah pendaftaran.</div></div></div>';
  $('#fm').onsubmit = async e => {
    e.preventDefault(); const b = $('#go'), g = i => ($('#' + i) || {}).value || '', er = $('#er'); er.textContent = '';
    if (g('nama').trim().length < 3 || !/^(\+?62|0)8\d{7,12}$/.test(g('hp').replace(/[\s-]/g, ''))) { er.textContent = 'Lengkapi nama dan nomor WhatsApp yang valid.'; return; }
    b.disabled = true; b.textContent = 'Memproses...';
    try {
      const d = { jalur: P ? 'PTSP' : 'Persidangan', nama: g('nama'), hp: g('hp'), kategori: g('kategori'), instansi: g('instansi'), loket: g('loket'), keperluan: g('keperluan'), peran: g('peran'), noPerkara: g('noPerkara'), website: g('website') };
      const j = (await api('daftar', d)).data; ticket(j); toast('Tiket berhasil dibuat.'); $('#fm').reset();
    } catch (x) { er.textContent = x.message; }
    b.disabled = false; b.textContent = 'Kirim & Buat Tiket';
  };
};
function ticket(t) {
  const c = CFG || {};
  $('#cetak').innerHTML = '<h3>' + esc(c.nama || '') + '</h3><div class="mut">TIKET ANTREAN RESMI</div><div style="margin:14px 0"><div class="mut">NOMOR ANTREAN ANDA</div><div class="no">' + esc(t.nomor) + '</div><span class="badge">' + esc(t.jalur === 'PTSP' ? t.loket : t.ruang || 'Persidangan') + '</span></div>' +
    '<dl><dt>Nama</dt><dd>' + esc(t.nama) + '</dd><dt>Tanggal</dt><dd>' + esc(t.tanggal) + '</dd><dt>Waktu</dt><dd>' + esc(t.waktu) + '</dd>' + (t.noPerkara ? '<dt>No. Perkara</dt><dd>' + esc(t.noPerkara) + '</dd>' : '') + '</dl>' +
    '<div class="mut" style="font-size:12px">Simpan tiket ini hingga urusan selesai.</div><button class="btn g w" style="margin-top:12px" onclick="window.print()">' + ico('print') + ' Cetak Tiket</button>';
}
V.pantau = function (el) {
  el.innerHTML = '<div class="row" style="justify-content:space-between"><h1>Layar Pantau Antrean</h1><span class="pill"><span class="dot"></span>Pembaruan otomatis · <b id="wk">--:--:--</b></span></div><div class="grid g2" style="margin-top:16px"><div class="card gold"><h2>Jalur PTSP</h2><div id="p1">' + sk() + '</div></div><div class="card gold"><h2>Jalur Persidangan</h2><div id="p2">' + sk() + '</div></div></div>';
  const draw = d => {
    if (!d) return; $('#wk').textContent = d.waktu;
    $('#p1').innerHTML = d.ptsp.length ? '<div class="tw"><table><tr><th>No.</th><th>Nama</th><th>Loket</th><th>Status</th></tr>' + d.ptsp.map(r => '<tr><td class="serif"><b>' + esc(r.nomor) + '</b></td><td>' + esc(r.nama) + '</td><td>' + esc(r.loket) + '</td><td><span class="badge b-' + esc(r.status) + '">' + esc(r.status) + '</span></td></tr>').join('') + '</table></div>' : '<div class="empty">Belum ada antrean aktif.</div>';
    $('#p2').innerHTML = d.sidang.length ? d.sidang.map(r => '<div class="card" style="margin:8px 0;padding:14px"><b>' + esc(r.ruang) + '</b> <span class="badge">' + esc(r.jam) + '</span><div class="serif" style="font-size:16px;margin:4px 0">' + esc(r.noPerkara) + '</div><div class="mut">' + esc(r.jenis) + ' · ' + esc(r.majelis) + '</div><span class="badge b-hadir">' + r.hadir + ' pihak hadir</span></div>').join('') : '<div class="empty">Tidak ada agenda sidang hari ini.</div>';
  };
  const run = () => swr('pantau', 'pantau', {}, draw); run(); poll(() => api('pantau', {}, { read: true }).then(j => draw(j.data)), 10000);
};
V.login = function (el) {
  el.innerHTML = '<div class="card" style="max-width:400px;margin:40px auto"><h2>Masuk Petugas</h2><form id="lf"><label>Nama pengguna</label><input id="u" autocomplete="username" required><label>Kata sandi</label><input id="pw" type="password" autocomplete="current-password" required><div class="err" id="er"></div><button class="btn p w" id="go" style="margin-top:16px">Masuk</button></form></div>';
  $('#lf').onsubmit = async e => { e.preventDefault(); const b = $('#go'); b.disabled = true; b.textContent = 'Memeriksa...';
    try { const j = (await api('login', { username: $('#u').value, password: $('#pw').value })).data; S = { token: j.token, me: j.me }; localStorage.setItem('sess', JSON.stringify(S)); location.hash = '#/' + menuFor().filter(m => m[0] !== 'kiosk' && m[0] !== 'pantau')[0][0]; }
    catch (x) { $('#er').textContent = x.message; b.disabled = false; b.textContent = 'Masuk'; } };
};
V.antrean = function (el) {
  el.innerHTML = '<h1>Antrean Loket</h1><div class="tw" style="margin-top:16px" id="tb">' + sk(4) + '</div>';
  const draw = d => { if (!d) return; $('#tb').innerHTML = d.length ? '<table><tr><th>No.</th><th>Waktu</th><th>Nama</th><th>Layanan</th><th>Status</th><th>Aksi</th></tr>' + d.map(r => '<tr><td><b>' + esc(r.NoAntrean) + '</b></td><td>' + esc(r.Jam) + '</td><td>' + esc(r.Nama) + '<div class="mut">' + esc(r.NoHP) + '</div></td><td>' + esc(r.Loket || r.Ruang) + '</td><td><span class="badge b-' + esc(r.Status) + '">' + esc(r.Status) + '</span></td><td>' + ['Dipanggil', 'Selesai', 'Batal'].map(s => '<button class="btn s" data-i="' + esc(r.ID) + '" data-s="' + s + '">' + s + '</button>').join(' ') + '</td></tr>').join('') + '</table>' : '<div class="empty">Belum ada tamu hari ini.</div>'; };
  $('#tb').onclick = async e => { const b = e.target.closest('button'); if (!b) return; b.disabled = true; try { await api('tamuStatus', { id: b.dataset.i, status: b.dataset.s }); toast('Status diperbarui.'); await load(); } catch (x) { toast(x.message, 1); b.disabled = false; } };
  const load = () => api('antreanStaf', {}).then(j => { draw(j.data); localStorage.setItem('c_ant', JSON.stringify(j.data)); }); draw(J('c_ant')); load().catch(x => toast(x.message, 1)); poll(load, 12000);
};
V.hadir = function (el) {
  el.innerHTML = '<div class="row"><h1>Kehadiran Sidang</h1><input type="date" id="dt" value="' + today() + '" style="max-width:180px"></div><div id="hl" style="margin-top:16px">' + sk(4) + '</div>';
  const draw = d => { if (!d) return; $('#hl').innerHTML = d.length ? d.map(a => '<div class="card gold" style="margin-bottom:16px"><b class="serif" style="font-size:18px">Perkara No. ' + esc(a.NoPerkara) + '</b> <span class="badge">' + esc(a.Jam) + '</span><div class="mut">' + esc(a.Jenis) + ' · ' + esc(a.Ruang) + ' · ' + esc(a.Majelis) + '</div><div class="tw" style="margin-top:12px"><table><tr><th>Pihak</th><th>Peran</th><th>Hadir</th><th>Waktu</th></tr>' + a.Pihak.map((p, i) => '<tr><td>' + esc(p.nama) + '</td><td>' + esc(p.peran) + '</td><td><input type="checkbox" style="width:22px;height:22px" data-n="' + esc(a.NoPerkara) + '" data-p="' + esc(p.nama) + '" data-r="' + esc(p.peran) + '" ' + (p.hadir ? 'checked' : '') + '></td><td>' + esc(p.waktu || '-') + '</td></tr>').join('') + '</table></div></div>').join('') : '<div class="empty">Belum ada agenda pada tanggal ini.</div>'; };
  const load = () => api('hadirList', { tanggal: $('#dt').value }).then(j => draw(j.data)).catch(x => toast(x.message, 1)); load();
  $('#dt').onchange = load;
  $('#hl').onchange = async e => { const c = e.target; if (c.type !== 'checkbox') return; try { await api('hadirSet', { tanggal: $('#dt').value, noPerkara: c.dataset.n, nama: c.dataset.p, peran: c.dataset.r, hadir: c.checked }); toast('Kehadiran diperbarui.'); } catch (x) { c.checked = !c.checked; toast(x.message, 1); } };
};
V.dash = function (el) {
  el.innerHTML = '<div class="row"><h1>Dashboard & Laporan</h1><input type="date" id="d1" value="' + today() + '"><input type="date" id="d2" value="' + today() + '"><button class="btn p" id="ex">' + ico('dl') + ' Ekspor CSV (Excel)</button></div><div id="db" style="margin-top:16px">' + sk(5) + '</div>'; let cur = null;
  const draw = d => { if (!d) return; cur = d; const mx = Math.max.apply(null, Object.values(d.jam).concat([1])), hs = Object.keys(d.jam).sort();
    $('#db').innerHTML = '<div class="grid g4"><div class="card stat"><span>Total Tamu</span><b>' + d.total + '</b></div><div class="card stat"><span>Kunjungan PTSP</span><b>' + d.ptsp + '</b></div><div class="card stat"><span>Persidangan</span><b>' + d.sidang + '</b></div></div>' +
      '<div class="card" style="margin:16px 0 28px"><h3>Volume Kunjungan per Jam</h3><div class="bars">' + (hs.length ? hs.map(h => '<i style="height:' + Math.max(3, d.jam[h] / mx * 100) + '%" data-h="' + h + '"></i>').join('') : '') + '</div></div>' +
      '<h3>Buku Register Tamu</h3><div class="tw" style="margin-top:8px"><table><tr><th>ID</th><th>Tanggal</th><th>Jam</th><th>Jalur</th><th>Nama</th><th>Keperluan / Perkara</th><th>Status</th></tr>' + d.rows.map(r => '<tr><td>' + esc(r.ID) + '</td><td>' + esc(r.Tanggal) + '</td><td>' + esc(r.Jam) + '</td><td><span class="badge">' + esc(r.Jalur) + '</span></td><td>' + esc(r.Nama) + '</td><td>' + esc(r.NoPerkara || r.Loket) + '</td><td><span class="badge b-' + esc(r.Status) + '">' + esc(r.Status) + '</span></td></tr>').join('') + '</table></div>'; };
  const load = fresh => api('dash', { dari: $('#d1').value, sampai: $('#d2').value, _fresh: fresh }).then(j => draw(j.data)).catch(x => toast(x.message, 1)); load(); $('#d1').onchange = $('#d2').onchange = () => load(true);
  $('#ex').onclick = () => { if (!cur) return; const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', k = ['ID', 'Tanggal', 'Jam', 'Jalur', 'NoAntrean', 'Nama', 'Instansi', 'Keperluan', 'Loket', 'NoPerkara', 'Ruang', 'Peran', 'Status'];
    const t = '\ufeff' + k.join(',') + '\n' + cur.rows.map(r => k.map(x => q(r[x])).join(',')).join('\n'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = 'buku-tamu-' + $('#d1').value + '.csv'; a.click(); };
};
V.set = function (el) {
  const c = CFG || { lokets: [], ruangs: [] };
  el.innerHTML = '<h1>Pengaturan Sistem</h1><div class="grid g2" style="margin-top:16px;align-items:start"><div class="card gold"><h3>Identitas Instansi</h3><label>Nama pengadilan</label><input id="sn" value="' + esc(c.nama) + '"><label>Alamat</label><input id="sa" value="' + esc(c.alamat) + '"><label>Kontak</label><input id="sk" value="' + esc(c.kontak) + '"><label>URL logo (gambar publik)</label><input id="sl" value="' + esc(c.logo) + '" placeholder="https://..."><label>Teks sambutan kiosk</label><textarea id="ss">' + esc(c.sambutan) + '</textarea><label>Jam operasional</label><input id="sj" value="' + esc(c.jam) + '"><label>Loket (satu per baris: KODE|Nama)</label><textarea id="sl2">' + esc((c.lokets || []).map(l => l.kode + '|' + l.nama).join('\n')) + '</textarea><label>Ruang sidang (satu per baris)</label><textarea id="sr">' + esc((c.ruangs || []).join('\n')) + '</textarea><button class="btn p w" id="sv" style="margin-top:16px">Simpan Pengaturan</button></div>' +
    '<div class="card gold"><h3>Tambah Agenda Sidang</h3><label>Tanggal</label><input type="date" id="at" value="' + today() + '"><div class="row"><div><label>Jam</label><input id="aj" placeholder="09.00"></div><div><label>Ruang</label><input id="ar"></div></div><label>Nomor perkara</label><input id="an"><label>Jenis perkara</label><input id="ae"><label>Majelis hakim</label><input id="am"><label>Pihak (satu per baris: Nama|Peran)</label><textarea id="ap"></textarea><button class="btn p w" id="sa2" style="margin-top:16px">Simpan Agenda</button></div></div>';
  $('#sv').onclick = async () => { const v = i => $('#' + i).value; try { const lk = v('sl2').split('\n').map(x => x.split('|')).filter(x => x[1]).map(x => ({ kode: x[0].trim().toUpperCase().slice(0, 2), nama: x[1].trim(), aktif: true }));
      const j = await api('cfgSave', { cfg: { nama: v('sn'), alamat: v('sa'), kontak: v('sk'), logo: v('sl'), sambutan: v('ss'), jam: v('sj'), lokets: lk, ruangs: v('sr').split('\n').map(x => x.trim()).filter(Boolean) } }); CFG = j.data; localStorage.setItem('cfg', JSON.stringify(CFG)); localStorage.removeItem('c_cfg'); toast('Pengaturan tersimpan.'); shell('set'); V.set($('#main')); } catch (x) { toast(x.message, 1); } };
  $('#sa2').onclick = async () => { const v = i => $('#' + i).value; try { await api('agendaSave', { agenda: { tanggal: v('at'), jam: v('aj'), ruang: v('ar'), noPerkara: v('an'), jenis: v('ae'), majelis: v('am'), pihak: v('ap').split('\n').map(x => x.split('|')).filter(x => x[0].trim()).map(x => ({ nama: x[0], peran: x[1] || '' })) } }); toast('Agenda tersimpan.'); ['aj', 'ar', 'an', 'ae', 'am', 'ap'].forEach(i => $('#' + i).value = ''); } catch (x) { toast(x.message, 1); } };
};
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
addEventListener('hashchange', route); route(); loadCfg();
})();
