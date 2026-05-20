import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const RULES = [
  { label: 'At least 8 characters',          test: p => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',      test: p => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)',      test: p => /[a-z]/.test(p) },
  { label: 'One digit (0–9)',                 test: p => /[0-9]/.test(p) },
  { label: 'One symbol (!@#$…)',              test: p => /[^a-zA-Z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const navigate          = useNavigate();
  const [params]          = useSearchParams();
  const token             = params.get('token') || '';

  const [form, setForm]     = useState({ newPassword: '', confirm: '' });
  const [done, setDone]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const rulesPassed = RULES.map(r => r.test(form.newPassword));
  const allRulesPassed = rulesPassed.every(Boolean);
  const passwordsMatch = form.newPassword === form.confirm && form.confirm.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('No reset token found in the URL. Please use the link from your email.');
      return;
    }
    if (!allRulesPassed) {
      setError('Please satisfy all password requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/reset-password', { token, newPassword: form.newPassword });
      setDone(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fbff] to-[#ebf3ff] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <p className="text-red-600 font-semibold mb-4">Invalid or missing reset link.</p>
          <button onClick={() => navigate('/forgot-password')} className="text-[#137fec] font-bold hover:underline">
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fbff] to-[#ebf3ff] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md border border-white/20">
        <div className="mb-8 text-center">
          <img src="/MolarisLandscapeName.png" alt="Molaris" className="h-14 mx-auto mb-4 object-contain" />
          <h2 className="text-xl font-bold text-gray-800">Set a new password</h2>
          <p className="text-gray-500 text-sm mt-1">Choose a strong password for your account.</p>
        </div>

        {done ? (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-800 font-semibold mb-1">Password updated!</p>
            <p className="text-green-700 text-sm mb-5">You can now sign in with your new password.</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-[#137fec] hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl transition-all"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 px-1">New Password</label>
              <input
                type="password"
                required
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#137fec] focus:bg-white transition-all"
                placeholder="••••••••"
              />

              {form.newPassword.length > 0 && (
                <ul className="mt-3 space-y-1 px-1">
                  {RULES.map((rule, i) => (
                    <li key={i} className={`flex items-center gap-2 text-xs font-medium ${rulesPassed[i] ? 'text-green-600' : 'text-gray-400'}`}>
                      {rulesPassed[i]
                        ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /></svg>
                      }
                      {rule.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 px-1">Confirm Password</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className={`w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all ${
                  form.confirm.length > 0
                    ? passwordsMatch ? 'border-green-300 focus:border-green-400' : 'border-red-200 focus:border-red-400'
                    : 'border-gray-200 focus:border-[#137fec]'
                }`}
                placeholder="••••••••"
              />
              {form.confirm.length > 0 && !passwordsMatch && (
                <p className="mt-1 px-1 text-xs text-red-500 font-medium">Passwords do not match.</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !allRulesPassed || !passwordsMatch}
              className="w-full bg-[#137fec] hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </span>
              ) : 'Update Password'}
            </button>

            <p className="text-center text-gray-500 text-sm pt-1">
              <button type="button" onClick={() => navigate('/login')} className="text-[#137fec] font-bold hover:underline">
                Back to Sign In
              </button>
            </p>
          </form>
        )}

        <p className="text-center text-gray-300 text-xs mt-8">
          Powered by <span className="font-semibold text-gray-400">Connect Gen-AI</span>
        </p>
      </div>
    </div>
  );
}
