import React, { useState, useEffect, useRef } from 'react';
import { Pill, Syringe, Plus, X, Edit, Trash2 } from 'lucide-react';

// --- MOCK DATA ---
const MOCK_ITEMS = {
  pharmacy: [
    { id: 101, name: 'Amoxicillin 500mg', company: 'Sun Pharma', content: 'Amoxicillin Trihydrate', category: 'Antibiotic', price: 45.00, minStock: 100 }
  ],
  consumables: [
    { id: 201, name: 'Latex Gloves (M)', company: 'SafeHand', content: 'Powdered Latex', category: 'Protective', price: 350.00, minStock: 10 }
  ]
};

// --- ADD/EDIT ITEM MODAL (Added 'export' here) ---
export const AddItemModal = ({ isOpen, onClose, editItem }) => {
  const [activeTab, setActiveTab] = useState('Pharmacy'); 
  const [formData, setFormData] = useState({
    name: '', company: '', content: '', category: '', price: '', unit: '', minStock: ''
  });

  // Effect to pre-fill data if editing
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        // Set Tab based on item source
        setActiveTab(editItem.sectionType === 'pharmacy' ? 'Pharmacy' : 'Consumable');
        
        setFormData({
          name: editItem.name || '',
          company: editItem.company || '',
          content: editItem.content || '',
          category: editItem.category || '',
          price: editItem.price || '',
          unit: editItem.unit || '',
          minStock: editItem.minStock || ''
        });
      } else {
        // Reset for New Item
        setFormData({ name: '', company: '', content: '', category: '', price: '', unit: '', minStock: '' });
        setActiveTab('Pharmacy');
      }
    }
  }, [isOpen, editItem]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">{editItem ? 'Edit Item' : 'Add New Item'}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <div className="p-6">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-5">
            {['Pharmacy', 'Consumable'].map(tab => (
              <button 
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab ? 
                  (tab === 'Pharmacy' ? 'bg-white text-[#137fec] shadow-sm' : 'bg-white text-teal-600 shadow-sm') 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'Pharmacy' ? <Pill size={16} /> : <Syringe size={16} />} {tab}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Item Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Amoxicillin 500mg" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Brand / Company</label>
              <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="e.g. Sun Pharma" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
            </div>

            {activeTab === 'Pharmacy' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Salt / Composition</label>
                <input type="text" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="e.g. Amoxicillin Trihydrate" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white">
                <option value="">Select Category</option>
                {activeTab === 'Pharmacy' ? ( <><option>Antibiotic</option><option>Painkiller</option></> ) : ( <><option>Protective Gear</option><option>Sterilization</option></> )}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Price (₹)</label>
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unit</label>
                <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="Box/Strip" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-orange-600">Min Stock</label>
                <input type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} placeholder="10" className="w-full border border-orange-200 bg-orange-50 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>

            <button type="submit" className={`w-full py-3 rounded-xl font-bold text-white shadow-lg mt-2 transition-colors ${activeTab === 'Pharmacy' ? 'bg-[#137fec] hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
              {editItem ? 'Update Item' : `Save ${activeTab} Item`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const InventoryItems = ({ SectionHeader }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null); 
  const contextMenuRef = useRef(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e, item, sectionType) => {
    e.preventDefault(); 
    setContextMenu({ 
      x: e.pageX, 
      y: e.pageY, 
      item: { ...item, sectionType } 
    });
  };

  const handleEdit = () => {
    if (contextMenu) {
      setEditingItem(contextMenu.item);
      setIsModalOpen(true);
      setContextMenu(null);
    }
  };

  const handleDelete = () => {
    if (contextMenu) {
      alert(`Deleted item: ${contextMenu.item.name}`);
      setContextMenu(null);
    }
  };

  const handleAddNew = () => {
    setEditingItem(null); 
    setIsModalOpen(true);
  };

  const SECTIONS = [
    { type: 'pharmacy', t: 'Pharmacy Items', i: Pill, d: MOCK_ITEMS.pharmacy, c: 'bg-blue-50/50' },
    { type: 'consumable', t: 'Consumable Items', i: Syringe, d: MOCK_ITEMS.consumables, c: 'bg-teal-50/50' }
  ];

  return (
    <>
      <div className="h-full flex flex-col relative">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {SECTIONS.map((sec, idx) => (
            <div key={idx} className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
              <SectionHeader title={sec.t} icon={sec.i} colorClass={sec.c} count={sec.d.length} />
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Name & Company</th>
                      {sec.type === 'pharmacy' && <th className="p-3">Content</th>}
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Min Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sec.d.map(item => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50 cursor-context-menu transition-colors"
                        onContextMenu={(e) => handleContextMenu(e, item, sec.type)}
                      >
                        <td className="p-3 text-slate-500 font-mono text-xs">#{item.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-700">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.company}</div>
                        </td>
                        {sec.type === 'pharmacy' && (
                          <td className="p-3 text-slate-600 text-xs truncate max-w-[100px]" title={item.content}>
                            {item.content}
                          </td>
                        )}
                        <td className="p-3">
                          <span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{item.category}</span>
                        </td>
                        <td className="p-3 text-right font-medium text-slate-700">₹{item.price.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs border border-orange-100">
                             {item.minStock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* --- CUSTOM CONTEXT MENU --- */}
        {contextMenu && (
          <div 
            ref={contextMenuRef}
            className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-40 z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={handleEdit} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#137fec] flex items-center gap-2">
              <Edit size={14} /> Edit Item
            </button>
            <div className="h-px bg-slate-100 my-1"></div>
            <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}

      </div>
      
      {/* This is where the Modal is used inside the component itself.
        However, since we are exporting it, it will also be available for import in InventoryPage.
      */}
      <AddItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editItem={editingItem} 
      />
    </>
  );
};

export default InventoryItems;