import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api.js';

const TYPE_ACCEPT = {
  image:    'image/*',
  video:    'video/*',
  audio:    'audio/*',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',
};

const TYPE_ICON = {
  image: 'image', video: 'videocam', audio: 'mic', document: 'description',
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPicker({ mediaType, value, onChange }) {
  const [open, setOpen]         = useState(false);
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError]       = useState('');
  const fileRef = useRef(null);

  const selectedItem = items.find(i => i.url === value);

  async function fetchMedia() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/wasender/media');
      setItems((res.data || []).filter(i => i.mediaType === mediaType));
    } catch {
      setError('Failed to load media library');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) fetchMedia(); }, [open, mediaType]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/wasender/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.mediaType === mediaType) {
        setItems(prev => [res.data, ...prev]);
        onChange(res.data.url);
        setOpen(false);
      } else {
        setError(`Uploaded file is detected as "${res.data.mediaType}", expected "${mediaType}"`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(item, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${item.fileName}"? This cannot be undone.`)) return;
    setDeleting(item._id);
    try {
      await api.delete(`/wasender/media/${item._id}`);
      setItems(prev => prev.filter(i => i._id !== item._id));
      if (value === item.url) onChange('');
    } catch {
      setError('Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 border-2 border-dashed border-slate-300 rounded-xl px-4 py-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        {selectedItem ? (
          <>
            <span className="material-symbols-outlined text-blue-500 text-[22px]">{TYPE_ICON[mediaType]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{selectedItem.fileName}</p>
              <p className="text-[11px] text-slate-400">{formatSize(selectedItem.size)} · Click to change</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="text-slate-400 hover:text-red-500"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-slate-400 text-[22px]">{TYPE_ICON[mediaType]}</span>
            <div>
              <p className="text-sm font-semibold text-slate-600">Choose {mediaType}</p>
              <p className="text-[11px] text-slate-400">Select from library or upload new</p>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 capitalize">{mediaType} Library</h3>
                <p className="text-xs text-slate-400 mt-0.5">Files are uploaded to Cloudinary and linked to WhatsApp messages</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
              <input ref={fileRef} type="file" accept={TYPE_ACCEPT[mediaType]} className="hidden" onChange={handleUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#137fec] px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">{uploading ? 'progress_activity' : 'upload'}</span>
                {uploading ? 'Uploading…' : `Upload ${mediaType}`}
              </button>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm gap-2">
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>Loading…
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                  <span className="material-symbols-outlined text-[36px]">{TYPE_ICON[mediaType]}</span>
                  <p className="text-sm">No {mediaType}s uploaded yet</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map(item => (
                  <div
                    key={item._id}
                    onClick={() => { onChange(item.url); setOpen(false); }}
                    className={`relative group rounded-xl border-2 cursor-pointer transition-all overflow-hidden
                      ${value === item.url ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-400'}`}
                  >
                    {mediaType === 'image' ? (
                      <img src={item.url} alt={item.fileName} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 flex flex-col items-center justify-center bg-slate-50 gap-1">
                        <span className="material-symbols-outlined text-slate-400 text-[32px]">{TYPE_ICON[mediaType]}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">{mediaType}</span>
                      </div>
                    )}
                    <div className="px-2 py-1.5 border-t border-slate-100">
                      <p className="text-[11px] font-medium text-slate-700 truncate">{item.fileName}</p>
                      <p className="text-[10px] text-slate-400">{formatSize(item.size)}</p>
                    </div>
                    {value === item.url && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-500 rounded-full p-0.5">
                        <span className="material-symbols-outlined text-white text-[14px]">check</span>
                      </div>
                    )}
                    <button
                      onClick={e => handleDelete(item, e)}
                      disabled={deleting === item._id}
                      className="absolute top-1.5 left-1.5 bg-white/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">{deleting === item._id ? 'progress_activity' : 'delete'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
