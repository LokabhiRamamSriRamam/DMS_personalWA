import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

const CONTENT_TYPES = ['text', 'image', 'video', 'document', 'location', 'contact'];
const RATINGS = [1, 2, 3, 4, 5];

export default function PollTemplateModal({ isOpen, onClose, template, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    options: ['1 - Very Unhappy', '2 - Unhappy', '3 - Neutral', '4 - Happy', '5 - Very Happy'],
    sendDelayMinutes: 15,
    isActive: true,
    feedbackResponses: {
      rating1: { contentType: 'text', content: { text: '' }, isEnabled: true },
      rating2: { contentType: 'text', content: { text: '' }, isEnabled: true },
      rating3: { contentType: 'text', content: { text: '' }, isEnabled: true },
      rating4: { contentType: 'text', content: { text: '' }, isEnabled: true },
      rating5: { contentType: 'text', content: { text: '' }, isEnabled: true },
    },
  });

  const [expandedRating, setExpandedRating] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (template) {
      setFormData(prev => ({
        ...prev,
        ...template,
      }));
    } else {
      setFormData({
        name: '',
        options: ['1 - Very Unhappy', '2 - Unhappy', '3 - Neutral', '4 - Happy', '5 - Very Happy'],
        sendDelayMinutes: 15,
        isActive: true,
        feedbackResponses: {
          rating1: { contentType: 'text', content: { text: '' }, isEnabled: true },
          rating2: { contentType: 'text', content: { text: '' }, isEnabled: true },
          rating3: { contentType: 'text', content: { text: '' }, isEnabled: true },
          rating4: { contentType: 'text', content: { text: '' }, isEnabled: true },
          rating5: { contentType: 'text', content: { text: '' }, isEnabled: true },
        },
      });
    }
    setErrors({});
    setExpandedRating(null);

    // Fetch WAHA feedback mappings for this tenant
    const loadWahaConfig = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('dms_user') || '{}');
        if (!user.tenantId) return;
        
        const wahaUrl = `${import.meta.env.VITE_WA_BACKEND_BASE_URL}/waha/tenant-feedback/${user.tenantId}`;
        const res = await fetch(wahaUrl, {
          headers: {
            'X-Api-Key': import.meta.env.VITE_WAHA_API_KEY || '7815f971660642e094f8a0ca675967ed'
          }
        });
        
        if (res.ok) {
          const wahaData = await res.json();
          const wahaTemplates = wahaData.templates || wahaData; // support both shapes
          if (wahaTemplates && wahaTemplates.length > 0 && mounted) {
            setFormData(prev => {
              const newResponses = { ...prev.feedbackResponses };
              wahaTemplates.forEach(t => {
                if (newResponses[`rating${t.rating}`]) {
                  newResponses[`rating${t.rating}`] = {
                    contentType: t.contentType,
                    content: t.content,
                    isEnabled: t.isEnabled !== false
                  };
                }
              });
              return { ...prev, feedbackResponses: newResponses };
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch WAHA feedback templates", err);
      }
    };
    
    if (isOpen) {
      loadWahaConfig();
    }

    return () => { mounted = false; };
  }, [template, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Poll question is required';
    if (formData.options.length !== 5) newErrors.options = 'Must have exactly 5 options';
    formData.options.forEach((opt, idx) => {
      const expected = idx + 1;
      if (!new RegExp(`^${expected}\\s-`).test(opt)) {
        newErrors[`option${idx}`] = `Must start with "${expected} -"`;
      }
    });
    if (formData.sendDelayMinutes < 0) newErrors.sendDelayMinutes = 'Delay cannot be negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. Save core poll config to DMS
      const dmsData = {
        name: formData.name,
        options: formData.options,
        sendDelayMinutes: formData.sendDelayMinutes,
        isActive: formData.isActive
      };

      if (template?.id) {
        await api.put(`/api/feedback/poll-templates/${template.id}`, dmsData);
      } else {
        await api.post(`/api/feedback/poll-templates`, dmsData);
      }

      // 2. Save feedback responses to WAHA
      const user = JSON.parse(localStorage.getItem('dms_user') || '{}');
      if (user.tenantId) {
        const wahaPayload = {
          templates: RATINGS.map(rating => {
            const resp = formData.feedbackResponses[`rating${rating}`];
            return {
              rating,
              contentType: resp.contentType,
              content: resp.content,
              isEnabled: resp.isEnabled !== false
            };
          })
        };

        const wahaUrl = `${import.meta.env.VITE_WA_BACKEND_BASE_URL}/waha/tenant-feedback/${user.tenantId}`;
        const res = await fetch(wahaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': import.meta.env.VITE_WAHA_API_KEY || '7815f971660642e094f8a0ca675967ed'
          },
          body: JSON.stringify(wahaPayload)
        });
        
        if (!res.ok) {
          throw new Error('Failed to save templates to WAHA');
        }
      }

      onSave();
      onClose();
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (idx, value) => {
    const newOptions = [...formData.options];
    newOptions[idx] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleResponseChange = (rating, field, value) => {
    const ratingKey = `rating${rating}`;
    setFormData({
      ...formData,
      feedbackResponses: {
        ...formData.feedbackResponses,
        [ratingKey]: {
          ...formData.feedbackResponses[ratingKey],
          [field]: value,
        },
      },
    });
  };

  const handleResponseContentChange = (rating, field, value) => {
    const ratingKey = `rating${rating}`;
    setFormData({
      ...formData,
      feedbackResponses: {
        ...formData.feedbackResponses,
        [ratingKey]: {
          ...formData.feedbackResponses[ratingKey],
          content: {
            ...formData.feedbackResponses[ratingKey].content,
            [field]: value,
          },
        },
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-xl font-semibold">
            {template ? 'Edit Poll Template' : 'Create Poll Template'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Section 1: Poll Question */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">Poll Question</h3>
            <div>
              <label className="block text-sm font-medium mb-2">
                Question <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., How happy are you with our service?"
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows="2"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
          </div>

          {/* Section 2: Poll Options */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-4">Poll Options (1-5 Rating)</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Exactly 5 options, must start with 1 - 5
            </p>
            <div className="space-y-2">
              {formData.options.map((option, idx) => (
                <div key={idx}>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Option {idx + 1}</label>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`${idx + 1} - `}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  {errors[`option${idx}`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`option${idx}`]}</p>
                  )}
                </div>
              ))}
            </div>
            {errors.options && <p className="text-red-500 text-sm mt-2">{errors.options}</p>}
          </div>

          {/* Section 3: Send Delay */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-4">Send Delay</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Minutes after appointment completion</label>
              <input
                type="number"
                value={formData.sendDelayMinutes}
                onChange={(e) => setFormData({ ...formData, sendDelayMinutes: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              {errors.sendDelayMinutes && (
                <p className="text-red-500 text-sm mt-1">{errors.sendDelayMinutes}</p>
              )}
            </div>
          </div>

          {/* Section 4: Feedback Responses */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-4">
              Responses for Each Rating (sent to WAHA)
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Configure what message is sent to patients after they vote
            </p>

            <div className="space-y-2">
              {RATINGS.map((rating) => {
                const ratingKey = `rating${rating}`;
                const response = formData.feedbackResponses[ratingKey];
                const isExpanded = expandedRating === rating;

                return (
                  <div key={rating} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Rating Header */}
                    <button
                      type="button"
                      onClick={() => setExpandedRating(isExpanded ? null : rating)}
                      className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          rating === 1 ? 'bg-red-500' :
                          rating === 2 ? 'bg-orange-500' :
                          rating === 3 ? 'bg-yellow-500' :
                          rating === 4 ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}>
                          {rating}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">{formData.options[rating - 1]}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {response.contentType.charAt(0).toUpperCase() + response.contentType.slice(1)} response
                          </p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {/* Response Editor */}
                    {isExpanded && (
                      <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-3">
                        {/* Enable Toggle */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={response.isEnabled}
                            onChange={(e) => handleResponseChange(rating, 'isEnabled', e.target.checked)}
                            className="rounded"
                          />
                          <label className="text-sm">Enabled</label>
                        </div>

                        {/* Content Type Selector */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Response Type</label>
                          <select
                            value={response.contentType}
                            onChange={(e) => {
                              handleResponseChange(rating, 'contentType', e.target.value);
                              // Reset content based on type
                              let newContent = {};
                              switch (e.target.value) {
                                case 'text':
                                  newContent = { text: '' };
                                  break;
                                case 'image':
                                case 'video':
                                  newContent = { url: '', caption: '' };
                                  break;
                                case 'document':
                                  newContent = { url: '', fileName: '', caption: '' };
                                  break;
                                case 'location':
                                  newContent = { degreesLatitude: 0, degreesLongitude: 0, name: '', address: '' };
                                  break;
                                default:
                                  newContent = {};
                              }
                              handleResponseChange(rating, 'content', newContent);
                            }}
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          >
                            {CONTENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Content Editor (varies by type) */}
                        {response.contentType === 'text' && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Message</label>
                            <textarea
                              value={response.content.text || ''}
                              onChange={(e) => handleResponseContentChange(rating, 'text', e.target.value)}
                              placeholder="Response message for this rating..."
                              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              rows="3"
                            />
                          </div>
                        )}

                        {(response.contentType === 'image' || response.contentType === 'video') && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-2">URL</label>
                              <input
                                type="url"
                                value={response.content.url || ''}
                                onChange={(e) => handleResponseContentChange(rating, 'url', e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Caption (optional)</label>
                              <input
                                type="text"
                                value={response.content.caption || ''}
                                onChange={(e) => handleResponseContentChange(rating, 'caption', e.target.value)}
                                placeholder="Caption for image/video"
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                          </>
                        )}

                        {response.contentType === 'document' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-2">URL</label>
                              <input
                                type="url"
                                value={response.content.url || ''}
                                onChange={(e) => handleResponseContentChange(rating, 'url', e.target.value)}
                                placeholder="https://example.com/file.pdf"
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">File Name</label>
                              <input
                                type="text"
                                value={response.content.fileName || ''}
                                onChange={(e) => handleResponseContentChange(rating, 'fileName', e.target.value)}
                                placeholder="receipt.pdf"
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Caption (optional)</label>
                              <input
                                type="text"
                                value={response.content.caption || ''}
                                onChange={(e) => handleResponseContentChange(rating, 'caption', e.target.value)}
                                placeholder="Your receipt"
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                          </>
                        )}

                        {response.contentType === 'location' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium mb-2">Latitude</label>
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={response.content.degreesLatitude || 0}
                                  onChange={(e) => handleResponseContentChange(rating, 'degreesLatitude', parseFloat(e.target.value))}
                                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Longitude</label>
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={response.content.degreesLongitude || 0}
                                  onChange={(e) => handleResponseContentChange(rating, 'degreesLongitude', parseFloat(e.target.value))}
                                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Location Name</label>
                              <input
                                type="text"
                                value={response.content.name || ''}
                                onChange={(e) => handleResponseContentChange(rating, 'name', e.target.value)}
                                placeholder="Our Clinic"
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Address</label>
                              <input
                                type="text"
                                value={response.content.address || ''}
                                onChange={(e) => handleResponseContentChange(rating, 'address', e.target.value)}
                                placeholder="123 Main St, City"
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Template Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-900 p-6 -m-6 mt-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Template & Responses'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
