// ==================== CONFIGURATION ====================
const scriptURL = "https://script.google.com/macros/s/AKfycbyarN6zSYcmIFtMLN2-M_4_DOgtlO-i45E36I21upbg32k8GLwoTuEc6i1VRx58drB63A/exec";

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

// ==================== GLOBAL SETTINGS ====================
let absensiData = [];
const STORAGE_KEY = 'xiphorix_absensi';
let currentFilterDate = new Date().toLocaleDateString('en-CA');

// ==================== CORE FUNCTIONS (SINKRONISASI) ====================

async function loadDataFromCloud() {
    try {
        const response = await fetch(scriptURL);
        const data = await response.json();
        absensiData = data;
        saveDataLocally();
        refreshAllUI();
    } catch (e) {
        console.warn("Gagal ambil data cloud, menggunakan backup lokal.");
        loadDataLocally();
    }
}

async function syncToSheets(nama, status, waktu) {
    try {
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ "nama": nama, "status": status, "waktu": waktu }),
            headers: { 'Content-Type': 'application/json' }
        });
        return true;
    } catch (error) {
        console.error('Koneksi database gagal:', error);
        return false;
    }
}

function saveDataLocally() { localStorage.setItem(STORAGE_KEY, JSON.stringify(absensiData)); }
function loadDataLocally() {
    const stored = localStorage.getItem(STORAGE_KEY);
    absensiData = stored ? JSON.parse(stored) : [];
}

function getTodayISO() { return new Date().toLocaleDateString('en-CA'); }
function getTanggalIndonesia() {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function cekAbsenHariIni(nama, tanggal) {
    return absensiData.some(item => item.tanggal === tanggal && item.nama.toLowerCase().trim() === nama.toLowerCase().trim());
}

function isValidSiswa(nama) {
    return DAFTAR_SISWA.some(s => s.toLowerCase() === nama.toLowerCase().trim());
}

// ==================== FITUR UPLOAD BUKTI ====================
function uploadBukti() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) { resolve(null); return; }
            if (file.size > 2 * 1024 * 1024) {
                showToast('Ukuran file maksimal 2MB!', 2000);
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.onerror = () => reject('Gagal membaca file');
            reader.readAsDataURL(file);
        };
        input.click();
    });
}

// ==================== LOGIKA ABSENSI ====================
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

    let bukti = null;
    if (statusKehadiran === 'Izin/Sakit') {
        showToast('📎 Silakan pilih foto bukti (max 2MB)', 1500);
        bukti = await uploadBukti();
        if (!bukti) {
            showToast('Izin/Sakit wajib upload bukti!', 2000);
            return false;
        }
    }

    const waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    showToast('⏳ Menghubungkan ke Database Pusat...', 3000);
    
    await syncToSheets(nama, statusKehadiran, waktuSekarang);

    const newEntry = {
        nama: nama.trim(),
        tanggal: today,
        waktu: waktuSekarang,
        status: statusKehadiran,
        bukti: bukti || null,
        timestamp: Date.now()
    };

    absensiData.push(newEntry);
    saveDataLocally();
    showToast(`✅ ${nama} BERHASIL DISIMPAN`, 2500);
    return true;
}

