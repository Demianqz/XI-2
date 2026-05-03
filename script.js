// ==================== XIPHORIX - HYBRID CLOUD + LOCALSTORAGE ====================
// GANTI DENGAN URL DEPLOY APPS SCRIPT KAMU (YANG SUDAH FIX)
const scriptURL = "https://script.google.com/macros/s/AKfycbzmfwPA2fZ3u5Z8FVSzRHKO0S_CE0DsLSzwOSJA3UxtUdMotGjxTx1KyFektI8FoDFUgA/exec";

// ==================== DAFTAR SISWA ====================
const DAFTAR_SISWA = [
    "ACHMAD ANNAUFAEL NASRUL HUDA", "AHMAD BINTANG KURNIAWAN", "AHMAD SULTAN FEBRI SUDARSONO",
    "AKBAR GALIH PRAMUDYA", "ALFHANEO LINGGA SEIPUTRA", "ALMAS SHOFI MUGNI",
    "ANANDA AYU SOLEHA", "ANGGUN DESI PRIMA DEWI", "AULIA ARCHIE SAPUTRI",
    "AURA SALSABILA CHAIRUNNISA", "BARADHIPA", "CALYA FAWZA AQEELA",
    "CYRILLA ANGESTI DZAHBIYYAH", "DEMIAN QOMARUL ZAMAN", "DINDA PRATIWI",
    "FAHRINA NAYLA AMALIA", "GALUH WIDYA AGUSTA", "HADI PURWANTO",
    "HURUN MAKSUR0H", "KINGSTA FIRDAUSY FIXRIAST", "MANDA AYU KUSUMA RINI",
    "MOHAMMAD AGUS MAULANA", "MUH. ZAIDAN WAFA ILMANI", "MUHAMMAD RAIHAN ZAKY AL FARUQ",
    "MUHAMMAD TEGUH ALFA RIZT", "NAILA INDANA ZULFA", "NAYARA CHASEDDI YUNIAR RANDUWA",
    "NICO AVRILIAN YOCHANAN", "NORIS MEYZA KLARISTA", "RADITYA REZA PAHLEVI",
    "RAEKA HANDITA SYAHBANA PUTERI", "RESTU DEWI FITRIANI", "RYANTI DWI NAYLA MAHARANI WIDYA",
    "SHAFIRA RAMADHANI", "VERRY BINTANG SURYAWAN", "ZAZA MEISYA PUTRI"
];
const TOTAL_SISWA_TETAP = DAFTAR_SISWA.length;
const STORAGE_KEY = 'xiphorix_absensi';
const STORAGE_KEY_MOOD = 'xiphorix_mood';
const STORAGE_KEY_TUGAS = 'xiphorix_tugas';

let absensiData = [];
let currentFilterDate = new Date().toLocaleDateString('en-CA');
let isSyncing = false;

// ========== UTILITIES ==========
function getTodayISO() { return new Date().toLocaleDateString('en-CA'); }
function getTanggalIndonesia() {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '<', '>': '>' }[m]));
}
function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast-message');
    if (toast) {
        toast.innerText = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', duration);
    } else console.log('📢', msg);
}
function formatTanggalIndo(tglISO) {
    if (!tglISO) return '-';
    const [y,m,d] = tglISO.split('-');
    return `${d}/${m}/${y}`;
}

// ========== LOCALSTORAGE (CACHE) ==========
function loadLocalAbsensi() {
    const stored = localStorage.getItem(STORAGE_KEY);
    absensiData = stored ? JSON.parse(stored) : [];
}
function saveLocalAbsensi() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(absensiData));
}

// ========== CLOUD SYNC ==========
async function syncFromCloud(showLoadingToast = false) {
    if (isSyncing) return;
    isSyncing = true;
    if (showLoadingToast) showToast('🔄 Menyinkronkan data...', 1500);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 detik timeout
        const response = await fetch(scriptURL + '?action=getAbsensi', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data && !data.error) {
            absensiData = data;
            saveLocalAbsensi();
            if (showLoadingToast) showToast('✅ Data cloud berhasil dimuat', 1500);
            refreshAllUI();
        } else throw new Error(data.error || 'Data kosong');
    } catch (err) {
        console.warn('Cloud sync gagal, pakai lokal:', err);
        if (showLoadingToast) showToast('⚠️ Gagal sync cloud, pakai data lokal', 2000);
        loadLocalAbsensi();
        refreshAllUI();
    } finally {
        isSyncing = false;
    }
}

