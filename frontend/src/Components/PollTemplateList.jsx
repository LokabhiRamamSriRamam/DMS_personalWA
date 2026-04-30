import { useEffect, useState } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import api from '../services/api';
import PollTemplateModal from './PollTemplateModal';

export default function PollTemplateList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/feedback/poll-templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to fetch poll templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate({ ...template, id: template._id });
    setIsModalOpen(true);
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this poll template?')) return;
    try {
      await api.delete(`/api/feedback/poll-templates/${templateId}`);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const handleSave = () => {
    fetchTemplates();
  };

  if (loading) {
    return <div className="text-center py-8">Loading poll templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Feedback Poll Templates</h3>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          New Poll Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <p>No poll templates created yet.</p>
          <p className="text-sm">Create one to use as your feedback survey.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div
              key={template._id}
              className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.options.length} options
                    {template.sendDelayMinutes > 0 && ` • Send after ${template.sendDelayMinutes} min`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {template.isActive ? (
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 text-xs px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Options preview */}
              <div className="mb-3 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                {template.options.map((option, idx) => (
                  <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    {option}
                  </p>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-sm"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(template._id)}
                  className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PollTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        template={selectedTemplate}
        onSave={handleSave}
      />
    </div>
  );
}