// ==================== UI RENDERING ====================
function renderLog(filterNama = '') {
    const filteredByDate = absensiData.filter(item => item.tanggal === currentFilterDate);
    let finalData = filteredByDate;
    
    if (filterNama.trim() !== '') {
        finalData = finalData.filter(item => item.nama.toLowerCase().includes(filterNama.toLowerCase()));
    }
    
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (finalData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Tidak ada data untuk tanggal ini</td></tr>';
        return;
    }

    finalData.forEach((item, idx) => {
        const buktiHtml = item.bukti ? `<button class="btn-view-bukti" data-bukti="${item.bukti}">📎 Lihat</button>` : '-';
        const row = `<tr>
                        <td>${idx+1}</td>
                        <td>${escapeHtml(item.nama)}</td>
                        <td>${item.waktu}</td>
                        <td>${item.status}</td>
                        <td>${buktiHtml}</td>
                     </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
    
    document.querySelectorAll('.btn-view-bukti').forEach(btn => {
        btn.addEventListener('click', () => {
            const buktiData = btn.getAttribute('data-bukti');
            document.getElementById('preview-image').src = buktiData;
            document.getElementById('preview-modal').style.display = 'flex';
        });
    });
}

function renderStatsForDate() {
    const dataToday = absensiData.filter(item => item.tanggal === currentFilterDate);
    const hadirCount = dataToday.filter(item => item.status === "Hadir").length;
    const uniqueSiswa = new Set(dataToday.map(i => i.nama.toLowerCase())).size;
    const persen = Math.round((uniqueSiswa / TOTAL_SISWA_TETAP) * 100);
    
    if(document.getElementById('stat-hadir')) document.getElementById('stat-hadir').innerText = hadirCount;
    if(document.getElementById('stat-unik')) document.getElementById('stat-unik').innerHTML = `${uniqueSiswa} / ${TOTAL_SISWA_TETAP}`;
    if(document.getElementById('stat-persen')) document.getElementById('stat-persen').innerText = `${persen}%`;
    
    const filterInfo = document.getElementById('filter-info');
    if (filterInfo) filterInfo.innerText = `Menampilkan data untuk: ${formatTanggalIndo(currentFilterDate)}`;
}

function renderRanking7Hari() {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
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

    if (sorted.length === 0) {
        rankDiv.innerHTML = '<div class="empty-rank">Belum ada data kehadiran 7 hari terakhir</div>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉', '📌', '📌'];
    rankDiv.innerHTML = '';
    sorted.forEach(([nama, count], idx) => {
        const originalNama = DAFTAR_SISWA.find(s => s.toLowerCase() === nama) || nama;
        rankDiv.innerHTML += `<div class="rank-item">${medals[idx]} <strong>${originalNama}</strong> - ${count} x Hadir</div>`;
    });
}

// ==================== DATA MANAGEMENT ====================
function exportToJSON() {
    const dataStr = JSON.stringify(absensiData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absensi_xiphorix_${getTodayISO()}.json`;
    a.click();
    showToast('Export JSON berhasil', 1500);
}

function formatTanggalIndo(tglISO) {
    if(!tglISO) return "-";
    const [y,m,d] = tglISO.split('-');
    return `${d}/${m}/${y}`;
}

function refreshAllUI() {
    const searchVal = document.getElementById('search-nama')?.value || '';
    renderLog(searchVal);
    renderStatsForDate();
    renderRanking7Hari();
}

function showToast(msg, duration=2000) {
    const toast = document.getElementById('toast-message');
    if(toast) { 
        toast.innerText = msg; 
        toast.style.display = 'block'; 
        setTimeout(() => toast.style.display = 'none', duration); 
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

// ==================== UI INITIALIZATION ====================
function startClock() {
    setInterval(() => {
        const nowTime = new Date().toLocaleTimeString('id-ID');
        document.querySelectorAll('.live-clock').forEach(el => el.innerText = nowTime);
    }, 1000);
}

function initDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if(isDark) document.body.classList.add('dark-mode');
    document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });
    });
}

function initParticles() {
    const canvas = document.getElementById('particle-canvas') || document.getElementById('particle-canvas-abs');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth, height = window.innerHeight;
    canvas.width = width; canvas.height = height;
    let particles = [];
    for(let i=0;i<70;i++) particles.push({ x: Math.random()*width, y: Math.random()*height, radius: Math.random()*2+1, alpha: Math.random()*0.5 });
    function draw() {
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

// ==================== PAGE CONTROLLERS (FIXED AUTH) ====================
function initAbsensiPage() {
    const authModal = document.getElementById('auth-modal');
    const absMain = document.getElementById('absensi-main');
    if(!authModal) return;
    
    const isAuth = sessionStorage.getItem('xiphorix_auth') === 'true';
    if(!isAuth) {
        authModal.style.display = 'flex';
        
        document.getElementById('auth-submit').onclick = () => {
            const inputField = document.getElementById('auth-code');
            const btn = document.getElementById('auth-submit');
            const code = inputField.value;

            if(code === 'XIPHORIX2026') {
                // BENAR: HIJAU
                btn.classList.add('btn-success');
                btn.innerText = "BERHASIL!";
                setTimeout(() => {
                    sessionStorage.setItem('xiphorix_auth', 'true');
                    authModal.style.display = 'none';
                    absMain.style.display = 'block';
                    loadAbsensiModule();
                }, 800);
            } else {
                // SALAH: MERAH
                btn.classList.add('btn-error');
                btn.innerText = "SALAH!";
                showToast('Kode salah!', 1500);
                setTimeout(() => {
                    btn.classList.remove('btn-error');
                    btn.innerText = "Verifikasi";
                    inputField.value = "";
                }, 1500);
            }
        };
    } else {
        authModal.style.display = 'none';
        absMain.style.display = 'block';
        loadAbsensiModule();
    }
}

async function loadAbsensiModule() {
    loadDataFromCloud();
    populateSiswaDropdown();
    document.getElementById('full-date-indo').innerText = getTanggalIndonesia();
    document.getElementById('total-siswa-tetap').innerText = TOTAL_SISWA_TETAP;
    
    currentFilterDate = getTodayISO();
    document.getElementById('filter-tanggal').value = currentFilterDate;
    refreshAllUI();

    const handleAbsen = async (status) => {
        const select = document.getElementById('pilih-siswa');
        if (!select.value) { showToast('Pilih nama dulu!', 1500); return; }
        const success = await tambahAbsen(select.value, status);
        if (success) { select.value = ""; refreshAllUI(); }
    };

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
    document.getElementById('close-preview').onclick = () => document.getElementById('preview-modal').style.display = 'none';
    
    setInterval(loadDataFromCloud, 10000);
}

window.addEventListener('load', () => {
    startClock();
    initDarkMode();
    initParticles();
    if(document.querySelector('.home-container')) {
        const yearElem = document.getElementById('current-year');
        if(yearElem) yearElem.innerText = new Date().getFullYear();
    }
    if(document.getElementById('auth-modal')) initAbsensiPage();
});