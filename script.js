// ==================== XIPHORIX BASIC LOCALSTORAGE - WEB AWAL ====================

// Daftar siswa (tetap)
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
const STORAGE_KEY = 'xiphorix_absensi_simple';
const MOOD_KEY = 'xiphorix_mood';
const TOTAL_SISWA = DAFTAR_SISWA.length;

// Utils
function getTodayISO() { return new Date().toLocaleDateString('en-CA'); }
function getTanggalIndonesia() {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function escapeHtml(str) { return str ? str.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '<', '>': '>', '"': '"' }[m])) : ''; }
function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast-message');
    if (toast) {
        toast.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', duration);
    }
}
function formatTanggalIndo(tglISO) {
    if (!tglISO) return '-';
    const [y,m,d] = tglISO.split('-');
    return `${d}/${m}/${y}`;
}

// ========== ABSENSI LOCAL ONLY ==========
let absensiData = [];
function loadAbsensi() {
    const stored = localStorage.getItem(STORAGE_KEY);
    absensiData = stored ? JSON.parse(stored) : [];
}
function saveAbsensi() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(absensiData));
}
function tambahAbsen(nama, status) {
    const today = getTodayISO();
    const existing = absensiData.find(item => item.nama.toLowerCase() === nama.toLowerCase().trim() && item.tanggal === today);
    if (existing) {
        showToast(`${nama} sudah absen hari ini!`);
        return false;
    }
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const newEntry = { nama: nama.trim(), status, waktu, tanggal: today, timestamp: Date.now() };
    absensiData.push(newEntry);
    saveAbsensi();
    renderAbsensiLog();
    showToast(`✅ ${status}: ${nama}`);
    return true;
}
function renderAbsensiLog() {
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;
    const todayData = absensiData.filter(item => item.tanggal === getTodayISO());
    tbody.innerHTML = todayData.length ? todayData.map((item, idx) => `
        <tr>
            <td>${idx+1}</td>
            <td>${escapeHtml(item.nama)}</td>
            <td>${item.waktu}</td>
            <td>${item.status}</td>
            <td>-</td>
        </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px">📭 Belum ada absensi hari ini</td></tr>';
}

// ========== MOOD VOTING (JADWAL) ==========
window.loadMoodFromLocal = function() { 
    return JSON.parse(localStorage.getItem(MOOD_KEY) || '{"happy":0,"stress":0,"voted":false}'); 
};
window.saveMoodToLocal = function(mood) { 
    localStorage.setItem(MOOD_KEY, JSON.stringify(mood)); 
};

// ========== COMMON UI ==========
function initCommonUI() {
    // Clock
    setInterval(() => {
        const time = new Date().toLocaleTimeString('id-ID');
        document.querySelectorAll('.live-clock').forEach(el => el.textContent = time);
    }, 1000);
    
    // Dark mode
    if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
        btn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        };
    });
    
    // Year footer
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// ========== ABSENSI PAGE INIT ==========
function initAbsensiPage() {
    document.getElementById('full-date-indo').textContent = getTanggalIndonesia();
    
    // Siswa dropdown
    const select = document.getElementById('pilih-siswa');
    select.innerHTML = '<option value="">-- Pilih Nama Siswa --</option>' + 
        DAFTAR_SISWA.map(n => `<option value="${n}">${n}</option>`).join('');
    
    loadAbsensi();
    renderAbsensiLog();
    
    // Status buttons
    document.getElementById('status-hadir').onclick = () => {
        const nama = document.getElementById('pilih-siswa').value;
        if (nama) tambahAbsen(nama, 'Hadir');
    };
    document.getElementById('status-izin').onclick = () => {
        const nama = document.getElementById('pilih-siswa').value;
        if (nama) tambahAbsen(nama, 'Izin');
    };
    document.getElementById('status-alfa').onclick = () => {
        const nama = document.getElementById('pilih-siswa').value;
        if (nama) tambahAbsen(nama, 'Alfa');
    };
}

// ========== AUTO INIT ==========
if (document.getElementById('log-tbody')) window.addEventListener('DOMContentLoaded', initAbsensiPage);
window.addEventListener('DOMContentLoaded', initCommonUI);

// Tugas utils (used by tugas.js)
window.escapeHtml = escapeHtml;
window.showToast = showToast;
window.formatTanggalIndo = formatTanggalIndo;

