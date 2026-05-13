import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext.jsx';
import api from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsPending(false);
    setLoading(true);
    try {
      const res = await api.post('/users/login', form);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      if (msg.toLowerCase().includes('pending')) {
        setIsPending(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fbff] to-[#ebf3ff] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md border border-white/20">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <img
            src="/MolarisLandscapeName.png"
            alt="Molaris"
            className="h-16 mx-auto mb-4 object-contain"
          />
          <p className="text-gray-500 mt-2 font-medium">Welcome back to your practice</p>
        </div>

        {isPending ? (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-amber-900 font-bold text-lg mb-2">Account Pending Approval</h3>
            <p className="text-amber-800 text-sm leading-relaxed mb-6">
              Your registration has been received and is currently being reviewed by our administration team. 
              You will gain access once your clinic is verified.
            </p>
            <button 
              onClick={() => setIsPending(false)}
              className="text-amber-700 font-bold text-sm hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 px-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#137fec] focus:bg-white transition-all"
                  placeholder="doctor@clinic.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 px-1">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#137fec] focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-shake">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#137fec] hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-gray-100 space-y-3 text-center">
              <p className="text-gray-500 font-medium">
                New to the platform?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-[#137fec] font-bold hover:underline"
                >
                  Create Admin Account
                </button>
              </p>
              <p className="text-gray-400 text-sm">
                Want to register your clinic?{' '}
                <a href="mailto:sales@connectgenai.in" className="text-[#137fec] font-semibold hover:underline">
                  sales@connectgenai.in
                </a>
              </p>
              <p className="text-gray-400 text-sm">
                Need help?{' '}
                <a href="mailto:support@connectgenai.in" className="text-[#137fec] font-semibold hover:underline">
                  support@connectgenai.in
                </a>
                {' '}— we respond within 6 hours
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
