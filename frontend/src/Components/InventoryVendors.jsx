import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Plus, X, User, Phone, Briefcase, Mail, MapPin, FileText, Edit, Trash2, Loader2 } from 'lucide-react';
import API from '../services/api';

// --- ADD VENDOR MODAL ---
export const AddVendorModal = ({ isOpen, onClose, editVendor, onSave }) => {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', type: 'General', contact_person: '', 
    phone: '', email: '', address: '', gst_number: ''
  });

  // Pre-fill data if Editing
  useEffect(() => {
    if (isOpen) {
      if (editVendor) {
        setFormData({
          name: editVendor.name || '',
          type: editVendor.type || 'General',
          contact_person: editVendor.contact_person || '',
          phone: editVendor.phone || '',
          email: editVendor.email || '',
          address: editVendor.address || '',
          gst_number: editVendor.gst_number || ''
        });
      } else {
        setFormData({ 
            name: '', type: 'General', contact_person: '', 
            phone: '', email: '', address: '', gst_number: '' 
        });
      }
    }
  }, [isOpen, editVendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (editVendor) {
            await API.put(`/vendors/${editVendor._id}`, formData);
        } else {
            await API.post('/vendors', formData);
        }
        
        if(onSave) onSave();
        onClose();
    } catch (err) {
        console.error(err);
        alert("Failed to save vendor");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">{editVendor ? 'Edit Vendor' : 'Add New Vendor'}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <form className="p-6 space-y-4 max-h-[80vh] overflow-y-auto" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vendor Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Briefcase size={16}/></span>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. City Surgical Supply" className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
                </div>
             </div>

             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Supply Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white">
                  <option>General</option>
                  <option>Pharmacy</option>
                  <option>Consumable</option>
                  <option>Lab</option>
                </select>
             </div>

             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">GST Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><FileText size={16}/></span>
                  <input type="text" value={formData.gst_number} onChange={e => setFormData({...formData, gst_number: e.target.value})} placeholder="Optional" className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contact Person</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><User size={16}/></span>
                <input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} placeholder="Name" className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone Number</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><Phone size={16}/></span>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="9876..." className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
            </div>
          </div>

          <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email Address</label>
             <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><Mail size={16}/></span>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="vendor@example.com" className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
             </div>
          </div>

          <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Address</label>
             <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><MapPin size={16}/></span>
                <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full Address..." className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none resize-none"></textarea>
             </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-3 rounded-xl font-bold text-white shadow-lg bg-[#137fec] hover:bg-blue-700 transition-colors mt-2 flex justify-center items-center gap-2">
            {loading && <Loader2 className="animate-spin" size={18}/>}
            {editVendor ? 'Update Vendor' : 'Save Vendor'}
          </button>

        </form>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const InventoryVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null); 
  const contextMenuRef = useRef(null);

  // --- FETCH DATA ---
  const fetchVendors = async () => {
    setLoading(true);
    try {
        const { data } = await API.get('/vendors');
        setVendors(data);
    } catch (err) {
        console.error("Failed to load vendors", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Context Menu Handlers
  useEffect(() => {
    const handleClick = () => { if (contextMenu) setContextMenu(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleContextMenu = (e, vendor) => {
    e.preventDefault(); 
    setContextMenu({ x: e.pageX, y: e.pageY, vendor });
  };

  const handleEdit = () => {
    if (contextMenu) {
      setEditingVendor(contextMenu.vendor);
      setIsModalOpen(true);
      setContextMenu(null);
    }
  };

  const handleDelete = async () => {
    if (contextMenu && window.confirm(`Delete vendor "${contextMenu.vendor.name}"?`)) {
        try {
            await API.delete(`/vendors/${contextMenu.vendor._id}`);
            fetchVendors();
        } catch(err) {
            console.error(err);
            alert("Failed to delete vendor");
        }
    }
    setContextMenu(null);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <>
      <div className="h-full flex flex-col" onClick={() => setContextMenu(null)}>
        
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 min-h-0">
          <div className="overflow-auto h-full">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F7F2F2] sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Phone / Email</th>
                  <th className="p-4">GST / Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => (
                  <tr 
                    key={v._id} 
                    className="hover:bg-slate-50 text-sm cursor-context-menu select-none transition-colors"
                    onContextMenu={(e) => handleContextMenu(e, v)}
                  >
                    <td className="p-4 font-bold text-slate-800">{v.name}</td>
                    <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${
                            v.type === 'Pharmacy' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            v.type === 'Consumable' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            'bg-slate-100 border-slate-200'
                        }`}>
                            {v.type}
                        </span>
                    </td>
                    <td className="p-4 text-slate-600 flex items-center gap-2">
                        {v.contact_person ? <><User size={14} className="text-slate-400"/> {v.contact_person}</> : '-'}
                    </td>
                    <td className="p-4">
                        <div className="flex flex-col gap-1">
                            <div className="text-slate-800 font-mono text-xs flex items-center gap-2"><Phone size={12}/> {v.phone || '-'}</div>
                            {v.email && <div className="text-slate-500 text-xs flex items-center gap-2"><Mail size={12}/> {v.email}</div>}
                        </div>
                    </td>
                    <td className="p-4 text-slate-500 text-xs max-w-[200px] truncate">
                        {v.gst_number && <div className="font-bold mb-1">GST: {v.gst_number}</div>}
                        {v.address}
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">No vendors found. Add one to get started.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div 
            ref={contextMenuRef}
            className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-40 z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleEdit} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Edit size={14} /> Edit Vendor
            </button>
            <div className="h-px bg-slate-100 my-1"></div>
            <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}

      </div>

      <AddVendorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editVendor={editingVendor}
        onSave={fetchVendors} 
      />
    </>
  );
};

export default InventoryVendors;