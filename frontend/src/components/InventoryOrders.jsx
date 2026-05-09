import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pill, Syringe, X, Loader2, Plus, Trash2, Search, Calendar, ChevronDown, Eye, CheckCircle, Truck, Ban, Edit } from 'lucide-react';
import API from '../services/api';

// --- CUSTOM SEARCHABLE DROPDOWN ---
const ItemSearchSelect = ({ items, selectedId, onSelect, disabled }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);
  const portalRef = useRef(null);

  useEffect(() => {
    if (selectedId) {
      const item = items.find(i => i._id === selectedId);
      if (item) setQuery(item.name);
    } else if (selectedId === '') {
      setQuery('');
    }
  }, [selectedId, items]);

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
      const clickedPortal = portalRef.current && portalRef.current.contains(event.target);
      if (!clickedWrapper && !clickedPortal) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = query === '' ? items : items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (item) => {
    setQuery(item.name);
    setIsOpen(false);
    onSelect(item._id);
  };

  const DropdownList = (
    <div ref={portalRef} className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100" style={{ top: coords.top, left: coords.left, width: coords.width }}>
      {filteredItems.length > 0 ? (
        filteredItems.map(item => (
          <div key={item._id} onClick={() => handleSelect(item)} className={`px-3 py-2.5 text-sm cursor-pointer border-b border-slate-50 last:border-none flex justify-between items-center transition-colors ${item._id === selectedId ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
            <div className="flex flex-col gap-0.5">
                <span className="font-medium">{item.name}</span>
                <span className="text-[10px] text-slate-400 leading-none">{item.manufacturer}</span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${item.type === 'Pharmacy' ? 'bg-blue-100 text-blue-600' : 'bg-teal-100 text-teal-600'}`}>{item.type}</span>
          </div>
        ))
      ) : <div className="p-3 text-center text-xs text-slate-400 italic">No items found.</div>}
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          disabled={disabled}
          className={`w-full border border-slate-200 p-2 pr-8 rounded-md text-sm outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] ${disabled ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}
          placeholder={disabled ? "Locked" : "Select Item..."}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); if (e.target.value === '') onSelect(''); }}
          onClick={() => !disabled && setIsOpen(true)}
          onFocus={() => !disabled && setIsOpen(true)}
        />
        <ChevronDown size={14} className={`absolute right-2 text-slate-400 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
      </div>
      {isOpen && !disabled && createPortal(DropdownList, document.body)}
    </div>
  );
};

