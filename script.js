// ==================== XIPHORIX SCRIPT.JS - FIXED VERSION ====================
// Fixed: Syntax errors, page detection, auth logic, error boundaries

// ==================== CONFIGURATION ====================
const NEW_GAS_URL = 'https://script.google.com/macros/s/AKfycbzmfwPA2fZ3u5Z8FVSzRHKO0S_CE0DsLSzwOSJA3UxtUdMotGjxTx1KyFektI8FoDFUgA/exec';

// ==================== DAFTAR SISWA TETAP (36 SISWA) ====================
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

// ==================== GLOBAL STATE ====================
let absensiData = [];
const STORAGE_KEY = 'xiphorix_absensi';
let currentFilterDate = new Date().toLocaleDateString('en-CA');

// ==================== CORE UTILITY FUNCTIONS ====================
function getTodayISO() { return new Date().toLocaleDateString('en-CA'); }
function getTanggalIndonesia() {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function isValidSiswa(nama) {
    return DAFTAR_SISWA.some(s => s.toLowerCase() === nama.toLowerCase().trim());
}
function escapeHtml(str) {
    return str.replace(/[&<>"]/g, m => ({ '&':'&amp;', '<':'<', '>':'>', '"':'"' }[m]));
}
function showToast(msg, duration=2000) {
    const toast = document.getElementById('toast-message');
    if(toast) { 
        toast.innerText = msg; 
        toast.style.display = 'block'; 
        setTimeout(() => toast.style.display = 'none', duration); 
    } else {
        console.log('Toast:', msg);
    }
}

// ==================== COMMON UI INIT ====================
function initCommonUI() {
    // Clock
    setInterval(() => {
        const nowTime = new Date().toLocaleTimeString('id-ID');
        document.querySelectorAll('.live-clock').forEach(el => el.textContent = nowTime);
    }, 1000);

    // Dark mode
    const isDark = localStorage.getItem('darkMode') === 'true';
    if(isDark) document.body.classList.add('dark-mode');
    document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
        btn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        };
    });

    // Particles (only if canvas exists)
    const canvas = document.getElementById('particle-canvas') || document.getElementById('particle-canvas-abs');
    if(canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particles = [];
        for(let i = 0; i < 70; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5
            });
        }
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
                ctx.fill();
            });
            requestAnimationFrame(animate);
        }
        animate();
    }

    // Home year
    const yearElem = document.getElementById('current-year');
    if (yearElem) yearElem.textContent = new Date().getFullYear();
}

// ==================== ABSENSI PAGE FUNCTIONS ====================
async function loadDataFromCloud() {
    try {
        const response = await fetch(NEW_GAS_URL);
        absensiData = await response.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(absensiData));
    } catch (e) {
        console.warn("Cloud load failed, using local:", e);
        const stored = localStorage.getItem(STORAGE_KEY);
        absensiData = stored ? JSON.parse(stored) : [];
    }
}

function saveDataLocally() { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(absensiData)); 
}

function populateSiswaDropdown() {
    const select = document.getElementById('pilih-siswa');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Nama Siswa --</option>';
    DAFTAR_SISWA.forEach(nama => {
        const option = document.createElement('option');
        option.value = nama;
        option.textContent = nama;
        select.appendChild(option);
    });
}

function renderLog(filterNama = '') {
    const filtered = absensiData.filter(item => item.tanggal === currentFilterDate);
    const finalData = filterNama ? filtered.filter(item => 
        item.nama.toLowerCase().includes(filterNama.toLowerCase())
    ) : filtered;
    
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = finalData.length ? 
        finalData.map((item, idx) => {
            const buktiHtml = item.bukti ? 
                `<button class="btn-view-bukti" data-bukti="${item.bukti}">📎 Lihat</button>` : '-';
            return `
                <tr>
                    <td>${idx+1}</td>
                    <td>${escapeHtml(item.nama)}</td>
                    <td>${item.waktu}</td>
                    <td>${item.status}</td>
                    <td>${buktiHtml}</td>
                </tr>`;
        }).join('') : 
        '<tr><td colspan="5">Tidak ada data untuk tanggal ini</td></tr>';
    
    // Bind bukti viewers
    document.querySelectorAll('.btn-view-bukti').forEach(btn => {
        btn.onclick = () => {
            const bukti = btn.getAttribute('data-bukti');
            document.getElementById('preview-image').src = bukti;
            document.getElementById('preview-modal').style.display = 'flex';
        };
    });
}

