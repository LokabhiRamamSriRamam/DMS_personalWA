import { useState } from 'react';
import { X, Plus, Trash2, Send } from 'lucide-react';
import API from '../services/api';

const FeedbackPollModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  // Follow-up messages for each rating (1-5)
  const [followUpMessages, setFollowUpMessages] = useState({
    1: { message: '', enabled: true },
    2: { message: '', enabled: true },
    3: { message: '', enabled: true },
    4: { message: '', enabled: true },
    5: { message: '', enabled: true },
  });

  const ratingLabels = {
    1: 'Very Dissatisfied (1⭐)',
    2: 'Dissatisfied (2⭐)',
    3: 'Neutral (3⭐)',
    4: 'Satisfied (4⭐)',
    5: 'Very Satisfied (5⭐)',
  };

  const handleSaveFollowUps = async () => {
    const enabledMessages = Object.entries(followUpMessages)
      .filter(([, msg]) => msg.enabled && msg.message.trim())
      .map(([rating]) => parseInt(rating));

    if (enabledMessages.length === 0) {
      alert('Please configure at least one follow-up message');
      return;
    }

    setSubmitting(true);
    try {
      // Store follow-up messages for automatic triggering on feedback response
      await API.post('/whatsapp/feedback/followup-templates', {
        patientId: patient?._id,
        followUpMessages,
      });

      onSuccess?.();
      onClose();
      setFollowUpMessages({
        1: { message: '', enabled: true },
        2: { message: '', enabled: true },
        3: { message: '', enabled: true },
        4: { message: '', enabled: true },
        5: { message: '', enabled: true },
      });
    } catch (err) {
      console.error('Failed to save follow-up messages:', err);
      alert('Failed to save follow-up messages: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFollowUpMessages({
      1: { message: '', enabled: true },
      2: { message: '', enabled: true },
      3: { message: '', enabled: true },
      4: { message: '', enabled: true },
      5: { message: '', enabled: true },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Configure Follow-up Messages</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Patient Info */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <p className="text-sm text-teal-800">
                <span className="font-semibold">Patient:</span> {patient?.first_name} {patient?.last_name}
                <br />
                <span className="font-semibold">Phone:</span> {patient?.contact?.mobile}
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                ℹ️ <strong>Feedback Poll Setup</strong>
                <br />
                When this appointment is marked complete, a feedback poll will be automatically sent to this patient via WhatsApp.
                <br />
                <br />
                Configure below what follow-up message should be sent based on their 1-5 rating response.
              </p>
            </div>

            {/* Follow-up Messages for each rating */}
            {[5, 4, 3, 2, 1].map((rating) => (
              <div
                key={rating}
                className={`border rounded-lg p-4 transition-colors ${
                  followUpMessages[rating].enabled
                    ? 'border-slate-300 bg-white'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={followUpMessages[rating].enabled}
                      onChange={(e) =>
                        setFollowUpMessages((prev) => ({
                          ...prev,
                          [rating]: { ...prev[rating], enabled: e.target.checked },
                        }))
                      }
                      className="w-5 h-5 rounded border-slate-300 cursor-pointer"
                    />
                    <label className="font-semibold text-slate-900 cursor-pointer">
                      {ratingLabels[rating]}
                    </label>
                  </div>
                </div>

                {followUpMessages[rating].enabled && (
                  <textarea
                    value={followUpMessages[rating].message}
                    onChange={(e) =>
                      setFollowUpMessages((prev) => ({
                        ...prev,
                        [rating]: { ...prev[rating], message: e.target.value },
                      }))
                    }
                    placeholder={getPlaceholder(rating)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137fec] text-sm"
                    rows={3}
                  />
                )}
              </div>
            ))}

            {/* Pro Tips Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs text-amber-800">
                💡 <strong>Pro Tips</strong>
                <br />
                • 5⭐: Ask for Google review or referral
                <br />
                • 4⭐: Thank them and ask for improvement suggestions
                <br />
                • 3⭐: Gather feedback on what can be improved
                <br />
                • 2⭐ & 1⭐: Apologize and offer immediate follow-up
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveFollowUps}
            disabled={submitting}
            className="px-6 py-2.5 bg-[#137fec] hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={18} />
            {submitting ? 'Saving...' : 'Save Follow-up Messages'}
          </button>
        </div>
      </div>
    </div>
  );
};

function getPlaceholder(rating) {
  const placeholders = {
    5: 'e.g., Thank you for the excellent feedback! Would you like to leave us a review on Google Maps?',
    4: 'e.g., Thank you for your feedback! Is there anything we can improve for your next visit?',
    3: 'e.g., Thank you for your feedback. We\'d love to hear how we can serve you better!',
    2: 'e.g., We\'re sorry your experience wasn\'t perfect. Can we schedule a follow-up to address your concerns?',
    1: 'e.g., We sincerely apologize for your experience. Please let us know how we can make it right.',
  };
  return placeholders[rating] || '';
}

export default FeedbackPollModal;