// --- CREATE/EDIT ORDER MODAL ---
export const CreateOrderModal = ({ isOpen, onClose, onSave, editOrder }) => {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  // EDIT MODE: If status is NOT 'Pending', make it Read-Only
  const isReadOnly = editOrder && editOrder.status !== 'Pending';

  const [orderMeta, setOrderMeta] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: '', vendor: '', category: 'General'
  });

  const [orderItems, setOrderItems] = useState([{ itemId: '', name: '', qty: 1, rate: 0, total: 0 }]);

  // --- 1. INITIALIZE DATA ---
  useEffect(() => {
    if (isOpen) {
      // Fetch dropdown data
      API.get('/vendors').then(res => setVendors(res.data)).catch(console.error);
      API.get('/inventory').then(res => setInventoryItems(res.data)).catch(console.error);

      // Pre-fill if editing
      if (editOrder) {
        setOrderMeta({
            date: new Date(editOrder.order_date).toISOString().split('T')[0],
            dueDate: editOrder.due_date ? new Date(editOrder.due_date).toISOString().split('T')[0] : '',
            vendor: editOrder.vendor,
            category: editOrder.category
        });
        setOrderItems(editOrder.items.map(i => ({
            itemId: i.item_id,
            name: i.item_name,
            qty: i.qty,
            rate: i.unit_cost,
            total: i.total_cost
        })));
      } else {
        // Reset for new
        setOrderMeta({ date: new Date().toISOString().split('T')[0], dueDate: '', vendor: '', category: 'General' });
        setOrderItems([{ itemId: '', name: '', qty: 1, rate: 0, total: 0 }]);
      }
    }
  }, [isOpen, editOrder]);

  // --- 2. HANDLERS ---
  const handleItemSelect = (index, itemId) => {
    const selectedItem = inventoryItems.find(i => i._id === itemId);
    const newItems = [...orderItems];
    newItems[index].itemId = itemId || '';
    newItems[index].name = selectedItem?.name || '';
    newItems[index].rate = selectedItem?.cost_price || 0;
    newItems[index].total = newItems[index].qty * newItems[index].rate;
    setOrderItems(newItems);
  };

  const handleRowChange = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = Number(value);
    newItems[index].total = newItems[index].qty * newItems[index].rate;
    setOrderItems(newItems);
  };

  const addRow = () => setOrderItems([...orderItems, { itemId: '', name: '', qty: 1, rate: 0, total: 0 }]);
  
  const removeRow = (index) => {
    if (orderItems.length > 1) {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const grandTotal = orderItems.reduce((acc, curr) => acc + curr.total, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(isReadOnly) { onClose(); return; } // Just close if read-only

    setLoading(true);
    if(!orderMeta.vendor || orderItems.some(i => !i.itemId)) { 
        alert("Please fill all required fields"); setLoading(false); return; 
    }

    try {
        const payload = {
            order_date: orderMeta.date,
            due_date: orderMeta.dueDate,
            vendor: orderMeta.vendor,
            category: orderMeta.category,
            items: orderItems.map(i => ({
                item_id: i.itemId, 
                item_name: i.name,
                qty: i.qty,
                unit_cost: i.rate,
                total_cost: i.total
            })), 
            total_cost: grandTotal,
            // If editing, preserve status, else default to Pending
            status: editOrder ? editOrder.status : 'Pending' 
        };

        if (editOrder) {
            await API.put(`/inventory/orders/${editOrder._id}`, payload);
        } else {
            await API.post('/inventory/orders', payload);
        }

        if(onSave) onSave();
        onClose();
    } catch (err) {
        console.error(err);
        alert("Failed to save order");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <h3 className="font-bold text-xl text-slate-800">{editOrder ? 'View / Edit Order' : 'Create Purchase Order'}</h3>
             {isReadOnly && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold border border-orange-200">Read Only ({editOrder.status})</span>}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        
        <form className="flex flex-col flex-1 overflow-hidden" onSubmit={handleSubmit}>
          
          {/* Header Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vendor</label>
                <select disabled={isReadOnly} required value={orderMeta.vendor} onChange={e => setOrderMeta({...orderMeta, vendor: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white disabled:bg-slate-100">
                  <option value="">Select Vendor...</option>
                  {vendors.map(v => <option key={v._id} value={v.name}>{v.name}</option>)}
                </select>
             </div>
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Order Date</label>
                <input disabled={isReadOnly} required type="date" value={orderMeta.date} onChange={e => setOrderMeta({...orderMeta, date: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none disabled:bg-slate-100" />
             </div>
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block text-orange-600">Due Date</label>
                <input disabled={isReadOnly} type="date" value={orderMeta.dueDate} onChange={e => setOrderMeta({...orderMeta, dueDate: e.target.value})} className="w-full border border-orange-200 bg-orange-50/50 p-2 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-slate-100" />
             </div>
          </div>

          {/* Items Table */}
          <div className="flex-1 overflow-auto border border-slate-200 rounded-xl mb-4 bg-slate-50/30">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 sticky top-0 text-[11px] font-bold text-slate-500 uppercase z-10">
                    <tr>
                        <th className="p-3 w-1/2">Item Search</th>
                        <th className="p-3 w-24 text-center">Qty</th>
                        <th className="p-3 w-28 text-right">Cost</th>
                        <th className="p-3 w-28 text-right">Total</th>
                        {!isReadOnly && <th className="p-3 w-12"></th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm bg-white">
                    {orderItems.map((row, index) => (
                        <tr key={index}>
                            <td className="p-2 align-top">
                                <ItemSearchSelect disabled={isReadOnly} items={inventoryItems} selectedId={row.itemId} onSelect={(id) => handleItemSelect(index, id)} />
                            </td>
                            <td className="p-2 align-top">
                                <input disabled={isReadOnly} type="number" min="1" value={row.qty} onChange={(e) => handleRowChange(index, 'qty', e.target.value)} className="w-full border border-slate-200 p-2 rounded-md text-sm text-center outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] disabled:bg-slate-50" />
                            </td>
                            <td className="p-2 align-top">
                                <input disabled={isReadOnly} type="number" min="0" value={row.rate} onChange={(e) => handleRowChange(index, 'rate', e.target.value)} className="w-full border border-slate-200 p-2 rounded-md text-sm text-right outline-none focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] disabled:bg-slate-50" />
                            </td>
                            <td className="p-2 text-right font-bold text-slate-700 align-top pt-3">
                                ₹{row.total.toLocaleString()}
                            </td>
                            {!isReadOnly && (
                                <td className="p-2 text-center align-top pt-3">
                                    {orderItems.length > 1 && <button type="button" onClick={() => removeRow(index)} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16}/></button>}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>

          {!isReadOnly && (
              <button type="button" onClick={addRow} className="flex items-center gap-2 text-sm font-bold text-[#137fec] mb-6 hover:text-blue-700 w-fit px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                 <Plus size={16} /> Add Another Item
              </button>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
             <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-bold">Total Amount</span>
                <span className="text-2xl font-bold text-slate-800">₹{grandTotal.toLocaleString()}</span>
             </div>
             
             {!isReadOnly ? (
                 <button disabled={loading} type="submit" className="bg-[#137fec] hover:bg-blue-700 text-white py-3 px-8 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                    {loading && <Loader2 className="animate-spin" size={18}/>} Save Order
                 </button>
             ) : (
                 <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-8 rounded-xl font-bold transition-all">Close</button>
             )}
          </div>

        </form>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const InventoryOrders = ({ SectionHeader, medicineEnabled = true, consumableEnabled = true }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter orders by category. "General" orders are always shown.
  const visibleOrders = orders.filter(o => {
    if (o.category === 'Pharmacy') return medicineEnabled;
    if (o.category === 'Consumable') return consumableEnabled;
    return true;
  });
  
  // Modal & Context Menu State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
        const { data } = await API.get('/inventory/orders');
        setOrders(data);
    } catch (err) { console.error("Failed", err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  // --- Context Menu Handlers ---
  useEffect(() => {
    const handleClick = () => { if (contextMenu) setContextMenu(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleContextMenu = (e, order) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, order });
  };

  const handleStatusChange = async (status) => {
    if (contextMenu) {
        try {
            await API.put(`/inventory/orders/${contextMenu.order._id}`, { status });
            fetchOrders(); // Refresh UI
        } catch(err) {
            alert("Failed to update status");
        }
    }
    setContextMenu(null);
  };

  const handleViewOrder = () => {
      if (contextMenu) {
          setEditingOrder(contextMenu.order);
          setIsModalOpen(true);
          setContextMenu(null);
      }
  };

  const handleCreateNew = () => {
      setEditingOrder(null);
      setIsModalOpen(true);
  };

  if(loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <>
      <div className="h-full flex flex-col" onClick={() => setContextMenu(null)}>
        <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
          {/* Header (We pass onAdd to the SectionHeader to allow opening the modal) */}
          <SectionHeader 
             title="Purchase Orders" 
             icon={Pill} 
             colorClass="bg-blue-50/50" 
             count={visibleOrders.length}
             onAdd={handleCreateNew}
          />
          
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Items</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {visibleOrders.map(o => (
                        <tr 
                            key={o._id} 
                            className="hover:bg-slate-50 cursor-context-menu select-none"
                            onContextMenu={(e) => handleContextMenu(e, o)}
                        >
                            <td className="p-3 text-slate-600">
                                <div className="font-medium">{new Date(o.order_date).toLocaleDateString()}</div>
                                {o.due_date && <div className="text-[10px] text-orange-600 flex items-center gap-1"><Calendar size={10}/> {new Date(o.due_date).toLocaleDateString()}</div>}
                            </td>
                            <td className="p-3 font-medium text-slate-700">{o.vendor}</td>
                            <td className="p-3 text-slate-600 text-xs">
                                <div className="max-w-[300px] truncate" title={o.items?.map(i => i.item_name).join(', ')}>
                                    {o.items?.map(i => i.item_name).join(', ')}
                                </div>
                                {/* TOTAL UNITS DISPLAY */}
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Total Units: {o.items?.reduce((sum, i) => sum + i.qty, 0)}
                                </div>
                            </td>
                            <td className="p-3 text-right font-bold text-slate-700">₹{o.total_cost.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                  o.status === 'Received' ? 'bg-green-100 text-green-700 border-green-200' : 
                                  o.status === 'Confirmed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                  o.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                                  'bg-orange-100 text-orange-700 border-orange-200'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                        </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">No orders found. Right click to manage.</td></tr>}
                </tbody>
            </table>
          </div>
        </div>

        {/* --- CONTEXT MENU --- */}
        {contextMenu && (
          <div 
            ref={contextMenuRef}
            className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-44 z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                Actions
            </div>
            
            <button onClick={handleViewOrder} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                {contextMenu.order.status === 'Pending' ? <Edit size={14}/> : <Eye size={14}/>} 
                {contextMenu.order.status === 'Pending' ? 'Edit Order' : 'View Order'}
            </button>

            <div className="h-px bg-slate-100 my-1"></div>
            
            <button onClick={() => handleStatusChange('Confirmed')} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                <CheckCircle size={14} /> Confirmed
            </button>
            <button onClick={() => handleStatusChange('Received')} className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                <Truck size={14} /> Recieved
            </button>
            <button onClick={() => handleStatusChange('Cancelled')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <Ban size={14} /> Cancelled
            </button>
          </div>
        )}
      </div>

      {/* Reused Modal for Create AND View/Edit */}
      <CreateOrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchOrders}
        editOrder={editingOrder} // Pass order data if viewing/editing
      />
    </>
  );
};

export default InventoryOrders;