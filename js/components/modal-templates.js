/**
 * DayFlow Modular Modal Templates
 * Dynamically mounted at runtime into #modals-root.
 * Keeps index.html lightweight, clean, and organized.
 */

import { renderIcons } from '../icons.js';

export const MODALS_HTML = `
    <!-- Modal: Tambah/Edit Jadwal (Bottom-sheet) -->
    <div id="modal-schedule" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3 class="sheet-title" id="modal-schedule-title">Tambah Jadwal Baru</h3>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup">
            <span data-icon="x" data-icon-size="18"></span>
          </button>
        </div>

        <form id="schedule-form" class="modal-form-clean">
          <!-- 1. Nama Kegiatan -->
          <div class="form-group">
            <label class="form-label" for="sch-input-title">Nama Kegiatan</label>
            <input type="text" id="sch-input-title" class="input-control" placeholder="Tuliskan nama kegiatan..." required>
          </div>

          <!-- Deskripsi Singkat (Opsional) -->
          <div class="form-group">
            <label class="form-label" for="sch-input-description">Deskripsi Singkat (Opsional)</label>
            <input type="text" id="sch-input-description" class="input-control" placeholder="Contoh: Gedung Saintek 3S.1, bab 2, link zoom..." maxlength="120">
          </div>

          <!-- 2. Tanggal & Waktu Mulai (Grid 2 Kolom) -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-label" for="sch-input-date">Tanggal</label>
              <input type="date" id="sch-input-date" class="input-control" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="sch-input-time">Waktu Mulai</label>
              <input type="time" id="sch-input-time" class="input-control" required>
            </div>
          </div>

          <!-- 3. Durasi Kegiatan (Segmented Pill Strip) -->
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="form-label" style="margin-bottom:0;">Durasi Kegiatan</label>
              <span class="text-orange tabular-nums" style="font-size:12px; font-weight:600;" id="sch-duration-label">30 menit</span>
            </div>
            <div class="quick-duration-pills" id="duration-quick-selector">
              <button type="button" class="duration-pill" data-min="15">15m</button>
              <button type="button" class="duration-pill active" data-min="30">30m</button>
              <button type="button" class="duration-pill" data-min="45">45m</button>
              <button type="button" class="duration-pill" data-min="60">60m</button>
              <button type="button" class="duration-pill" data-min="90">90m</button>
            </div>
            <input type="hidden" id="sch-input-duration" value="30">
          </div>

          <!-- 4. Pengaturan Lanjutan (Progressive Disclosure) -->
          <details id="sch-advanced-options" class="advanced-options-details">
            <summary class="advanced-options-summary">
              <span style="display:inline-flex; align-items:center; gap:8px;">
                <span data-icon="sliders" data-icon-size="14"></span>
                <span>Opsi Tambahan (Kategori, Prioritas & Pengingat)</span>
              </span>
              <span class="advanced-summary-chevron" data-icon="chevron-down" data-icon-size="14"></span>
            </summary>
            <div class="advanced-options-body">
              <!-- Kategori Agenda -->
              <div class="form-group">
                <label class="form-label" style="margin-bottom:6px;">Kategori</label>
                <div class="category-radio-grid" id="sch-category-radio-group">
                  <label class="category-radio-item">
                    <input type="radio" name="sch-category-radio" value="Kerja" checked>
                    <span class="category-radio-badge">
                      <span class="category-indicator dot-kerja"></span>
                      Kerja
                    </span>
                  </label>
                  <label class="category-radio-item">
                    <input type="radio" name="sch-category-radio" value="Fokus">
                    <span class="category-radio-badge">
                      <span class="category-indicator dot-fokus"></span>
                      Fokus
                    </span>
                  </label>
                  <label class="category-radio-item">
                    <input type="radio" name="sch-category-radio" value="Pribadi">
                    <span class="category-radio-badge">
                      <span class="category-indicator dot-pribadi"></span>
                      Pribadi
                    </span>
                  </label>
                  <label class="category-radio-item">
                    <input type="radio" name="sch-category-radio" value="Kesehatan">
                    <span class="category-radio-badge">
                      <span class="category-indicator dot-kesehatan"></span>
                      Kesehatan
                    </span>
                  </label>
                </div>
              </div>

              <!-- Tingkat Prioritas -->
              <div class="form-group">
                <label class="form-label" style="margin-bottom:6px;">Prioritas</label>
                <div class="priority-radio-grid" id="sch-priority-radio-group">
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-priority-radio" value="high">
                    <span class="priority-radio-badge">
                      <span class="priority-indicator" style="width:6px; height:6px; border-radius:50%; background:#ef4444;"></span>
                      Tinggi (P1)
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-priority-radio" value="medium" checked>
                    <span class="priority-radio-badge">
                      <span class="priority-indicator" style="width:6px; height:6px; border-radius:50%; background:#f59e0b;"></span>
                      Sedang (P2)
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-priority-radio" value="low">
                    <span class="priority-radio-badge">
                      <span class="priority-indicator" style="width:6px; height:6px; border-radius:50%; background:#9ca3af;"></span>
                      Rendah (P3)
                    </span>
                  </label>
                </div>
              </div>

              <!-- Perulangan Jadwal (Recurrence) -->
              <div class="form-group">
                <label class="form-label" style="margin-bottom:6px;">Ulangi Jadwal</label>
                <div class="priority-radio-grid" id="sch-recurrence-radio-group" style="grid-template-columns: repeat(3, 1fr); gap:6px;">
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="none" checked>
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Hanya Sekali
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="daily">
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Setiap Hari
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="weekdays">
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Hari Kerja (Sen-Jum)
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="weekly">
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Mingguan
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="monthly">
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Bulanan
                    </span>
                  </label>
                </div>
              </div>

              <!-- Tenggat & Pengingat -->
              <div class="modal-subcard">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" for="sch-input-deadline" style="font-size:12px; margin-bottom:4px;">Tenggat Waktu / Deadline (Opsional)</label>
                  <input type="date" id="sch-input-deadline" class="input-control" style="min-height:36px; height:36px; font-size:12px;">
                </div>
                <div class="settings-row" style="margin-top:10px; padding-top:8px; border-top:1px solid var(--border-subtle);">
                  <div class="settings-row-text">
                    <span class="settings-row-title" style="font-size:12.5px;">Pengingat Otomatis</span>
                    <span class="settings-row-desc" style="font-size:11px;">Notifikasi & bel sebelum waktu mulai</span>
                  </div>
                  <label class="toggle-switch" for="sch-toggle-reminder" aria-label="Aktifkan Pengingat">
                    <input type="checkbox" id="sch-toggle-reminder" checked class="toggle-input">
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </details>

          <!-- Action Buttons -->
          <div style="display:flex; gap:10px; margin-top:4px;">
            <button type="button" class="btn btn-secondary" onclick="window.dayflowApp.closeAllModals()" style="flex:1;">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" style="flex:2;">
              Simpan Jadwal
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Tambah/Edit Catatan (Bottom-sheet) -->
    <div id="modal-note" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3 class="sheet-title" id="modal-note-title">Catatan Baru</h3>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup">
            <span data-icon="x" data-icon-size="18"></span>
          </button>
        </div>

        <form id="note-form" style="display:flex; flex-direction:column; gap:14px;">
          <div class="form-group">
            <label class="form-label" for="note-input-title">Judul Catatan (Opsional)</label>
            <input type="text" id="note-input-title" class="input-control" placeholder="Judul ide atau memo...">
          </div>

          <div class="form-group">
            <label class="form-label" for="note-input-content">Isi Catatan</label>
            <textarea id="note-input-content" class="input-control textarea-control" style="min-height:140px;" placeholder="Tuliskan catatanmu di sini..." required></textarea>
          </div>

          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-secondary" onclick="window.dayflowApp.closeAllModals()" style="flex:1;">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" style="flex:2;">
              Simpan Catatan
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Konfirmasi Aksi (Custom Alert/Confirm Dialog) -->
    <div id="modal-confirm" class="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-title" aria-describedby="confirm-modal-desc">
      <div class="bottom-sheet confirm-sheet">
        <div class="confirm-icon-wrap" id="confirm-modal-icon-wrap">
          <span data-icon="alert" data-icon-size="22" id="confirm-modal-icon"></span>
        </div>
        <h3 class="sheet-title" id="confirm-modal-title" style="text-align:center; font-size:16px;">Konfirmasi Tindakan</h3>
        <p class="text-muted" id="confirm-modal-desc" style="text-align:center; font-size:13px; line-height:1.5;">Apakah Anda yakin?</p>
        <div style="display:flex; gap:10px; width:100%; margin-top:8px;">
          <button type="button" class="btn btn-secondary" id="confirm-modal-btn-cancel" style="flex:1;">
            Batal
          </button>
          <button type="button" class="btn btn-primary" id="confirm-modal-btn-accept" style="flex:1;">
            Lanjutkan
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Panduan & Tata Cara Gemini API Key -->
    <div id="modal-api-guide" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="api-guide-title">
      <div class="bottom-sheet" style="max-width:540px; max-height:85vh; overflow-y:auto;">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div>
            <h3 class="sheet-title" id="api-guide-title">Tata Cara Menggunakan Gemini API Key</h3>
            <p class="text-xs text-muted" style="margin-top:2px;">Panduan 4 langkah mudah dari Google AI Studio ke DayFlow</p>
          </div>
          <button type="button" class="btn btn-ghost btn-xs btn-icon btn-close-modal" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup Panduan">
            <span data-icon="x" data-icon-size="16"></span>
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
          <!-- Step 1 -->
          <div class="step-card" style="padding:14px; gap:8px; border-radius:var(--radius-md);">
            <div class="step-card-header">
              <div class="step-number-badge" style="width:26px; height:26px; font-size:13px;">1</div>
              <span class="step-card-title" style="font-size:14px;">Buka Google AI Studio</span>
            </div>
            <p class="text-secondary" style="font-size:12.5px; line-height:1.5; padding-left:38px;">
              Buka portal resmi Google AI Studio dan masuk menggunakan akun Google / Gmail Anda.
            </p>
            <div style="padding-left:38px;">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="btn btn-secondary btn-xs" style="text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
                Buka Google AI Studio
                <span data-icon="arrowUpRight" data-icon-size="12"></span>
              </a>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="step-card" style="padding:14px; gap:8px; border-radius:var(--radius-md);">
            <div class="step-card-header">
              <div class="step-number-badge" style="width:26px; height:26px; font-size:13px;">2</div>
              <span class="step-card-title" style="font-size:14px;">Klik "Create API Key"</span>
            </div>
            <p class="text-secondary" style="font-size:12.5px; line-height:1.5; padding-left:38px;">
              Klik tombol biru bertuliskan <b>"Create API key"</b>. Pilih opsi default <i>Create API key in default project</i> (100% gratis tanpa kartu kredit).
            </p>
          </div>

          <!-- Step 3 -->
          <div class="step-card" style="padding:14px; gap:8px; border-radius:var(--radius-md);">
            <div class="step-card-header">
              <div class="step-number-badge" style="width:26px; height:26px; font-size:13px;">3</div>
              <span class="step-card-title" style="font-size:14px;">Salin (Copy) Kunci API</span>
            </div>
            <p class="text-secondary" style="font-size:12.5px; line-height:1.5; padding-left:38px;">
              Klik tombol <b>Copy</b> pada kunci yang muncul. Kunci API diawali dengan teks <code>AQ.</code>.
            </p>
          </div>

          <!-- Step 4 -->
          <div class="step-card" style="padding:14px; gap:8px; border-radius:var(--radius-md);">
            <div class="step-card-header">
              <div class="step-number-badge" style="width:26px; height:26px; font-size:13px;">4</div>
              <span class="step-card-title" style="font-size:14px;">Tempel ke Input DayFlow & Simpan</span>
            </div>
            <p class="text-secondary" style="font-size:12.5px; line-height:1.5; padding-left:38px;">
              Tempelkan (<i>paste</i>) kode ke kolom <b>Gemini API Key</b> di bawah, tekan <b>Uji Koneksi Key</b>, lalu klik <b>Simpan Pengaturan</b>.
            </p>
          </div>

          <!-- Footer Actions in Modal -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding-top:10px; border-top:1px solid var(--border-subtle); flex-wrap:wrap; gap:8px;">
            <a href="/panduan-api.html" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="font-size:12px; text-decoration:none;">
              <span data-icon="file-text" data-icon-size="14"></span>
              Buka Halaman Dokumen Penuh
              <span data-icon="arrowUpRight" data-icon-size="12"></span>
            </a>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.dayflowApp.closeAllModals()">
              Saya Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Kelola & Tambah Kategori (Bottom-sheet) -->
    <div id="modal-category" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-category-title">
      <div class="bottom-sheet" style="max-width:500px; max-height:85vh; overflow-y:auto;">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div>
            <h3 class="sheet-title" id="modal-category-title">Kelola Kategori Jadwal</h3>
            <p class="text-xs text-muted" style="margin-top:2px;">Buat kategori baru atau hapus kategori kustom</p>
          </div>
          <button type="button" class="btn btn-ghost btn-xs btn-icon btn-close-modal" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup Kelola Kategori">
            <span data-icon="x" data-icon-size="16"></span>
          </button>
        </div>

        <!-- Form Tambah Kategori Baru -->
        <form id="category-create-form" style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="cat-input-name" style="font-size:12px; margin-bottom:4px;">Nama Kategori Baru</label>
            <input type="text" id="cat-input-name" class="input-control" placeholder="Contoh: Kuliah, Olahraga, Belajar..." required style="min-height:38px; height:38px; font-size:13px;">
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:12px; margin-bottom:4px;">Pilih Warna Indikator</label>
            <div class="color-picker-grid" id="cat-color-picker">
              <!-- Populated dynamically -->
            </div>
            <input type="hidden" id="cat-input-color" value="#f97316">
          </div>

          <button type="submit" class="btn btn-primary btn-sm" style="width:100%; margin-top:4px;">
            <span data-icon="plus" data-icon-size="14"></span>
            Simpan Kategori Baru
          </button>
        </form>

        <!-- Daftar Kategori Aktif -->
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--border-subtle);">
          <div class="form-label" style="font-size:12px; margin-bottom:8px;">Daftar Kategori Aktif</div>
          <div class="category-manage-list" id="category-manage-list">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Share Schedule / Daily Agenda -->
    <div id="modal-share-schedule" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-share-title">
      <div class="bottom-sheet" style="max-width:540px; max-height:85vh; overflow-y:auto;">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div>
            <h3 class="sheet-title" id="modal-share-title">Bagikan Agenda Harian</h3>
            <p class="text-xs text-muted" id="modal-share-subtitle" style="margin-top:2px;">Agenda untuk Hari Ini</p>
          </div>
          <button type="button" class="btn btn-ghost btn-xs btn-icon btn-close-modal" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup Dialog Berbagi">
            <span data-icon="x" data-icon-size="16"></span>
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span class="text-xs text-muted">Format teks siap kirim ke WhatsApp atau Slack</span>
            <span class="badge-tag" id="share-item-count">0 kegiatan</span>
          </div>

          <textarea id="share-text-preview" class="input-control" rows="8" style="font-family:var(--font-mono); font-size:12px; line-height:1.5; resize:vertical;" readonly></textarea>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="btn btn-primary btn-sm" id="btn-send-whatsapp">
              <span data-icon="share" data-icon-size="14"></span>
              Kirim ke WhatsApp
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-copy-share-text">
              <span data-icon="copy" data-icon-size="14"></span>
              Salin Teks Agenda
            </button>
          </div>

          <div style="padding-top:10px; border-top:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:8px;">
            <span class="text-xs text-muted">Sinkronisasi Kalender Eksternal:</span>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-download-ics">
                <span data-icon="calendar" data-icon-size="14"></span>
                Unduh File .ICS
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-open-first-gcal">
                <span data-icon="external-link" data-icon-size="14"></span>
                Google Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    <!-- Modal: AI Schedule Conflict Resolver (Bottom-sheet) -->
    <div id="modal-conflict-resolver" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="text-orange" data-icon="sliders" data-icon-size="18"></span>
            <h3 class="sheet-title">Rekomendasi Penataan Jadwal</h3>
          </div>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup">
            <span data-icon="x" data-icon-size="18"></span>
          </button>
        </div>

        <div class="modal-form-clean" style="gap:14px;">
          <p class="text-xs text-secondary" style="margin:0; line-height:1.5;">
            AI telah menganalisis prioritas dan slot waktu luang tanpa menabrak agenda lain. Tinjau penyesuaian waktu berikut:
          </p>

          <div id="conflict-solutions-list" class="conflict-solutions-list">
            <!-- Injected via schedule-view.js -->
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.dayflowApp.closeAllModals()">
              Batal
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-apply-conflict-solutions">
              <span data-icon="check" data-icon-size="14"></span>
              Terapkan Jadwal Baru
            </button>
          </div>
        </div>
      </div>
    </div>
`;

export function mountModals() {
  let root = document.getElementById('modals-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modals-root';
    document.body.appendChild(root);
  }
  if (!root.innerHTML || root.innerHTML.trim() === '') {
    root.innerHTML = MODALS_HTML;
    renderIcons(root);
  }
}