async function syncToCloud(nama, status, waktu, tanggal, bukti = null) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'addAbsen', nama, status, waktu, tanggal, bukti }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch (err) {
        console.warn('Gagal kirim ke cloud:', err);
        return false;
    }
}

// ========== ABSENSI LOGIC ==========
function isValidSiswa(nama) {
    return DAFTAR_SISWA.some(s => s.toLowerCase() === nama.toLowerCase().trim());
}
function cekAbsenHariIni(nama, tanggal) {
    return absensiData.some(item => item.tanggal === tanggal && item.nama.toLowerCase().trim() === nama.toLowerCase().trim());
}

function uploadBukti() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) { resolve(null); return; }
            if (file.size > 2 * 1024 * 1024) {
                showToast('File max 2MB!', 2000);
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        };
        input.click();
    });
}

async function tambahAbsen(nama, statusKehadiran) {
    const today = getTodayISO();
    if (!isValidSiswa(nama)) { showToast(`❌ "${nama}" tidak terdaftar!`, 2500); return false; }
    if (cekAbsenHariIni(nama, today)) { showToast(`⚠️ ${nama} sudah absen hari ini!`, 2500); return false; }

    let bukti = null;
    if (statusKehadiran === 'Izin/Sakit') {
        showToast('📎 Upload foto bukti (max 2MB)', 1500);
        bukti = await uploadBukti();
        if (!bukti) { showToast('Izin/Sakit wajib upload bukti!', 2000); return false; }
    }

    const waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const newEntry = {
        nama: nama.trim(),
        tanggal: today,
        waktu: waktuSekarang,
        status: statusKehadiran,
        bukti: bukti || null,
        timestamp: Date.now()
    };
    // Simpan lokal dulu (cepat)
    absensiData.push(newEntry);
    saveLocalAbsensi();
    refreshAllUI();
    showToast(`✅ ${nama} - ${statusKehadiran} (lokal)`, 1500);
    // Kirim ke cloud background (tidak nge-freeze)
    syncToCloud(nama, statusKehadiran, waktuSekarang, today, bukti).then(success => {
        if (success) showToast(`☁️ ${nama} terkirim ke cloud`, 1500);
        else showToast(`⚠️ ${nama} hanya tersimpan lokal, coba sync nanti`, 2000);
    });
    return true;
}

// ========== RENDER FUNCTIONS ==========
function renderLog(filterNama = '') {
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;
    let filtered = absensiData.filter(item => item.tanggal === currentFilterDate);
    if (filterNama.trim()) filtered = filtered.filter(item => item.nama.toLowerCase().includes(filterNama.toLowerCase()));
    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Tidak ada data untuk tanggal ini</td></tr>';
        return;
    }
    filtered.forEach((item, idx) => {
        const buktiHtml = item.bukti ? `<button class="btn-view-bukti" data-bukti="${item.bukti}">📎 Lihat</button>` : '-';
        tbody.innerHTML += `<tr>
            <td>${idx+1}</td>
            <td>${escapeHtml(item.nama)}</td>
            <td>${item.waktu}</td>
            <td>${item.status}</td>
            <td>${buktiHtml}</td>
        </tr>`;
    });
    document.querySelectorAll('.btn-view-bukti').forEach(btn => {
        btn.onclick = () => {
            const previewImg = document.getElementById('preview-image');
            if (previewImg) previewImg.src = btn.getAttribute('data-bukti');
            const modal = document.getElementById('preview-modal');
            if (modal) modal.style.display = 'flex';
        };
    });
}

function renderStatsForDate() {
    const dataToday = absensiData.filter(item => item.tanggal === currentFilterDate);
    const hadirCount = dataToday.filter(item => item.status === "Hadir").length;
    const uniqueSiswa = new Set(dataToday.map(i => i.nama.toLowerCase())).size;
    const persen = Math.round((uniqueSiswa / TOTAL_SISWA_TETAP) * 100);
    if (document.getElementById('stat-hadir')) document.getElementById('stat-hadir').innerText = hadirCount;
    if (document.getElementById('stat-unik')) document.getElementById('stat-unik').innerHTML = `${uniqueSiswa} / ${TOTAL_SISWA_TETAP}`;
    if (document.getElementById('stat-persen')) document.getElementById('stat-persen').innerText = `${persen}%`;
    const filterInfo = document.getElementById('filter-info');
    if (filterInfo) filterInfo.innerText = `Menampilkan untuk: ${formatTanggalIndo(currentFilterDate)}`;
}

