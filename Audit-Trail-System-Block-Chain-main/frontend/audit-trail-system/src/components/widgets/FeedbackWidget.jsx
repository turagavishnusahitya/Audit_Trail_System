import { useMemo, useState } from 'react';
import { MessageSquareText, Star, Send, X } from 'lucide-react';
import { api } from '../../utils/api';
import { useBlockchain } from '../../context/BlockchainContext';

const CATEGORIES = [
  'General',
  'UI/UX',
  'File Verification',
  'Blockchain',
  'Performance',
  'Bug Report',
];

export default function FeedbackWidget() {
  const { account } = useBlockchain();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    rating: 4,
    category: 'General',
    message: '',
  });

  const canSubmit = useMemo(() => form.message.trim().length >= 5 && form.rating >= 1 && form.rating <= 5, [form]);

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setSuccess('');
    setError('');
    try {
      await api.submitFeedback({
        ...form,
        page: window.location.pathname,
        wallet: account || null,
      });
      setSuccess('Thank you! Your feedback has been submitted.');
      setForm((prev) => ({ ...prev, message: '' }));
    } catch (err) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pointer-events-auto">
      {open && (
        <div className="mb-3 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.2)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Share Feedback</h3>
              <p className="text-xs text-slate-500">Help us improve this audit platform.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form className="space-y-3" onSubmit={submitFeedback}>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Name (optional)"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, rating: value }))}
                    className="rounded p-1"
                    aria-label={`Rate ${value} stars`}
                  >
                    <Star
                      className={`h-4 w-4 ${value <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Tell us what can be improved..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400"
            />

            {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>}
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)] transition-transform duration-200 hover:-translate-y-0.5"
        title="Share feedback"
      >
        <MessageSquareText className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
      </button>
    </div>
  );
}
