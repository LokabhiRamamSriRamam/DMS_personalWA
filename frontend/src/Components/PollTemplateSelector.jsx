import { useEffect, useState } from 'react';
import api from '../services/api';

export default function PollTemplateSelector({ selectedTemplateId, onTemplateSelect }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/feedback/poll-templates');
      const activeTemplates = res.data.filter((t) => t.isActive);
      setTemplates(activeTemplates);
    } catch (err) {
      console.error('Failed to fetch poll templates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading templates...</div>;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Select Poll Template
      </label>
      {templates.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
          <p>No active poll templates found.</p>
          <p className="text-xs mt-1">
            Create a poll template from the Message Templates section first.
          </p>
        </div>
      ) : (
        <select
          value={selectedTemplateId || ''}
          onChange={(e) => onTemplateSelect(e.target.value || null)}
          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
        >
          <option value="">-- No template selected --</option>
          {templates.map((template) => (
            <option key={template._id} value={template._id}>
              {template.name}
              {template.sendDelayMinutes > 0 &&
                ` (${template.sendDelayMinutes} min delay)`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