// Initialize Absensi Page - FIXED VERSION
function initAbsensiPage() {
    console.log('🔍 Init Absensi Page');
    
    const authModal = document.getElementById('auth-modal');
    const absMain = document.getElementById('absensi-main');
    
    if (!authModal || !absMain) {
        console.error('❌ Absensi elements missing!');
        return;
    }
    
    // Check auth
    const isAuth = sessionStorage.getItem('xiphorix_auth') === 'true';
    console.log('Auth status:', isAuth);
    
    if (isAuth) {
        console.log('✅ Auth OK, show main');
        authModal.style.display = 'none';
        absMain.style.display = 'block';
        loadAbsensiModule();
    } else {
        console.log('🔐 Show auth modal');
        authModal.style.display = 'flex';
        
        const authBtn = document.getElementById('auth-submit');
        const authInput = document.getElementById('auth-code');
        
        if (authBtn) {
            authBtn.onclick = () => {
                const code = authInput.value;
                if (code === 'XIPHORIX2026' || code === '12345') {
                    authBtn.classList.add('btn-success');
                    authBtn.textContent = 'BERHASIL!';
                    sessionStorage.setItem('xiphorix_auth', 'true');
                    setTimeout(() => {
                        authModal.style.display = 'none';
                        absMain.style.display = 'block';
                        loadAbsensiModule();
                    }, 800);
                } else {
                    authBtn.classList.add('btn-error');
                    authBtn.textContent = 'SALAH!';
                    showToast('Kode salah! Hint: XIPHORIX2026', 2000);
                    setTimeout(() => {
                        authBtn.classList.remove('btn-error', 'btn-success');
                        authBtn.textContent = 'Verifikasi';
                        authInput.value = '';
                    }, 1500);
                }
            };
        }
    }
}

async function loadAbsensiModule() {
    console.log('🚀 Loading Absensi Module');
    
    try {
        await loadDataFromCloud();
        populateSiswaDropdown();
        
        document.getElementById('full-date-indo').textContent = getTanggalIndonesia();
        document.getElementById('total-siswa-tetap').textContent = TOTAL_SISWA_TETAP;
        
        currentFilterDate = getTodayISO();
        document.getElementById('filter-tanggal').value = currentFilterDate;
        
        renderLog();
        renderStatsForDate();
        renderRanking7Hari();
        
        // Event bindings
        document.getElementById('status-hadir').onclick = () => handleAbsen('Hadir');
        document.getElementById('status-izin').onclick = () => handleAbsen('Izin/Sakit');
        document.getElementById('status-alfa').onclick = () => handleAbsen('Alfa');
        
        document.getElementById('apply-filter').onclick = applyDateFilter;
        document.getElementById('reset-filter').onclick = resetDateFilter;
        document.getElementById('search-nama').oninput = (e) => renderLog(e.target.value);
        document.getElementById('export-json').onclick = exportToJSON;
        document.getElementById('close-preview').onclick = () => {
            document.getElementById('preview-modal').style.display = 'none';
        };
        
        // Auto sync
        setInterval(loadDataFromCloud, 10000);
        console.log('✅ Absensi Module Loaded');
        
    } catch (e) {
        console.error('❌ Absensi Module Error:', e);
        showToast('Error loading module. Check console.', 3000);
    }
}

function handleAbsen(status) {
    const select = document.getElementById('pilih-siswa');
    if (!select || !select.value) {
        showToast('Pilih nama siswa dulu!', 2000);
        return;
    }
    
    tambahAbsen(select.value, status).then(success => {
        if (success) {
            select.value = '';
            renderLog();
        }
    });
}

function renderStatsForDate() {
    const dataToday = absensiData.filter(item => item.tanggal === currentFilterDate);
    const hadirCount = dataToday.filter(item => item.status === 'Hadir').length;
    const uniqueSiswa = new Set(dataToday.map(item => item.nama.toLowerCase())).size;
    const persen = TOTAL_SISWA_TETAP ? Math.round((uniqueSiswa / TOTAL_SISWA_TETAP) * 100) : 0;
    
    const statHadir = document.getElementById('stat-hadir');
    const statUnik = document.getElementById('stat-unik');
    const statPersen = document.getElementById('stat-persen');
    
    if (statHadir) statHadir.textContent = hadirCount;
    if (statUnik) statUnik.innerHTML = `${uniqueSiswa} / ${TOTAL_SISWA_TETAP}`;
    if (statPersen) statPersen.textContent = `${persen}%`;
    
    const filterInfo = document.getElementById('filter-info');
    if (filterInfo) filterInfo.textContent = `Data ${formatTanggalIndo(currentFilterDate)}`;
}

