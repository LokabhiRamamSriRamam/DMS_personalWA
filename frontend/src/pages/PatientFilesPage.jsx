import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Image as ImageIcon, FileBarChart, HardDrive, Search, Filter, Calendar, Cloud, Trash2, X, CheckSquare, Square, Info
} from 'lucide-react';
import API from '../services/api';

const CATEGORIES = [
  { id: 'All', label: 'All Files', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50' },
  { id: 'Clinical Notes', label: 'Clinical Notes', icon: FileText, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { id: 'Photographs', label: 'Photographs', icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'Lab Reports', label: 'Lab Reports', icon: FileBarChart, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'Scans', label: 'X-Rays & Scans', icon: HardDrive, color: 'text-slate-600', bg: 'bg-slate-50' },
];

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const PatientFilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');

  // Multi-select & Delete State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await API.get('/files/all');
      setFiles(res.data || []);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageInfo = async () => {
    try {
      const res = await API.get('/files/storage');
      setStorageInfo(res.data);
    } catch (err) {
      console.error('Error fetching storage:', err);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchStorageInfo();
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          file.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || file.category === selectedType;
    
    let matchesDate = true;
    if (dateFilter !== 'All Time' && file.uploaded_at) {
      const fileDate = new Date(file.uploaded_at);
      const today = new Date();
      const diffTime = today.getTime() - fileDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (dateFilter === 'Today') matchesDate = diffDays <= 1;
      else if (dateFilter === 'Last 7 Days') matchesDate = diffDays <= 7;
      else if (dateFilter === 'Last 30 Days') matchesDate = diffDays <= 30;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      file
    });
  };

  const handleSelectClick = (file) => {
    setIsMultiSelectMode(true);
    if (!selectedFiles.find(f => f._id === file._id)) {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const handleDeleteClick = (file) => {
    setSelectedFiles([file]);
    setDeleteConfirmOpen(true);
  };

  const toggleFileSelection = (file) => {
    if (selectedFiles.find(f => f._id === file._id)) {
      const newSelection = selectedFiles.filter(f => f._id !== file._id);
      setSelectedFiles(newSelection);
      if (newSelection.length === 0) setIsMultiSelectMode(false);
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedFiles.length === 0) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      const payload = selectedFiles.map(f => ({
        fileRecordId: f._id,
        patient_id: f.patient_id
      }));

      await API.post('/files/bulk-delete', { fileRecords: payload });

      setIsMultiSelectMode(false);
      setSelectedFiles([]);
      setDeleteConfirmOpen(false);
      fetchFiles();
      fetchStorageInfo();
    } catch (err) {
      console.error('Failed to delete files:', err);
      alert('Failed to delete files');
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryIcon = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return <FileText size={18} />;
    const Icon = cat.icon;
    return (
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cat.bg} ${cat.color}`}>
        <Icon size={18} />
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 relative">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Patient Files</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-2">
            Manage all files uploaded across all patients
            <span className="group relative cursor-pointer text-blue-500 flex items-center">
              <Info size={16} />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Right click to select or delete
              </span>
            </span>
          </p>
        </div>
        
        {/* Storage Info */}
        {storageInfo && storageInfo.usage && (
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
            <Cloud size={20} className="text-blue-500" />
            <div className="text-sm">
              <span className="font-bold text-slate-800 dark:text-white">{formatBytes(storageInfo.usageInDrive || storageInfo.usage)}</span>
              <span className="text-slate-500 ml-1">consumed in Cloud</span>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Select Header Banner */}
      {isMultiSelectMode && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <button onClick={() => { setIsMultiSelectMode(false); setSelectedFiles([]); }} className="text-red-500 hover:text-red-700 p-1">
              <X size={20} />
            </button>
            <span className="font-bold text-red-700 dark:text-red-400">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
          >
            <Trash2 size={16} /> Bulk Delete
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-[#1a2634] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Patient Name or File Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-3 w-full md:w-auto">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full lg:w-auto px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#1a2634] text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="All Time">All Time</option>
            <option value="Today">Today</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
          </select>

          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedType === cat.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map(file => {
            const isSelected = !!selectedFiles.find(f => f._id === file._id);
            return (
              <div 
                key={file._id} 
                title="Right click to select or delete"
                onContextMenu={(e) => handleContextMenu(e, file)}
                onClick={() => isMultiSelectMode && toggleFileSelection(file)}
                className={`bg-white dark:bg-[#1a2634] p-4 rounded-xl border flex items-start gap-4 transition-all relative ${
                  isSelected 
                    ? 'border-blue-500 shadow-md ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
                    : 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer'
                }`}
              >
                {/* Selection Checkbox Overlay */}
                {isMultiSelectMode && (
                  <div className="absolute top-3 right-3 text-blue-600">
                    {isSelected ? <CheckSquare size={20} className="fill-blue-100 dark:fill-blue-900" /> : <Square size={20} className="text-slate-300" />}
                  </div>
                )}

                {getCategoryIcon(file.category)}
                <div className="min-w-0 flex-1 pr-6">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={file.file_name}>
                    {file.file_name}
                  </h4>
                  <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">{file.patient_name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
                    <Calendar size={10} /> 
                    {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : 'Unknown Date'}
                  </div>
                </div>

                {!isMultiSelectMode && (
                  <a 
                    href={file.web_view_link ? file.web_view_link.replace(/\/view.*/, '/preview') : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-3 right-3 text-slate-400 hover:text-blue-600 p-1"
                    title="Preview"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-800">
          <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No files found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your filters or search query.</p>
        </div>
      )}

      {/* Context Menu Dropdown */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-1 w-48 overflow-hidden animate-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => { handleSelectClick(contextMenu.file); setContextMenu(null); }}
          >
            <CheckSquare size={16} /> Select
          </button>
          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 font-medium"
            onClick={() => { handleDeleteClick(contextMenu.file); setContextMenu(null); }}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Deletion</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to delete {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} from Cloud? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                disabled={deleting}
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientFilesPage;
