import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, X, Check } from 'lucide-react';

interface PasswordPromptModalProps {
  isOpen: boolean;
  fileName: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  errorMessage?: string;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
  isOpen,
  fileName,
  onSubmit,
  onCancel,
  errorMessage,
}) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">Password Protected PDF</h3>
        <p className="text-xs text-slate-400 mb-4">
          <span className="font-semibold text-slate-300">{fileName}</span> is encrypted. Enter the document password to unlock and convert its contents.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Document Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Unlock & Open
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
