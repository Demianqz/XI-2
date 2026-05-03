// Daftar mata pelajaran berdasarkan jadwal
const DAFTAR_MAPEL = [
    "Upacara", "BIG WA", "MTK MIN", "BK", "PAI", "BI", "MULOK", "PJOK",
    "FIS", "BIO", "SEJ WA", "KIM", "MTK WA", "SENI", "PPKN", "PKWU"
];

// Key localStorage untuk tugas
const TUGAS_KEY = 'xiphorix_tugas';

let daftarTugas = [];

// Load data
function loadTugas() {
    const stored = localStorage.getItem(TUGAS_KEY);
    daftarTugas = stored ? JSON.parse(stored) : [];
    renderTugas();
}

// Simpan
function saveTugas() {
    localStorage.setItem(TUGAS_KEY, JSON.stringify(daftarTugas));
}

// Tambah tugas
function tambahTugas(mapel, deskripsi, tanggal) {
    if (!mapel || !deskripsi || !tanggal) {
        showToast('⚠️ Semua field harus diisi!', 2000);
        return false;
    }
    const newTugas = {
        id: Date.now(),
        mapel: mapel,
        deskripsi: deskripsi,
        tanggal: tanggal,
        createdAt: new Date().toISOString()
    };
    daftarTugas.push(newTugas);
    saveTugas();
    renderTugas();
    showToast('✅ Tugas berhasil ditambahkan!', 2000);
    return true;
}

// Hapus tugas
function hapusTugas(id) {
    if(confirm('Hapus tugas ini?')) {
        daftarTugas = daftarTugas.filter(t => t.id !== id);
        saveTugas();
        renderTugas();
        showToast('🗑️ Tugas dihapus', 1500);
    }
}

// Render tabel dengan filter
let currentFilterMapel = 'all';

function renderTugas() {
    let filtered = [...daftarTugas];
    if (currentFilterMapel !== 'all') {
        filtered = filtered.filter(t => t.mapel === currentFilterMapel);
    }
    // Urutkan berdasarkan tanggal terdekat (ascending)
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
            <td>${escapeHtml(tugas.mapel)}</td>
            <td>${escapeHtml(tugas.deskripsi)}</td>
            <td>${formatTanggalIndo(tugas.tanggal)}</td>
            <td><button class="btn-hapus" data-id="${tugas.id}">🗑️ Hapus</button></td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
    // Event hapus
    document.querySelectorAll('.btn-hapus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.getAttribute('data-id'));
            hapusTugas(id);
        });
    });
}

function formatTanggalIndo(tglISO) {
    if (!tglISO) return '-';
    const [y,m,d] = tglISO.split('-');
    return `${d}/${m}/${y}`;
}

function populateMapelDropdown() {
    const selectTugas = document.getElementById('mapel-tugas');
    const filterSelect = document.getElementById('filter-mapel');
    if (selectTugas) {
        selectTugas.innerHTML = '<option value="">-- Pilih Mapel --</option>';
        DAFTAR_MAPEL.forEach(mapel => {
            selectTugas.innerHTML += `<option value="${mapel}">${mapel}</option>`;
        });
    }
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="all">Semua Mapel</option>';
        DAFTAR_MAPEL.forEach(mapel => {
            filterSelect.innerHTML += `<option value="${mapel}">${mapel}</option>`;
        });
    }
}

// Inisialisasi halaman tugas
function initTugasPage() {
    populateMapelDropdown();
    loadTugas();
    
    document.getElementById('btn-tambah-tugas').onclick = () => {
        const mapel = document.getElementById('mapel-tugas').value;
        const deskripsi = document.getElementById('deskripsi-tugas').value.trim();
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
    // Clock
    setInterval(() => {
        const clock = document.getElementById('tugas-clock');
        if(clock) clock.innerText = new Date().toLocaleTimeString('id-ID');
    }, 1000);
}

// Eksekusi saat halaman tugas siap
if(document.title.includes("Tugas Kelas")) {
    window.addEventListener('DOMContentLoaded', initTugasPage);
} else {
    // Jika dipanggil dari luar, tetap jalankan
    if(document.getElementById('tugas-table')) initTugasPage();
}