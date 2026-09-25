import { LogOut, CheckCircle2 } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
}

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirmLogout,
}: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      id="logout-confirmation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl border border-[#071A2B]/20 w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-in">
        
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <LogOut className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#071A2B] tracking-tight">
            Log out of NexTake?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            You will end your active session as <strong className="text-[#071A2B]">NexTake Admin</strong> (admin@nexstake.com). Any unsaved draft changes have already been preserved locally.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex items-center justify-between font-semibold text-[#071A2B]">
            <span>Security Check</span>
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Session tokens will be safely cleared.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#071A2B]/20 text-xs font-semibold text-[#071A2B] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Stay Signed In
          </button>
          
          <button
            type="button"
            onClick={onConfirmLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#071A2B] text-white hover:bg-rose-700 text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <span>Confirm Log Out</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
