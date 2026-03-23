import { useMemo, useState } from 'react';
import { Bot, SendHorizontal, X } from 'lucide-react';

const ALLOWED_TOPIC_KEYWORDS = [
  'audit',
  'trail',
  'blockchain',
  'hash',
  'verify',
  'verification',
  'tamper',
  'file',
  'inspection',
  'approver',
  'inspector',
  'auditor',
  'admin',
  'metamask',
  'wallet',
  'gas',
  'certificate',
  'ipfs',
  'mongodb',
  'smart contract',
];

const FAQ = [
  {
    match: ['how to upload', 'upload file', 'store hash'],
    answer:
      'Go to File Management -> Upload File. Upload your file, then click "Store on Blockchain" and confirm in MetaMask.',
  },
  {
    match: ['how to verify', 'verify file', 'tamper'],
    answer:
      'Use File Management -> Verify File. Enter File ID and either re-upload or provide blockchain hash. A mismatch means tampering.',
  },
  {
    match: ['role', 'admin', 'inspector', 'approver', 'auditor'],
    answer:
      'Admin registers roles. Inspector creates/submits records, Approver approves/rejects, Auditor verifies integrity and checks audit logs.',
  },
  {
    match: ['certificate', 'proof'],
    answer:
      'Certificate appears after successful blockchain store/verification. You can download it and use the QR/proof link as evidence.',
  },
  {
    match: ['blockchain event', 'activity', 'events not loading'],
    answer:
      'Ensure Hardhat node is running, contract is deployed after node restart, wallet is on chainId 31337, then refresh the panel.',
  },
  {
    match: ['analytics', 'stats', 'history'],
    answer:
      'Analytics are computed from file upload + verification history. If stale, use Refresh and ensure backend is running on port 8000.',
  },
];

function isAllowedQuestion(text) {
  const normalized = text.toLowerCase();
  return ALLOWED_TOPIC_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function answerQuestion(text) {
  const normalized = text.toLowerCase();
  const found = FAQ.find((entry) => entry.match.some((pattern) => normalized.includes(pattern)));
  if (found) return found.answer;

  return 'I can help with audit trail, blockchain workflow, verification, roles, analytics, and certificate guidance. Please ask about those areas.';
}

export default function SupportBotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hi, I am Audit Assist Bot. Ask me only about this audit trail/blockchain system.',
    },
  ]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!canSend) return;

    const question = input.trim();
    const userMessage = { id: `u-${Date.now()}`, role: 'user', text: question };
    const botText = isAllowedQuestion(question)
      ? answerQuestion(question)
      : 'I am restricted to this website topics only: audit trail, blockchain, hash verification, roles, analytics, and certificate flow.';
    const botMessage = { id: `b-${Date.now()}`, role: 'bot', text: botText };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput('');
  };

  return (
    <div className="pointer-events-auto">
      {open && (
        <div className="mb-3 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.2)]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Audit Assist Bot</p>
                <p className="text-[11px] text-slate-500">Domain-restricted support</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto bg-white px-3 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${
                  message.role === 'user'
                    ? 'ml-auto bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this system..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] transition-transform duration-200 hover:-translate-y-0.5"
        title="Open support bot"
      >
        <Bot className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
      </button>
    </div>
  );
}