function renderRanking7Hari() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    
    const weekData = absensiData.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate >= weekAgo && item.status === 'Hadir';
    });
    
    const countMap = {};
    weekData.forEach(item => {
        const nameLow = item.nama.toLowerCase();
        countMap[nameLow] = (countMap[nameLow] || 0) + 1;
    });
    
    const sorted = Object.entries(countMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count], i) => ({
            name: DAFTAR_SISWA.find(s => s.toLowerCase() === name) || name,
            count,
            medal: ['🥇','🥈','🥉','📌','📌'][i]
        }));
    
    const rankDiv = document.getElementById('ranking-7hari');
    if (!rankDiv) return;
    
    rankDiv.innerHTML = sorted.length ? 
        sorted.map(r => `<div class="rank-item">${r.medal} <strong>${r.name}</strong> - ${r.count}x</div>`).join('') :
        '<div class="empty-rank">No data 7 days</div>';
}

function applyDateFilter() {
    currentFilterDate = document.getElementById('filter-tanggal').value || getTodayISO();
    renderLog();
    renderStatsForDate();
}

function resetDateFilter() {
    currentFilterDate = getTodayISO();
    document.getElementById('filter-tanggal').value = currentFilterDate;
    renderLog();
    renderStatsForDate();
}

function formatTanggalIndo(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function exportToJSON() {
    const data = absensiData.map(item => ({
        nama: item.nama,
        tanggal: item.tanggal,
        waktu: item.waktu,
        status: item.status
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xiphorix_absensi_${getTodayISO()}.json`;
    a.click();
    showToast('JSON exported!');
}

// ==================== FUNGSI UNTUK MOOD (JADWAL) ====================
async function loadMoodFromCloud() {
    try {
        const response = await fetch(`${NEW_GAS_URL}?action=getMood`);
        const data = await response.json();
        if (data && !data.error) {
            const today = new Date().toLocaleDateString('en-CA');
            const todayMood = data.find(m => m.tanggal === today);
            if (todayMood) return { happy: todayMood.happy || 0, stress: todayMood.stress || 0 };
            return { happy: 0, stress: 0 };
        }
        return { happy: 0, stress: 0 };
    } catch (e) {
        console.warn("Mood cloud failed", e);
        // lokal fallback
        const stored = localStorage.getItem('xiphorix_mood');
        return stored ? JSON.parse(stored) : { happy: 0, stress: 0 };
    }
}

async function addMoodToCloud(type) {
    try {
        await fetch(NEW_GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'addMood', type: type })
        });
        // Update lokal
        let mood = await loadMoodFromCloud();
        mood[type]++;
        localStorage.setItem('xiphorix_mood', JSON.stringify(mood));
        return true;
    } catch (e) {
        console.error("Mood save failed", e);
        return false;
    }
}

// ==================== FUNGSI UNTUK TUGAS ====================
async function loadTugasFromCloud() {
    try {
        const response = await fetch(`${NEW_GAS_URL}?action=getTugas`);
        const data = await response.json();
        if (data && !data.error) {
            localStorage.setItem('xiphorix_tugas', JSON.stringify(data));
            return data;
        }
        const stored = localStorage.getItem('xiphorix_tugas');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.warn("Tugas cloud failed", e);
        const stored = localStorage.getItem('xiphorix_tugas');
        return stored ? JSON.parse(stored) : [];
    }
}

async function addTugasToCloud(tugas) {
    try {
        await fetch(NEW_GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'addTugas', ...tugas })
        });
        // Simpan lokal
        let local = await loadTugasFromCloud();
        local.push(tugas);
        localStorage.setItem('xiphorix_tugas', JSON.stringify(local));
        return true;
    } catch (e) {
        console.error("Tugas add failed", e);
        return false;
    }
}

async function deleteTugasFromCloud(id) {
    try {
        await fetch(NEW_GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'deleteTugas', id: id })
        });
        let local = await loadTugasFromCloud();
        local = local.filter(t => t.id !== id);
        localStorage.setItem('xiphorix_tugas', JSON.stringify(local));
        return true;
    } catch (e) {
        console.error("Tugas delete failed", e);
        return false;
    }
}


window.addEventListener('load', () => {
    console.log('🌟 XIPHORIX Loaded - Page:', document.title);
    
    initCommonUI();
    
    // Page detection
    if (document.getElementById('auth-modal')) {
        console.log('📋 Absensi page detected');
        initAbsensiPage();
    }
    
    console.log('✅ Init complete');
});
