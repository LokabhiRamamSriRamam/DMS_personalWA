import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Download, Upload } from 'lucide-react';
import API from '../services/api';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('doctors');

  // Doctor states
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    specialization: '',
    email: '',
    phone: '',
    license_number: '',
    qualification: '',
    experience_years: 0,
    is_active: true,
    notes: '',
    availability: {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: { start: '10:00', end: '14:00' },
      sunday: { start: '', end: '' }
    }
  });

  // Treatment states
  const [clinicalFindings, setClinicalFindings] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [suggestedTreatments, setSuggestedTreatments] = useState([]);
  const [treatmentTab, setTreatmentTab] = useState('findings');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);

  // Service states
  const [services, setServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    category: 'General',
    cost: 0,
    description: '',
    isActive: true
  });

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'doctors') {
      fetchDoctors();
    } else if (activeTab === 'treatment') {
      fetchTreatmentData();
    } else if (activeTab === 'services') {
      fetchServices();
    }
  }, [activeTab, treatmentTab]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await API.get('/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreatmentData = async () => {
    setLoading(true);
    try {
      const [findingsRes, diagnosesRes, treatmentsRes] = await Promise.all([
        API.get('/clinical-findings'),
        API.get('/diagnoses'),
        API.get('/suggested-treatments')
      ]);
      setClinicalFindings(findingsRes.data);
      setDiagnoses(diagnosesRes.data);
      setSuggestedTreatments(treatmentsRes.data);
    } catch (err) {
      console.error('Failed to load treatment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await API.get('/services');
      setServices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = () => {
    setEditingDoctor(null);
    setDoctorFormData({
      name: '',
      specialization: '',
      email: '',
      phone: '',
      license_number: '',
      qualification: '',
      experience_years: 0,
      is_active: true,
      notes: '',
      availability: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: { start: '10:00', end: '14:00' },
        sunday: { start: '', end: '' }
      }
    });
    setShowModal(true);
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setDoctorFormData(doctor);
    setShowModal(true);
  };

  const handleDeleteDoctor = async (id) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await API.delete(`/doctors/${id}`);
        setDoctors(doctors.filter(d => d._id !== id));
      } catch (err) {
        console.error('Failed to delete doctor:', err);
        alert('Failed to delete doctor');
      }
    }
  };

  const handleSubmitDoctor = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingDoctor) {
        const res = await API.put(`/doctors/${editingDoctor._id}`, doctorFormData);
        setDoctors(doctors.map(d => d._id === editingDoctor._id ? res.data : d));
      } else {
        const res = await API.post('/doctors', doctorFormData);
        setDoctors([...doctors, res.data]);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save doctor:', err);
      alert('Failed to save doctor: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('availability_')) {
      const [, day, timeType] = name.split('_');
      setDoctorFormData(prev => ({
        ...prev,
        availability: {
          ...prev.availability,
          [day]: {
            ...prev.availability[day],
            [timeType]: value
          }
        }
      }));
    } else {
      setDoctorFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : (name === 'experience_years' ? Number(value) : value)
      }));
    }
  };

  const addBulkRow = () => {
    if (treatmentTab === 'treatments') {
      setBulkItems([...bulkItems, { name: '', category: '', cost: 0, description: '' }]);
    } else if (treatmentTab === 'diagnoses') {
      setBulkItems([...bulkItems, { name: '', code: '', category: '', description: '' }]);
    } else {
      setBulkItems([...bulkItems, { name: '', category: '', description: '' }]);
    }
  };

  const updateBulkRow = (index, field, value) => {
    const newItems = [...bulkItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setBulkItems(newItems);
  };

  const removeBulkRow = (index) => {
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  };

  const handleBulkAdd = async () => {
    if (bulkItems.length === 0) return;
    setLoading(true);

    try {
      for (const item of bulkItems) {
        if (!item.name.trim()) continue;

        if (treatmentTab === 'findings') {
          await API.post('/clinical-findings', {
            name: item.name.trim(),
            category: item.category || '',
            description: item.description || '',
            is_active: true
          });
        } else if (treatmentTab === 'diagnoses') {
          await API.post('/diagnoses', {
            name: item.name.trim(),
            code: item.code || '',
            category: item.category || '',
            description: item.description || '',
            is_active: true
          });
        } else if (treatmentTab === 'treatments') {
          await API.post('/suggested-treatments', {
            name: item.name.trim(),
            cost: parseFloat(item.cost) || 0,
            category: item.category || '',
            description: item.description || '',
            is_active: true
          });
        }
      }
      setBulkItems([]);
      setBulkMode(false);
      fetchTreatmentData();
      alert('Items added successfully!');
    } catch (err) {
      console.error('Failed to add items:', err);
      alert('Failed to add some items: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete treatment item
  const handleDeleteTreatmentItem = async (id, type) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const endpoint =
          type === 'findings' ? '/clinical-findings' :
          type === 'diagnoses' ? '/diagnoses' :
          '/suggested-treatments';
        await API.delete(`${endpoint}/${id}`);

        if (type === 'findings') setClinicalFindings(clinicalFindings.filter(f => f._id !== id));
        else if (type === 'diagnoses') setDiagnoses(diagnoses.filter(d => d._id !== id));
        else setSuggestedTreatments(suggestedTreatments.filter(t => t._id !== id));
      } catch (err) {
        console.error('Failed to delete item:', err);
        alert('Failed to delete item');
      }
    }
  };

  // Service Management
  const handleAddService = () => {
    setEditingService(null);
    setServiceFormData({
      name: '',
      category: 'General',
      cost: 0,
      description: '',
      isActive: true
    });
    setShowServiceModal(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceFormData(service);
    setShowServiceModal(true);
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await API.delete(`/services/${id}`);
        setServices(services.filter(s => s._id !== id));
      } catch (err) {
        console.error('Failed to delete service:', err);
        alert('Failed to delete service');
      }
    }
  };

  const handleSubmitService = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingService) {
        const res = await API.put(`/services/${editingService._id}`, serviceFormData);
        setServices(services.map(s => s._id === editingService._id ? res.data : s));
      } else {
        const res = await API.post('/services', serviceFormData);
        setServices([...services, res.data]);
      }
      setShowServiceModal(false);
    } catch (err) {
      console.error('Failed to save service:', err);
      alert('Failed to save service: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setServiceFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'cost' ? parseFloat(value) || 0 : value)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage clinic configuration and clinical data</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'doctors'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Doctors
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'services'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Services
          </button>
          <button
            onClick={() => setActiveTab('treatment')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'treatment'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Clinical Data
          </button>
        </div>

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Doctor Management</h2>
              <button
                onClick={handleAddDoctor}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
              >
                <Plus size={20} /> Add Doctor
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No doctors added yet. Click "Add Doctor" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Specialization</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Phone</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Experience</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {doctors.map(doctor => (
                      <tr key={doctor._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-white">{doctor.name}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {doctor.specialization || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {doctor.email || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {doctor.phone || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {doctor.experience_years} years
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditDoctor(doctor)}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doctor._id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Service Management</h2>
              <button
                onClick={handleAddService}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
              >
                <Plus size={20} /> Add Service
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No services added yet. Click "Add Service" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Category</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Cost</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {services.map(service => (
                      <tr key={service._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-white">{service.name}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                            {service.category || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-800 dark:text-white font-semibold">
                          ₹{service.cost?.toLocaleString('en-IN') || '0'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            service.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
                          }`}>
                            {service.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditService(service)}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service._id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Treatment Tab */}
        {activeTab === 'treatment' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            {/* Treatment Sub-tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
              {['findings', 'diagnoses', 'treatments'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setTreatmentTab(tab)}
                  className={`px-4 py-2 font-semibold transition-all capitalize ${
                    treatmentTab === tab
                      ? 'text-[#137fec] border-b-2 border-[#137fec]'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab === 'findings' ? 'Clinical Findings' : tab === 'diagnoses' ? 'Diagnoses' : 'Suggested Treatments'}
                </button>
              ))}
            </div>

            {/* Bulk Mode Toggle */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {treatmentTab === 'findings' ? 'Clinical Findings' : treatmentTab === 'diagnoses' ? 'Diagnoses' : 'Suggested Treatments'}
              </h3>
              <button
                onClick={() => setBulkMode(!bulkMode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-colors ${
                  bulkMode
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Upload size={18} /> {bulkMode ? 'Cancel Bulk' : 'Bulk Add'}
              </button>
            </div>

            {/* Bulk Mode Input */}
            {bulkMode && (
              <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-700 rounded-lg border-2 border-orange-300">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Add {treatmentTab === 'findings' ? 'Clinical Findings' : treatmentTab === 'diagnoses' ? 'Diagnoses' : 'Suggested Treatments'} in Bulk
                  </h4>
                  <button
                    onClick={addBulkRow}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Plus size={16} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto mb-4 border border-orange-300 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-orange-100 dark:bg-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Name</th>
                        {treatmentTab === 'diagnoses' && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Code</th>
                        )}
                        {treatmentTab === 'treatments' && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Cost (₹)</th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Description</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-200 dark:divide-slate-600">
                      {bulkItems.length === 0 ? (
                        <tr>
                          <td colSpan={treatmentTab === 'treatments' ? 5 : treatmentTab === 'diagnoses' ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                            Click "Add Row" to start adding items
                          </td>
                        </tr>
                      ) : (
                        bulkItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-orange-50 dark:hover:bg-slate-600/50 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateBulkRow(idx, 'name', e.target.value)}
                                placeholder="Item name"
                                className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </td>
                            {treatmentTab === 'diagnoses' && (
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.code}
                                  onChange={(e) => updateBulkRow(idx, 'code', e.target.value)}
                                  placeholder="ICD Code"
                                  className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                              </td>
                            )}
                            {treatmentTab === 'treatments' && (
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.cost}
                                  onChange={(e) => updateBulkRow(idx, 'cost', e.target.value)}
                                  placeholder="0"
                                  className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.category}
                                onChange={(e) => updateBulkRow(idx, 'category', e.target.value)}
                                placeholder="Category"
                                className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateBulkRow(idx, 'description', e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => removeBulkRow(idx)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleBulkAdd}
                    disabled={loading || bulkItems.length === 0}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Add All Items
                  </button>
                  <button
                    onClick={() => {
                      setBulkMode(false);
                      setBulkItems([]);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Items Table */}
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      {treatmentTab === 'diagnoses' && (
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Code</th>
                      )}
                      {treatmentTab === 'treatments' && (
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Cost</th>
                      )}
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Category</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {(treatmentTab === 'findings' ? clinicalFindings :
                      treatmentTab === 'diagnoses' ? diagnoses :
                      suggestedTreatments).map(item => (
                      <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-white">{item.name}</p>
                        </td>
                        {treatmentTab === 'diagnoses' && (
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                            {item.code || '-'}
                          </td>
                        )}
                        {treatmentTab === 'treatments' && (
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                            ₹{item.cost?.toLocaleString('en-IN') || '0'}
                          </td>
                        )}
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                            {item.category || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeleteTreatmentItem(item._id, treatmentTab)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h3>
              <button
                onClick={() => setShowServiceModal(false)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitService} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Service Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g., Root Canal Treatment"
                  value={serviceFormData.name}
                  onChange={handleServiceChange}
                  required
                  className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <input
                    type="text"
                    name="category"
                    placeholder="e.g., Endodontics"
                    value={serviceFormData.category}
                    onChange={handleServiceChange}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Cost (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="cost"
                    placeholder="0"
                    value={serviceFormData.cost}
                    onChange={handleServiceChange}
                    required
                    min="0"
                    step="100"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <textarea
                  name="description"
                  placeholder="Optional description"
                  value={serviceFormData.description}
                  onChange={handleServiceChange}
                  rows="3"
                  className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={serviceFormData.isActive}
                  onChange={handleServiceChange}
                  className="w-5 h-5 rounded cursor-pointer"
                />
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark as Active
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-600 text-white font-semibold text-sm transition-colors ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDoctor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={doctorFormData.name}
                  onChange={handleDoctorChange}
                  required
                  className="col-span-2 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  name="specialization"
                  placeholder="Specialization"
                  value={doctorFormData.specialization}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  name="qualification"
                  placeholder="Qualification (BDS/MDS)"
                  value={doctorFormData.qualification}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={doctorFormData.email}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone"
                  value={doctorFormData.phone}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  name="license_number"
                  placeholder="License Number"
                  value={doctorFormData.license_number}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="number"
                  name="experience_years"
                  placeholder="Years of Experience"
                  value={doctorFormData.experience_years}
                  onChange={handleDoctorChange}
                  min="0"
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={doctorFormData.is_active}
                  onChange={handleDoctorChange}
                  className="w-5 h-5 rounded cursor-pointer"
                />
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark as Active
                </label>
              </div>

              {/* Availability */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Weekly Availability</h4>
                <div className="space-y-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                    <div key={day} className="flex items-center gap-3">
                      <label className="w-24 text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {day}
                      </label>
                      <input
                        type="time"
                        name={`availability_${day}_start`}
                        value={doctorFormData.availability[day]?.start || ''}
                        onChange={handleDoctorChange}
                        className="flex-1 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="time"
                        name={`availability_${day}_end`}
                        value={doctorFormData.availability[day]?.end || ''}
                        onChange={handleDoctorChange}
                        className="flex-1 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <textarea
                name="notes"
                placeholder="Additional Notes"
                value={doctorFormData.notes}
                onChange={handleDoctorChange}
                rows="3"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 resize-none"
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-600 text-white font-semibold text-sm transition-colors ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Saving...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
