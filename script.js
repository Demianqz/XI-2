// ==================== XIPHORIX - 2 DETIK POLLING REAL-TIME ====================
// GAS URL - update sesuai deploy Anda
const scriptURL = "https://script.google.com/macros/s/AKfycbwMdLSWVYZDWLyUgjiCgPAsoofvKn5WbTe-Gw-_XDh32NE5VO4csUzwZ0THNziA7tD-yg/exec";

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

let absensiData = [];
let currentFilterDate = new Date().toLocaleDateString('en-CA');
let lastDataString = '';
let pollingInterval;

// ========== UTILITIES ==========
function getTodayISO() { return new Date().toLocaleDateString('en-CA'); }
function getTanggalIndonesia() {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '<', '>': '>', '"': '"' }[m]));
}
function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast-message');
    if (toast) {
        toast.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', duration);
    } else console.log(msg);
}
function formatTanggalIndo(tglISO) {
    if (!tglISO) return '-';
    const [y,m,d] = tglISO.split('-');
    return `${d}/${m}/${y}`;
}

// ========== LOCALSTORAGE ==========
function loadLocalAbsensi() {
    const stored = localStorage.getItem(STORAGE_KEY);
    absensiData = stored ? JSON.parse(stored) : [];
}
function saveLocalAbsensi() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(absensiData));
}

// ========== CLOUD POLLING (2 DETIK) ==========
async function syncFromCloud() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${scriptURL}?action=getAbsensi&_=${Date.now()}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        const dataString = JSON.stringify(data);
        if (dataString !== lastDataString && !data.error) {
            absensiData = data;
            saveLocalAbsensi();
            lastDataString = dataString;
            refreshAllUI();
            console.log('📡 Data cloud updated');
        }
    } catch (err) {
        console.warn('Sync gagal:', err);
    }
}

// ========== ABSEN LOGIC ==========
async function tambahAbsen(nama, status) {
    const today = getTodayISO();
    if (!DAFTAR_SISWA.some(s => s.toLowerCase() === nama.toLowerCase().trim())) {
        showToast('❌ Nama tidak terdaftar');
        return false;
    }
    if (absensiData.some(item => item.tanggal === today && item.nama.toLowerCase().trim() === nama.toLowerCase().trim())) {
        showToast(`${nama} sudah absen hari ini`);
        return false;
    }

    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const newEntry = { nama: nama.trim(), tanggal: today, waktu, status, timestamp: Date.now() };

    // Tambah lokal dulu (instan UI update)
    absensiData.push(newEntry);
    saveLocalAbsensi();
    refreshAllUI();

    // Kirim cloud
    try {
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'addAbsen', ...newEntry })
        });
        showToast(`✅ ${nama} - ${status} tersimpan`);
        // Force sync setelah 500ms (pastikan data cloud tersedia)
        setTimeout(syncFromCloud, 500);
    } catch (e) {
        showToast('Lokal OK, cloud gagal');
    }
    return true;
}

// ========== RENDER ==========
function renderLog(filterNama = '') {
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;
    let filtered = absensiData.filter(item => item.tanggal === currentFilterDate);
    if (filterNama.trim()) filtered = filtered.filter(item => item.nama.toLowerCase().includes(filterNama.toLowerCase()));
    tbody.innerHTML = filtered.length === 0 ? 
        '<tr><td colspan="5" style="text-align:center">Tidak ada data</td></tr>' : 
        filtered.map((item, idx) => `
            <tr>
                <td>${idx+1}</td>
                <td>${escapeHtml(item.nama)}</td>
                <td>${item.waktu}</td>
                <td>${item.status}</td>
                <td>${item.bukti ? `<a href="${escapeHtml(item.bukti)}" target="_blank">📎</a>` : '-'}</td>
            </tr>
        `).join('');
}

function renderStatsForDate() {
    const dataToday = absensiData.filter(item => item.tanggal === currentFilterDate);
    const hadirCount = dataToday.filter(item => item.status === "Hadir").length;
    const uniqueSiswa = new Set(dataToday.map(i => i.nama.toLowerCase())).size;
    const persen = Math.round((uniqueSiswa / TOTAL_SISWA_TETAP) * 100);
    const hadirEl = document.getElementById('stat-hadir');
    const unikEl = document.getElementById('stat-unik');
    const persenEl = document.getElementById('stat-persen');
    const filterEl = document.getElementById('filter-info');
    if (hadirEl) hadirEl.textContent = hadirCount;
    if (unikEl) unikEl.innerHTML = `${uniqueSiswa} / ${TOTAL_SISWA_TETAP}`;
    if (persenEl) persenEl.textContent = `${persen}%`;
    if (filterEl) filterEl.textContent = `Tanggal: ${formatTanggalIndo(currentFilterDate)}`;
}

