import React, { useState, useEffect, useRef } from 'react';
import { Pill, Syringe, Plus, X, Edit, Trash2, Loader2 } from 'lucide-react';
import API from '../services/api';

// --- ADD/EDIT ITEM MODAL ---
export const AddItemModal = ({ isOpen, onClose, editItem, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Pharmacy'); 
  
  const [formData, setFormData] = useState({
    name: '', company: '', content: '', category: '', 
    costPrice: '', sellingPrice: '', 
    currentStock: '', // Changed from unit to currentStock
    minStock: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setActiveTab(editItem.type); 
        setFormData({
          name: editItem.name || '',
          company: editItem.manufacturer || '',
          content: editItem.composition || '',
          category: editItem.category || '',
          costPrice: editItem.cost_price || '',       
          sellingPrice: editItem.selling_price || '', 
          currentStock: editItem.stock_on_hand || 0, // Load existing stock
          minStock: editItem.min_stock_level || ''
        });
      } else {
        setFormData({ name: '', company: '', content: '', category: '', costPrice: '', sellingPrice: '', currentStock: '', minStock: '' });
        setActiveTab('Pharmacy');
      }
    }
  }, [isOpen, editItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const payload = {
            name: formData.name,
            type: activeTab,
            category: formData.category,
            manufacturer: formData.company,
            composition: formData.content,
            cost_price: Number(formData.costPrice),
            selling_price: activeTab === 'Pharmacy' ? Number(formData.sellingPrice) : 0, 
            min_stock_level: Number(formData.minStock),
            // Allow setting stock directly here
            stock_on_hand: Number(formData.currentStock) 
        };

        if (editItem) {
            await API.put(`/inventory/${editItem._id}`, payload);
        } else {
            await API.post('/inventory', payload);
        }

        if (typeof onSave === 'function') onSave(); 
        onClose();
    } catch (err) {
        console.error(err);
        alert("Failed to save item");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">{editItem ? 'Edit Item' : 'Add New Item'}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6">
          {!editItem && (
              <div className="flex p-1 bg-slate-100 rounded-xl mb-5">
                {['Pharmacy', 'Consumable'].map(tab => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? (tab === 'Pharmacy' ? 'bg-white text-[#137fec] shadow-sm' : 'bg-white text-teal-600 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}>
                    {tab === 'Pharmacy' ? <Pill size={16} /> : <Syringe size={16} />} {tab}
                  </button>
                ))}
              </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Item Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Brand / Company</label>
              <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
            </div>
            {activeTab === 'Pharmacy' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Salt / Composition</label>
                <input type="text" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none" />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
               <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white">
                    <option value="">Select...</option>
                    {activeTab === 'Pharmacy' ? (<><option>Antibiotic</option><option>Painkiller</option><option>Supplement</option></>) : (<><option>Protective Gear</option><option>Sterilization</option></>)}
                  </select>
               </div>
            </div>
            
            {/* PRICING ROW */}
            <div className={`grid ${activeTab === 'Pharmacy' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-blue-600">Cost Price</label>
                <input type="number" required value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} placeholder="Buy @" className="w-full border border-blue-200 bg-blue-50 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              {activeTab === 'Pharmacy' && (
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-green-600">Selling Price</label>
                    <input type="number" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} placeholder="Sell @" className="w-full border border-green-200 bg-green-50 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
              )}
            </div>

            {/* STOCK ROW - NEW */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Current Stock</label>
                  <input type="number" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} placeholder="Qty" className="w-full border border-slate-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-slate-500 outline-none" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-orange-600">Min Alert Level</label>
                  <input type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} placeholder="Alert @" className="w-full border border-orange-200 bg-white p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
               </div>
            </div>

            <button disabled={loading} type="submit" className={`w-full py-3 rounded-xl font-bold text-white shadow-lg mt-2 transition-colors ${activeTab === 'Pharmacy' ? 'bg-[#137fec] hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'} ${loading ? 'opacity-70' : ''}`}>
              {loading ? 'Saving...' : (editItem ? 'Update Item' : `Save ${activeTab} Item`)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const InventoryItems = ({ SectionHeader }) => {
  const [items, setItems] = useState({ pharmacy: [], consumables: [] });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); 
  const contextMenuRef = useRef(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
        const { data } = await API.get('/inventory');
        const pharmacy = data.filter(i => i.type === 'Pharmacy');
        const consumables = data.filter(i => i.type === 'Consumable' || i.type === 'Asset');
        setItems({ pharmacy, consumables });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInventory(); }, []);

  useEffect(() => {
    const handleClick = (e) => { if (contextMenu) setContextMenu(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleContextMenu = (e, item) => {
    e.preventDefault(); 
    setContextMenu({ x: e.pageX, y: e.pageY, item: item });
  };

  const handleEdit = () => {
    if (contextMenu) {
      setEditingItem(contextMenu.item);
      setIsModalOpen(true);
      setContextMenu(null);
    }
  };

  const handleDelete = async () => {
    if (contextMenu && window.confirm(`Delete "${contextMenu.item.name}"?`)) {
        try { await API.delete(`/inventory/${contextMenu.item._id}`); fetchInventory(); } 
        catch(err) { console.error(err); }
    }
    setContextMenu(null);
  };

  const SECTIONS = [
    { type: 'pharmacy', t: 'Pharmacy Items', i: Pill, d: items.pharmacy, c: 'bg-blue-50/50' },
    { type: 'consumable', t: 'Consumable Items', i: Syringe, d: items.consumables, c: 'bg-teal-50/50' }
  ];

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <>
      <div className="h-full flex flex-col relative" onClick={() => setContextMenu(null)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {SECTIONS.map((sec, idx) => (
            <div key={idx} className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
              <SectionHeader title={sec.t} icon={sec.i} colorClass={sec.c} count={sec.d.length} />
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-3">Name & Company</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right text-blue-600">Cost</th>
                      {sec.type === 'pharmacy' && <th className="p-3 text-right text-green-600">SP</th>}
                      <th className="p-3 text-right">Stock / Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sec.d.map((item, i) => (
                      <tr key={item._id} onContextMenu={(e) => handleContextMenu(e, item)} className="hover:bg-slate-50 cursor-context-menu transition-colors select-none">
                        <td className="p-3">
                          <div className="font-bold text-slate-700">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.manufacturer}</div>
                        </td>
                        <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{item.category}</span></td>
                        <td className="p-3 text-right font-medium text-slate-600">₹{item.cost_price || 0}</td>
                        {sec.type === 'pharmacy' && <td className="p-3 text-right font-medium text-green-700">₹{item.selling_price || 0}</td>}
                        
                        {/* REVISED STOCK DISPLAY */}
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                              <span className={`font-bold text-md ${item.stock_on_hand <= item.min_stock_level ? 'text-red-600' : 'text-slate-800'}`}>
                                  {item.stock_on_hand}
                              </span>
                              <span className="text-[10px] text-slate-400">Min: {item.min_stock_level}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        {contextMenu && (
          <div ref={contextMenuRef} className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-40 z-50 animate-in fade-in zoom-in-95 duration-100" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
            <button onClick={handleEdit} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit size={14} /> Edit Item</button>
            <div className="h-px bg-slate-100 my-1"></div>
            <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
          </div>
        )}
      </div>
      <AddItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editItem={editingItem} onSave={fetchInventory} />
    </>
  );
};

export default InventoryItems;