function renderRanking7Hari() {
    const today = new Date();
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(today.getDate() - 7);
    const data7Hari = absensiData.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate >= sevenDaysAgo && itemDate <= today && item.status === "Hadir";
    });
    const countMap = new Map();
    data7Hari.forEach(item => {
        const namaLow = item.nama.toLowerCase();
        countMap.set(namaLow, (countMap.get(namaLow) || 0) + 1);
    });
    const sorted = Array.from(countMap.entries()).sort((a,b) => b[1] - a[1]).slice(0,5);
    const rankDiv = document.getElementById('ranking-7hari');
    if (!rankDiv) return;
    if (sorted.length === 0) { rankDiv.innerHTML = '<div>Belum ada data 7 hari</div>'; return; }
    const medals = ['🥇','🥈','🥉','📌','📌'];
    rankDiv.innerHTML = '';
    sorted.forEach(([nama, count], idx) => {
        const originalNama = DAFTAR_SISWA.find(s => s.toLowerCase() === nama) || nama;
        rankDiv.innerHTML += `<div class="rank-item">${medals[idx]} <strong>${originalNama}</strong> - ${count} x Hadir</div>`;
    });
}

function refreshAllUI() {
    renderLog(document.getElementById('search-nama')?.value || '');
    renderStatsForDate();
    renderRanking7Hari();
}

