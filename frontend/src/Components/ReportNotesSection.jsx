import React, { useState, useEffect } from 'react';
import {
  FileText, Image as ImageIcon, FileBarChart, HardDrive,
  ChevronLeft, Plus, Calendar, UploadCloud, X,
  SplitSquareHorizontal, ArrowLeft, Loader2
} from 'lucide-react';
import API from '../services/api';

const CATEGORIES = [
  { id: 'Clinical Notes', label: 'Clinical Notes', icon: FileText,     color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  { id: 'Photographs',    label: 'Photographs',    icon: ImageIcon,     color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  { id: 'Lab Reports',    label: 'Lab Reports',    icon: FileBarChart,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100'   },
  { id: 'Scans',          label: 'X-Rays & Scans', icon: HardDrive,     color: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-100'  },
];

const ReportsNotesSection = ({ patientId, refreshTrigger }) => {
  const [view, setView] = useState('DASHBOARD');
  const [activeCategory, setActiveCategory] = useState(null);

  const [data, setData] = useState({
    'Clinical Notes': [], 'Photographs': [], 'Lab Reports': [], 'Scans': []
  });
  const [loading, setLoading] = useState(true);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload form state — kept in parent so modal renders inline (no remount bug)
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Clinical Notes');

  const [selectedFile, setSelectedFile] = useState(null);
  const [compareFile, setCompareFile] = useState(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/files/patient/${patientId}`);
      // Backend returns { files: { 'Clinical Notes': [], 'Scans': [], ... } }
      const grouped = res.data.files || {
        'Clinical Notes': [], 'Photographs': [], 'Lab Reports': [], 'Scans': []
      };
      setData(grouped);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchFiles();
  }, [patientId, refreshTrigger]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!fileToUpload) return alert('Please select a file to upload.');

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('name', uploadName);
    formData.append('category', uploadCategory);
    formData.append('patient_id', patientId);

    try {
      setUploading(true);
      await API.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFileToUpload(null);
      setUploadName('');
      setIsUploadOpen(false);
      fetchFiles();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const closeUpload = () => {
    setIsUploadOpen(false);
    setFileToUpload(null);
    setUploadName('');
    setUploadCategory('Clinical Notes');
  };

  const getCategoryStats = (catId) => {
    const files = data[catId] || [];
    if (files.length === 0) return { count: 0, lastUpdated: 'Never' };
    const sorted = [...files].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    return {
      count: files.length,
      lastUpdated: new Date(sorted[0].uploaded_at).toLocaleDateString(),
    };
  };

  const handleFileClick = (file) => {
    if (view === 'COMPARE_SELECT') {
      setCompareFile(file);
      setView('COMPARE_VIEW');
    } else {
      setSelectedFile(file);
      setView('PREVIEW');
    }
  };

  // --- RENDERERS ---
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
        {CATEGORIES.map((cat) => {
          const stats = getCategoryStats(cat.id);
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setView('LIST');
              }}
              className={`p-5 rounded-xl border ${cat.border} ${cat.bg} cursor-pointer hover:shadow-md transition-all flex flex-col justify-between h-32 group relative`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 bg-white rounded-lg shadow-sm ${cat.color}`}><Icon size={20} /></div>
                <span className={`text-xs font-bold px-2 py-1 bg-white/60 rounded-full ${cat.color}`}>{stats.count} Files</span>
              </div>
              <div>
                <h4 className={`font-bold text-lg ${cat.color.replace('600', '800')}`}>{cat.label}</h4>
                <p className={`text-xs ${cat.color} opacity-70`}>Updated: {stats.lastUpdated}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFileList = (mode = 'VIEW') => {
    const category = CATEGORIES.find(c => c.id === activeCategory);
    const files = data[activeCategory] || [];
    const sortedFiles = [...files].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

    // Group Clinical Notes by date
    const isClinicalNotes = activeCategory === 'Clinical Notes';
    const groupedByDate = isClinicalNotes
      ? sortedFiles.reduce((acc, file) => {
          const dateKey = new Date(file.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(file);
          return acc;
        }, {})
      : null;

    const FileCard = ({ file }) => (
      <div
        key={file._id}
        onClick={() => handleFileClick(file)}
        className={`flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-md hover:border-[#137fec] transition-all cursor-pointer ${selectedFile?._id === file._id && mode === 'COMPARE' ? 'opacity-50 pointer-events-none bg-gray-50' : ''}`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${category.bg} ${category.color}`}>
          {file.mime_type?.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}
        </div>
        <div className="min-w-0">
          <h5 className="font-semibold text-xs text-slate-800 truncate leading-tight mb-1" title={file.file_name}>
            {file.file_name}
          </h5>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Calendar size={10} /> {new Date(file.uploaded_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    );

    return (
      <div className="animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-100">
          <button
            onClick={() => setView(mode === 'VIEW' ? 'DASHBOARD' : 'PREVIEW')}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            {mode === 'VIEW' ? <ChevronLeft size={20} /> : <ArrowLeft size={20} />}
          </button>
          <div className={`p-1.5 rounded-md ${category.bg} ${category.color}`}><category.icon size={16} /></div>
          <div>
            <h3 className="font-bold text-md text-slate-800">
              {mode === 'COMPARE' ? 'Select File to Compare' : category.label}
            </h3>
            {mode === 'COMPARE' && <p className="text-xs text-blue-600 font-medium">Pick a second file from the list</p>}
          </div>
        </div>

        {files.length > 0 ? (
          isClinicalNotes ? (
            // Clinical Notes: grouped by date (folder view)
            <div className="flex flex-col gap-5">
              {Object.entries(groupedByDate).map(([dateKey, dateFiles]) => {
                const isToday = dateKey === new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                return (
                  <div key={dateKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={13} className="text-yellow-600" />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        {isToday ? `Today — ${dateKey}` : dateKey}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{dateFiles.length} file{dateFiles.length !== 1 ? 's' : ''}</span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {dateFiles.map(file => <FileCard key={file._id} file={file} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Other categories: flat grid
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sortedFiles.map(file => <FileCard key={file._id} file={file} />)}
            </div>
          )
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm">No files found</p>
          </div>
        )}
      </div>
    );
  };

  const renderFilePreview = () => (
    <div className="animate-in zoom-in-95 duration-200 h-[500px] flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('LIST')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
            <ChevronLeft size={16} /> Back
          </button>
          <h3 className="font-bold text-lg text-slate-800">{selectedFile.file_name}</h3>
        </div>
        <button
          onClick={() => setView('COMPARE_SELECT')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-bold shadow-md"
        >
          <SplitSquareHorizontal size={16} /> Compare
        </button>
      </div>
      <div className="flex-1 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
        {selectedFile.web_view_link ? (
          <iframe 
            src={selectedFile.web_view_link.replace(/\/view.*/, '/preview')} 
            className="w-full h-full border-0"
            title="Preview"
          ></iframe>
        ) : (
          <div className="text-slate-400 flex flex-col items-center">
            <FileText size={48} className="mb-2" />
            <p>Preview not available</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompareView = () => (
    <div className="fixed inset-0 z-[300] bg-slate-900 flex flex-col animate-in fade-in duration-300">
      <div className="bg-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('PREVIEW')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
          <h3 className="font-bold text-lg flex items-center gap-2"><SplitSquareHorizontal size={20} className="text-[#137fec]" /> Compare</h3>
        </div>
        <button onClick={() => setView('PREVIEW')} className="text-slate-500 hover:text-red-500"><X size={24} /></button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-black/90 flex flex-col border-r border-slate-700">
          <div className="p-2 bg-black text-white text-xs text-center opacity-70 border-b border-slate-800">{selectedFile?.file_name}</div>
          <div className="flex-1 flex items-center justify-center p-4">
            {selectedFile?.web_view_link && <iframe src={selectedFile.web_view_link.replace(/\/view.*/, '/preview')} className="w-full h-full border-0" title="Selected File" />}
          </div>
        </div>
        <div className="flex-1 bg-black/90 flex flex-col">
          <div className="p-2 bg-black text-white text-xs text-center opacity-70 border-b border-slate-800">{compareFile?.file_name}</div>
          <div className="flex-1 flex items-center justify-center p-4">
            {compareFile?.web_view_link && <iframe src={compareFile.web_view_link.replace(/\/view.*/, '/preview')} className="w-full h-full border-0" title="Compare File" />}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-lg text-gray-800">Reports & Notes</h3>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus size={18} /> Add File
        </button>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#137fec]" size={32} />
        </div>
      ) : (
        <>
          {view === 'DASHBOARD' && renderDashboard()}
          {(view === 'LIST' || view === 'COMPARE_SELECT') && renderFileList(view === 'LIST' ? 'VIEW' : 'COMPARE')}
          {view === 'PREVIEW' && renderFilePreview()}
          {view === 'COMPARE_VIEW' && renderCompareView()}
        </>
      )}

      {/* UPLOAD MODAL — inlined here (NOT a nested component) to prevent remount on state change */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">Upload File</h3>
              <button onClick={closeUpload} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">File Name</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-[#137fec]"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Post-Op X-Ray"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category</label>
                <select
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-[#137fec]"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Select File</label>
                <input
                  type="file"
                  key={isUploadOpen ? 'open' : 'closed'}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#137fec] file:text-white hover:file:bg-blue-600 cursor-pointer"
                  onChange={(e) => setFileToUpload(e.target.files[0] || null)}
                  required
                />
                {fileToUpload && (
                  <p className="text-xs text-slate-500 mt-1 truncate">Selected: {fileToUpload.name}</p>
                )}
              </div>

              <button
                disabled={uploading}
                type="submit"
                className="w-full bg-[#137fec] text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsNotesSection;
