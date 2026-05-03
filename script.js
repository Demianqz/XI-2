// ==================== XIPHORIX - HYBRID CLOUD + DRIVE BUKTI ====================
// GANTI DENGAN URL DEPLOY APPS SCRIPT KAMU YANG SUDAH SUPPORT UPLOAD
const scriptURL = "https://script.google.com/macros/s/AKfycbzmfwPA2fZ3u5Z8FVSzRHKO0S_CE0DsLSzwOSJA3UxtUdMotGjxTx1KyFektI8FoDFUgA/exec";
const DRIVE_FOLDER_ID = '1mwIWs4eImjRxsDu_zqeP-P7TwHwb6j2S';

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
    return str.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '<', '>': '>', '"': '"' }[m]));
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

// ========== LOCALSTORAGE ==========
function loadLocalAbsensi() {
    const stored = localStorage.getItem(STORAGE_KEY);
    absensiData = stored ? JSON.parse(stored) : [];
}
function saveLocalAbsensi() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(absensiData));
}

// ========== DRIVE UPLOAD ==========
async function uploadFileToDrive(file, namaSiswa) {
    return new Promise((resolve, reject) => {
        if (file.size > 2 * 1024 * 1024) {
            showToast('File terlalu besar! Max 2MB', 2000);
            reject('Too large');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1];
            try {
                showToast('⏫ Mengupload ke Google Drive...', 2000);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                const response = await fetch(scriptURL, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        action: 'uploadBukti',
                        fileName: `${namaSiswa}_${getTodayISO()}_${Date.now()}.jpg`,
                        base64Data: base64,
                        folderId: DRIVE_FOLDER_ID
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                const result = await response.json();
                if (result.link) {
                    showToast('✅ Bukti berhasil diupload!', 1500);
                    resolve(result.link);
                } else {
                    throw new Error(result.error || 'Upload gagal');
                }
            } catch (err) {
                console.error('Upload error:', err);
                showToast('❌ Upload gagal, coba lagi', 2500);
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ========== CLOUD SYNC ==========
async function syncFromCloud(showLoadingToast = false) {
    if (isSyncing) return;
    isSyncing = true;
    if (showLoadingToast) showToast('🔄 Menyinkronkan data...', 1500);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
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
        console.warn('Cloud sync gagal:', err);
        if (showLoadingToast) showToast('⚠️ Gagal sync cloud, pakai lokal', 2000);
        loadLocalAbsensi();
        refreshAllUI();
    } finally {
        isSyncing = false;
    }
}

async function syncToCloud(entry) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        await fetch(scriptURL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'addAbsen', ...entry }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch (err) {
        console.warn('Cloud save gagal:', err);
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

async function tambahAbsen(nama, statusKehadiran) {
    const today = getTodayISO();
    if (!isValidSiswa(nama)) { 
        showToast(`❌ "${nama}" tidak terdaftar!`, 2500); 
        return false; 
    }
    if (cekAbsenHariIni(nama, today)) { 
        showToast(`⚠️ ${nama} sudah absen hari ini!`, 2500); 
        return false; 
    }

    let buktiLink = null;
    if (statusKehadiran === 'Izin/Sakit') {
        showToast('📎 Upload foto bukti ke Drive (max 2MB)', 1500);
        const file = await new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = e => resolve(e.target.files[0]);
            input.click();
        });
        if (!file) {
            showToast('Bukti wajib untuk Izin/Sakit!', 2000);
            return false;
        }
        try {
            buktiLink = await uploadFileToDrive(file, nama);
        } catch (e) {
            return false;
        }
    }

    const waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const newEntry = {
        nama: nama.trim(),
        tanggal: today,
        waktu: waktuSekarang,
        status: statusKehadiran,
        bukti: buktiLink,
        timestamp: Date.now()
    };

    // Local dulu
    absensiData.push(newEntry);
    saveLocalAbsensi();
    refreshAllUI();
    showToast(`✅ ${nama} - ${statusKehadiran} tersimpan lokal`, 1500);

    // Cloud background
    syncToCloud(newEntry).then(success => {
        if (success) showToast(`☁️ ${nama} tersinkron ke cloud`, 1500);
    });

    return true;
}

// ========== RENDER ==========
function renderLog(filterNama = '') {
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;
    let filtered = absensiData.filter(item => item.tanggal === currentFilterDate);
    if (filterNama.trim()) filtered = filtered.filter(item => item.nama.toLowerCase().includes(filterNama.toLowerCase()));
    tbody.innerHTML = filtered.length === 0 ? 
        '<tr><td colspan="5">Tidak ada data</td></tr>' : 
        filtered.map((item, idx) => {
            const buktiHtml = item.bukti ? 
                `<a href="${item.bukti}" target="_blank" class="btn-view-bukti" rel="noopener">📎 Lihat Bukti</a>` : 
                '-';
            return `
                <tr>
                    <td>${idx+1}</td>
                    <td>${escapeHtml(item.nama)}</td>
                    <td>${item.waktu}</td>
                    <td>${item.status}</td>
                    <td>${buktiHtml}</td>
                </tr>`;
        }).join('');
}

function renderStatsForDate() {
    const dataToday = absensiData.filter(item => item.tanggal === currentFilterDate);
    const hadirCount = dataToday.filter(item => item.status === "Hadir").length;
    const uniqueSiswa = new Set(dataToday.map(i => i.nama.toLowerCase())).size;
    const persen = Math.round((uniqueSiswa / TOTAL_SISWA_TETAP) * 100);
    document.getElementById('stat-hadir').innerText = hadirCount;
    document.getElementById('stat-unik').innerHTML = `${uniqueSiswa} / ${TOTAL_SISWA_TETAP}`;
    document.getElementById('stat-persen').innerText = `${persen}%`;
    document.getElementById('filter-info').innerText = `Tanggal: ${formatTanggalIndo(currentFilterDate)}`;
}

function renderRanking7Hari() {
    const today = new Date();
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
    const data7Hari = absensiData.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate >= sevenDaysAgo && itemDate <= today && item.status === "Hadir";
    });
    const countMap = {};
    data7Hari.forEach(item => {
        const lower = item.nama.toLowerCase();
        countMap[lower] = (countMap[lower] || 0) + 1;
    });
    const sorted = Object.entries(countMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0,5)
        .map(([nama,count],idx) => ({
            nama: DAFTAR_SISWA.find(n => n.toLowerCase() === nama) || nama,
            count,
            medal: ['🥇','🥈','🥉','📌','📌'][idx]
        }));
    const rankDiv = document.getElementById('ranking-7hari');
    if (rankDiv) rankDiv.innerHTML = sorted.length ? 
        sorted.map(r => `<div>${r.medal} ${r.nama} - ${r.count}x</div>`).join('') : 
        'Belum ada data';
}

function refreshAllUI() {
    renderLog(document.getElementById('search-nama')?.value || '');
    renderStatsForDate();
    renderRanking7Hari();
}

// Reset & Export
function resetDataHariIni() {
    if (confirm('Reset hari ini saja?')) {
        const today = getTodayISO();
        absensiData = absensiData.filter(item => item.tanggal !== today);
        saveLocalAbsensi();
        refreshAllUI();
        showToast('Reset hari ini (lokal)');
    }
}
function resetSemuaData() {
    if (confirm('Hapus SEMUA data?')) {
        absensiData = [];
        saveLocalAbsensi();
        refreshAllUI();
        showToast('Semua data dihapus (lokal)');
    }
}
function exportToJSON() {
    const blob = new Blob([JSON.stringify(absensiData, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xiphorix_${getTodayISO()}.json`;
    a.click();
    showToast('JSON exported');
}

// MOOD & TUGAS LOCAL
window.loadMoodFromLocal = function() { return JSON.parse(localStorage.getItem(STORAGE_KEY_MOOD) || '{"happy":0,"stress":0}'); };
window.saveMoodToLocal = function(mood) { localStorage.setItem(STORAGE_KEY_MOOD, JSON.stringify(mood)); };
window.loadTugasFromLocal = function() { return JSON.parse(localStorage.getItem(STORAGE_KEY_TUGAS) || '[]'); };
window.saveTugasToLocal = function(tugas) { localStorage.setItem(STORAGE_KEY_TUGAS, JSON.stringify(tugas)); };

// ========== INIT ==========
function initCommonUI() {
    setInterval(() => document.querySelectorAll('.live-clock').forEach(el => el.textContent = new Date().toLocaleTimeString('id-ID')), 1000);
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) document.body.classList.add('dark-mode');
    document.querySelectorAll('.dark-mode-toggle').forEach(btn => btn.onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
    // particles code omitted for brevity - same as before
}

function populateSiswaDropdown() {
    const select = document.getElementById('pilih-siswa');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Siswa --</option>' + DAFTAR_SISWA.map(n => `<option>${n}</option>`).join('');
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
    document.getElementById('full-date-indo').innerText = getTanggalIndonesia();
    document.getElementById('total-siswa-tetap').innerText = TOTAL_SISWA_TETAP;
    currentFilterDate = getTodayISO();
    document.getElementById('filter-tanggal').value = currentFilterDate;
    refreshAllUI();
    syncFromCloud(true);

    // Events
    document.getElementById('status-hadir').onclick = () => handleAbsen('Hadir');
    document.getElementById('status-izin').onclick = () => handleAbsen('Izin/Sakit');
    document.getElementById('status-alfa').onclick = () => handleAbsen('Alfa');
    document.getElementById('apply-filter').onclick = () => { currentFilterDate = document.getElementById('filter-tanggal').value || getTodayISO(); refreshAllUI(); };
    document.getElementById('reset-filter').onclick = () => { currentFilterDate = getTodayISO(); document.getElementById('filter-tanggal').value = currentFilterDate; refreshAllUI(); };
    document.getElementById('search-nama').oninput = e => renderLog(e.target.value);
    document.getElementById('export-json').onclick = exportToJSON;
    document.getElementById('reset-hari').onclick = resetDataHariIni;
    document.getElementById('reset-semua').onclick = resetSemuaData;
    document.getElementById('close-preview').onclick = () => document.getElementById('preview-modal').style.display = 'none';
    setInterval(syncFromCloud, 30000);
}

function handleAbsen(status) {
    const nama = document.getElementById('pilih-siswa').value;
    if (!nama) { showToast('Pilih siswa!'); return; }
    tambahAbsen(nama, status).then(success => {
        if (success) document.getElementById('pilih-siswa').value = '';
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initCommonUI();
    if (document.getElementById('auth-modal')) initAbsensiPage();
});