// ========== RESET & EXPORT ==========
function resetDataHariIni() {
    if (confirm('Hapus data HARI INI saja?')) {
        const today = getTodayISO();
        absensiData = absensiData.filter(item => item.tanggal !== today);
        saveLocalAbsensi();
        refreshAllUI();
        showToast('Data hari ini direset (lokal)', 1500);
        // Optional: kirim reset ke cloud? Tidak perlu, nanti sync akan timpa.
    }
}
function resetSemuaData() {
    if (confirm('HAPUS SEMUA DATA ABSENSI? (permanen)')) {
        absensiData = [];
        saveLocalAbsensi();
        refreshAllUI();
        showToast('Semua data dihapus (lokal)', 1500);
    }
}
function exportToJSON() {
    const dataStr = JSON.stringify(absensiData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absensi_xiphorix_${getTodayISO()}.json`;
    a.click();
    showToast('Export JSON berhasil');
}

// ========== MOOD (UNTUK JADWAL) ==========
window.loadMoodFromLocal = function() {
    const stored = localStorage.getItem(STORAGE_KEY_MOOD);
    return stored ? JSON.parse(stored) : { happy: 0, stress: 0 };
};
window.saveMoodToLocal = function(mood) {
    localStorage.setItem(STORAGE_KEY_MOOD, JSON.stringify(mood));
};
window.addMoodToLocal = function(type) {
    const mood = window.loadMoodFromLocal();
    if (type === 'happy') mood.happy++;
    else if (type === 'stress') mood.stress++;
    window.saveMoodToLocal(mood);
    return mood;
};

// ========== TUGAS (UNTUK TUGAS.HTML) ==========
window.loadTugasFromLocal = function() {
    const stored = localStorage.getItem(STORAGE_KEY_TUGAS);
    return stored ? JSON.parse(stored) : [];
};
window.saveTugasToLocal = function(tugas) {
    localStorage.setItem(STORAGE_KEY_TUGAS, JSON.stringify(tugas));
};

// ========== UI INIT ==========
function initCommonUI() {
    // Clock semua halaman
    setInterval(() => {
        const now = new Date().toLocaleTimeString('id-ID');
        document.querySelectorAll('.live-clock').forEach(el => el.textContent = now);
    }, 1000);
    // Dark mode
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');
    document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
        btn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        };
    });
    // Particles
    const canvas = document.getElementById('particle-canvas') || document.getElementById('particle-canvas-abs');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth, height = window.innerHeight;
        canvas.width = width; canvas.height = height;
        let particles = [];
        for (let i = 0; i < 70; i++) particles.push({ x: Math.random()*width, y: Math.random()*height, radius: Math.random()*2+1, alpha: Math.random()*0.5 });
        function draw() {
            if (!ctx) return;
            ctx.clearRect(0,0,width,height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
                ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
                ctx.fill();
            });
            requestAnimationFrame(draw);
        }
        draw();
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            width = canvas.width; height = canvas.height;
        });
    }
    // Home year
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

// ========== ABSENSI PAGE SPECIFIC ==========
function populateSiswaDropdown() {
    const select = document.getElementById('pilih-siswa');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Nama Siswa --</option>';
    DAFTAR_SISWA.forEach(nama => {
        const opt = document.createElement('option');
        opt.value = nama;
        opt.textContent = nama;
        select.appendChild(opt);
    });
}

function initAbsensiPage() {
    const authModal = document.getElementById('auth-modal');
    const absMain = document.getElementById('absensi-main');
    if (!authModal || !absMain) return;
    const isAuth = sessionStorage.getItem('xiphorix_auth') === 'true';
    if (isAuth) {
        authModal.style.display = 'none';
        absMain.style.display = 'block';
        loadAbsensiModule();
    } else {
        authModal.style.display = 'flex';
        const authBtn = document.getElementById('auth-submit');
        const authInput = document.getElementById('auth-code');
        authBtn.onclick = () => {
            if (authInput.value === 'XIPHORIX2026' || authInput.value === '12345') {
                sessionStorage.setItem('xiphorix_auth', 'true');
                authModal.style.display = 'none';
                absMain.style.display = 'block';
                loadAbsensiModule();
            } else {
                showToast('Kode salah! Gunakan XIPHORIX2026', 2000);
                authInput.value = '';
            }
        };
    }
}

async function loadAbsensiModule() {
    // Tampilkan data lokal dulu (cepat)
    loadLocalAbsensi();
    populateSiswaDropdown();
    const dateElem = document.getElementById('full-date-indo');
    if (dateElem) dateElem.innerText = getTanggalIndonesia();
    const totalSpan = document.getElementById('total-siswa-tetap');
    if (totalSpan) totalSpan.innerText = TOTAL_SISWA_TETAP;
    currentFilterDate = getTodayISO();
    const filterInput = document.getElementById('filter-tanggal');
    if (filterInput) filterInput.value = currentFilterDate;
    refreshAllUI();

    // Lalu sync dari cloud di background (tanpa nge-freeze)
    syncFromCloud(true);

    // Event binding
    document.getElementById('status-hadir').onclick = () => handleAbsen('Hadir');
    document.getElementById('status-izin').onclick = () => handleAbsen('Izin/Sakit');
    document.getElementById('status-alfa').onclick = () => handleAbsen('Alfa');
    document.getElementById('apply-filter').onclick = () => {
        currentFilterDate = document.getElementById('filter-tanggal').value || getTodayISO();
        refreshAllUI();
    };
    document.getElementById('reset-filter').onclick = () => {
        currentFilterDate = getTodayISO();
        document.getElementById('filter-tanggal').value = currentFilterDate;
        refreshAllUI();
    };
    document.getElementById('search-nama').oninput = (e) => renderLog(e.target.value);
    document.getElementById('export-json').onclick = exportToJSON;
    document.getElementById('reset-hari').onclick = resetDataHariIni;
    document.getElementById('reset-semua').onclick = resetSemuaData;
    const closePreview = document.getElementById('close-preview');
    if (closePreview) closePreview.onclick = () => document.getElementById('preview-modal').style.display = 'none';

    // Tombol sync manual opsional (bisa ditambahkan di HTML)
    const syncBtn = document.getElementById('manual-sync-btn');
    if (syncBtn) syncBtn.onclick = () => syncFromCloud(true);
}

function handleAbsen(status) {
    const select = document.getElementById('pilih-siswa');
    if (!select.value) { showToast('Pilih nama dulu!', 1500); return; }
    tambahAbsen(select.value, status).then(() => {
        select.value = '';
        refreshAllUI();
    });
}

// ========== MAIN ENTRY ==========
window.addEventListener('DOMContentLoaded', () => {
    initCommonUI();
    if (document.getElementById('auth-modal')) initAbsensiPage();
});
