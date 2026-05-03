// ==================== TUGAS.JS - LOCALSTORAGE ONLY (CEPAT) ====================
const DAFTAR_MAPEL = [
    "Upacara", "BIG WA", "MTK MIN", "BK", "PAI", "BI", "MULOK", "PJOK",
    "FIS", "BIO", "SEJ WA", "KIM", "MTK WA", "SENI", "PPKN", "PKWU"
];
const TUGAS_KEY = 'xiphorix_tugas';
let daftarTugas = [];
let currentFilterMapel = 'all';

function loadTugas() {
    const stored = localStorage.getItem(TUGAS_KEY);
    daftarTugas = stored ? JSON.parse(stored) : [];
    renderTugas();
}
function saveTugas() {
    localStorage.setItem(TUGAS_KEY, JSON.stringify(daftarTugas));
}
function tambahTugas(mapel, deskripsi, tanggal) {
    if (!mapel || !deskripsi.trim() || !tanggal) {
        showToast('⚠️ Semua field harus diisi!', 2000);
        return false;
    }
    const newTugas = {
        id: Date.now(),
        mapel: mapel,
        deskripsi: deskripsi.trim(),
        tanggal: tanggal,
        createdAt: new Date().toISOString()
    };
    daftarTugas.push(newTugas);
    saveTugas();
    renderTugas();
    showToast('✅ Tugas berhasil ditambahkan!', 2000);
    return true;
}
function hapusTugas(id) {
    if (confirm('Hapus tugas ini?')) {
        daftarTugas = daftarTugas.filter(t => t.id !== id);
        saveTugas();
        renderTugas();
        showToast('🗑️ Tugas dihapus', 1500);
    }
}
function renderTugas() {
    const tbody = document.getElementById('tugas-tbody');
    if (!tbody) return;
    let filtered = [...daftarTugas];
    if (currentFilterMapel !== 'all') filtered = filtered.filter(t => t.mapel === currentFilterMapel);
    filtered.sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal));
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-tugas">📭 Belum ada tugas. Tambahkan tugas baru! 📝</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map((tugas, idx) => `
        <tr>
            <td>${idx+1}</td>
            <td>${escapeHtml(tugas.mapel)}</td>
            <td>${escapeHtml(tugas.deskripsi)}</td>
            <td>${formatTanggalIndo(tugas.tanggal)}</td>
            <td><button class="btn-hapus" data-id="${tugas.id}">🗑️ Hapus</button></td>
        </tr>
    `).join('');
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
function refreshTugas() {
    loadTugas();
    showToast('🔄 Tugas dimuat ulang', 1000);
}
function initTugasPage() {
    populateMapelDropdown();
    loadTugas();
    document.getElementById('btn-tambah-tugas').onclick = () => {
        const mapel = document.getElementById('mapel-tugas').value;
        const deskripsi = document.getElementById('deskripsi-tugas').value;
        const tanggal = document.getElementById('tanggal-tugas').value;
        if (tambahTugas(mapel, deskripsi, tanggal)) {
            document.getElementById('deskripsi-tugas').value = '';
            document.getElementById('tanggal-tugas').value = '';
            document.getElementById('mapel-tugas').value = '';
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
    // Manual sync terserah user (refresh browser)
    setInterval(() => {
        const clock = document.getElementById('tugas-clock');
        if (clock) clock.textContent = new Date().toLocaleTimeString('id-ID');
    }, 1000);
}
if (document.getElementById('tugas-table')) {
    window.addEventListener('DOMContentLoaded', initTugasPage);
}
