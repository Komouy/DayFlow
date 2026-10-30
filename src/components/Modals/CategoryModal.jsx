import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CATEGORY_PALETTE } from '../../services/state';
import InfoTooltip from '../Common/InfoTooltip';
import { X, Plus, Trash2 } from 'lucide-react';

export default function CategoryModal() {
  const { categoryModal, closeAllModals, categories, addCategory, deleteCategory } = useApp();
  const { isOpen } = categoryModal;

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_PALETTE[0]);

  if (!isOpen) return null;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = addCategory({ name: name.trim(), color: selectedColor });
    if (ok) {
      setName('');
    }
  };

  return (
    <div className="modal-overlay open" role="dialog" aria-modal="true">
      <div className="bottom-sheet modal-content-wrap">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-title-with-tooltip">
            <h3 className="sheet-title">Kelola Kategori</h3>
            <InfoTooltip
              title="Kategori Kegiatan"
              text="Kategori mempermudah membedakan jenis kegiatan dengan kode warna pada agenda."
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={closeAllModals}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAdd} className="modal-form-clean">
          <div className="form-group">
            <label className="form-label" htmlFor="cat-name">Nama Kategori Baru</label>
            <input
              type="text"
              id="cat-name"
              className="input-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kategori"
              maxLength={20}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pilih Warna</label>
            <div className="category-color-picker-grid">
              {CATEGORY_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch-btn ${selectedColor === color ? 'is-selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Pilih warna ${color}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
            <Plus size={14} />
            <span>Tambah Kategori</span>
          </button>
        </form>

        {/* Existing Categories List */}
        <div className="category-list-section">
          <label className="form-label">Daftar Kategori Aktif</label>
          <div className="category-chips-list">
            {categories.map((cat) => (
              <div key={cat.id} className="category-manage-item">
                <div className="category-manage-info">
                  <span className="cat-color-dot" style={{ backgroundColor: cat.color }} />
                  <span className="category-name">{cat.name}</span>
                </div>
                {!cat.isDefault && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-icon text-danger"
                    onClick={() => deleteCategory(cat.id)}
                    title="Hapus Kategori"
                    aria-label={`Hapus ${cat.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