function renderRanking7Hari() {
    const today = new Date();
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
    const weekData = absensiData.filter(item => {
        const d = new Date(item.tanggal);
        return d >= weekAgo && item.status === 'Hadir';
    });
    const counts = {};
    weekData.forEach(item => {
        const n = item.nama.toLowerCase();
        counts[n] = (counts[n] || 0) + 1;
    });
    const top5 = Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .slice(0,5)
        .map(([n,c],i) => ({n: DAFTAR_SISWA.find(s => s.toLowerCase() === n) || n, c, medal: ['🥇','🥈','🥉','📌','📌'][i]}));
    const rankEl = document.getElementById('ranking-7hari');
    if (rankEl) rankEl.innerHTML = top5.length ? top5.map(r => `<div>${r.medal} ${escapeHtml(r.n)} - ${r.c}x</div>`).join('') : 'No data';
}

function refreshAllUI() {
    renderLog(document.getElementById('search-nama')?.value || '');
    renderStatsForDate();
    renderRanking7Hari();
}

// ========== POLLING 2 DETIK ==========
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        if (!document.hidden && document.visibilityState === 'visible') {
            syncFromCloud();
        }
    }, 2000); // 2 detik polling - near real-time
}

// Stop polling when page hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (pollingInterval) clearInterval(pollingInterval);
    } else {
        startPolling();
    }
});

// ========== INIT ==========
function initCommonUI() {
    setInterval(() => {
        const time = new Date().toLocaleTimeString('id-ID');
        document.querySelectorAll('.live-clock').forEach(el => el.textContent = time);
    }, 1000);
    if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
        btn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        };
    });
}

function populateSiswaDropdown() {
    const select = document.getElementById('pilih-siswa');
    if (select) {
        select.innerHTML = '<option value="">-- Pilih Siswa --</option>' + 
            DAFTAR_SISWA.map(n => `<option value="${n}">${n}</option>`).join('');
    }
}

function initAbsensiPage() {
    const authModal = document.getElementById('auth-modal');
    const main = document.getElementById('absensi-main');
    const isAuth = sessionStorage.getItem('xiphorix_auth') === 'true';
    if (isAuth) {
        authModal.style.display = 'none';
        main.style.display = 'block';
        loadAbsensiModule();
    } else {
        authModal.style.display = 'flex';
        document.getElementById('auth-submit').onclick = () => {
            const code = document.getElementById('auth-code').value;
            if (code === 'XIPHORIX2026' || code === '12345') {
                sessionStorage.setItem('xiphorix_auth', 'true');
                authModal.style.display = 'none';
                main.style.display = 'block';
                loadAbsensiModule();
            } else showToast('Kode salah!');
        };
    }
}

async function loadAbsensiModule() {
    loadLocalAbsensi();
    populateSiswaDropdown();
    document.getElementById('full-date-indo').textContent = getTanggalIndonesia();
    document.getElementById('total-siswa-tetap').textContent = TOTAL_SISWA_TETAP;
    currentFilterDate = getTodayISO();
    document.getElementById('filter-tanggal').value = currentFilterDate;
    await syncFromCloud();
    refreshAllUI();
    startPolling();

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
    document.getElementById('search-nama').oninput = e => renderLog(e.target.value);
    document.getElementById('export-json').onclick = () => {
        const blob = new Blob([JSON.stringify(absensiData, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `absensi_${getTodayISO()}.json`;
        a.click();
    };
    document.getElementById('reset-hari').onclick = () => {
        if (confirm('Reset hari ini?')) {
            const today = getTodayISO();
            absensiData = absensiData.filter(item => item.tanggal !== today);
            saveLocalAbsensi();
            refreshAllUI();
        }
    };
    document.getElementById('reset-semua').onclick = () => {
        if (confirm('Reset semua?')) {
            absensiData = [];
            saveLocalAbsensi();
            refreshAllUI();
        }
    };
    document.getElementById('close-preview').onclick = () => document.getElementById('preview-modal').style.display = 'none';
}

function handleAbsen(status) {
    const select = document.getElementById('pilih-siswa');
    if (!select.value) {
        showToast('Pilih siswa dulu!');
        return;
    }
    tambahAbsen(select.value, status).then(() => select.value = '');
}

window.addEventListener('DOMContentLoaded', () => {
    initCommonUI();
    if (document.getElementById('auth-modal')) initAbsensiPage();
});

// Mood/Tugas localStorage - sama seperti sebelumnya
window.loadMoodFromLocal = function() { return JSON.parse(localStorage.getItem('xiphorix_mood') || '{"happy":0,"stress":0}'); };
window.saveMoodToLocal = function(mood) { localStorage.setItem('xiphorix_mood', JSON.stringify(mood)); };
window.loadTugasFromLocal = function() { return JSON.parse(localStorage.getItem('xiphorix_tugas') || '[]'); };
window.saveTugasToLocal = function(tugas) { localStorage.setItem('xiphorix_tugas', JSON.stringify(tugas)); };

