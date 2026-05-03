// ==================== TUGAS UI - Menggunakan fungsi global dari script.js ====================
const DAFTAR_MAPEL = [
    "Upacara", "BIG WA", "MTK MIN", "BK", "PAI", "BI", "MULOK", "PJOK",
    "FIS", "BIO", "SEJ WA", "KIM", "MTK WA", "SENI", "PPKN", "PKWU"
];

let daftarTugas = [];
let currentFilterMapel = 'all';

function escapeHtmlLocal(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '<', '>': '>' }[m]));
}
function showToastLocal(msg, dur=2000) {
    if (typeof showToast === 'function') showToast(msg, dur);
    else console.log(msg);
}
function formatTanggalIndo(tglISO) {
    if (!tglISO) return '-';
    const [y,m,d] = tglISO.split('-');
    return `${d}/${m}/${y}`;
}

async function loadTugas() {
    daftarTugas = await loadTugasFromCloud();
    renderTugas();
}

async function tambahTugas(mapel, deskripsi, tanggal) {
    if (!mapel || !deskripsi || !tanggal) {
        showToastLocal('⚠️ Semua field harus diisi!', 2000);
        return false;
    }
    const newTugas = {
        id: Date.now(),
        mapel: mapel,
        deskripsi: deskripsi,
        tanggal: tanggal,
        createdAt: new Date().toISOString()
    };
    const success = await addTugasToCloud(newTugas);
    if (success) {
        daftarTugas.push(newTugas);
        renderTugas();
        showToastLocal('✅ Tugas berhasil disimpan!', 2000);
        return true;
    }
    return false;
}

async function hapusTugas(id) {
    if (confirm('Hapus tugas ini?')) {
        const success = await deleteTugasFromCloud(id);
        if (success) {
            daftarTugas = daftarTugas.filter(t => t.id !== id);
            renderTugas();
            showToastLocal('🗑️ Tugas dihapus', 1500);
        }
    }
}

function renderTugas() {
    let filtered = [...daftarTugas];
    if (currentFilterMapel !== 'all') {
        filtered = filtered.filter(t => t.mapel === currentFilterMapel);
    }
    filtered.sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal));
    
    const tbody = document.getElementById('tugas-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-tugas">📭 Belum ada tugas. Tambahkan tugas baru! 📝</td></tr>';
        return;
    }
    filtered.forEach((tugas, idx) => {
        const row = `<tr>
            <td>${idx+1}</td>
            <td>${escapeHtmlLocal(tugas.mapel)}</td>
            <td>${escapeHtmlLocal(tugas.deskripsi)}</td>
            <td>${formatTanggalIndo(tugas.tanggal)}</td>
            <td><button class="btn-hapus" data-id="${tugas.id}">🗑️ Hapus</button></td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
    document.querySelectorAll('.btn-hapus').forEach(btn => {
        btn.onclick = () => hapusTugas(parseInt(btn.getAttribute('data-id')));
    });
}

function populateMapelDropdown() {
    const selectTambah = document.getElementById('mapel-tugas');
    const filterSelect = document.getElementById('filter-mapel');
    if (selectTambah) {
        selectTambah.innerHTML = '<option value="">-- Pilih Mapel --</option>';
        DAFTAR_MAPEL.forEach(m => selectTambah.innerHTML += `<option value="${m}">${m}</option>`);
    }
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="all">Semua Mapel</option>';
        DAFTAR_MAPEL.forEach(m => filterSelect.innerHTML += `<option value="${m}">${m}</option>`);
    }
}

async function updateSyncStatus() {
    const span = document.getElementById('last-sync');
    if (span) span.textContent = new Date().toLocaleTimeString('id-ID');
}

async function refreshTugas() {
    showToastLocal('🔄 Mensinkronkan...', 1000);
    await loadTugas();
    updateSyncStatus();
}

async function initTugasPage() {
    populateMapelDropdown();
    await loadTugas();
    updateSyncStatus();
    
    document.getElementById('btn-tambah-tugas').onclick = async () => {
        const mapel = document.getElementById('mapel-tugas').value;
        const deskripsi = document.getElementById('deskripsi-tugas').value.trim();
        const tanggal = document.getElementById('tanggal-tugas').value;
        const ok = await tambahTugas(mapel, deskripsi, tanggal);
        if (ok) {
            document.getElementById('deskripsi-tugas').value = '';
            document.getElementById('tanggal-tugas').value = '';
            document.getElementById('mapel-tugas').value = '';
            updateSyncStatus();
        }
    };
    
    document.getElementById('filter-mapel').onchange = (e) => {
        currentFilterMapel = e.target.value;
        renderTugas();
    };
    document.getElementById('reset-filter-tugas').onclick = () => {
        document.getElementById('filter-mapel').value = 'all';
        currentFilterMapel = 'all';
        renderTugas();
    };
    
    setInterval(async () => {
        await loadTugas();
        updateSyncStatus();
    }, 30000);
    
    setInterval(() => {
        const clock = document.getElementById('tugas-clock');
        if(clock) clock.textContent = new Date().toLocaleTimeString('id-ID');
    }, 1000);
}

// Jalankan saat halaman tugas siap
if (document.getElementById('tugas-table')) {
    document.addEventListener('DOMContentLoaded', initTugasPage);
}

