import type { Article, DailyTip, WebsiteConfig } from "../types";

interface LiveWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WebsiteConfig;
  articles: Article[];
  dailyTips?: DailyTip[];
}

/**
 * The public-site preview intentionally loads the deployed NexTake website.
 * This keeps the preview faithful to the real public information architecture
 * and prevents the admin console from presenting a second, stale mock homepage.
 * The local Live Simulator remains available for testing unsaved admin edits.
 */
export default function LiveWebsiteModal({ isOpen, onClose }: LiveWebsiteModalProps) {
  if (!isOpen) return null;

  return (
    <div id="live-website-modal" className="fixed inset-0 z-50 bg-white">
      <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between border-b border-[#0f2c45] bg-[#071A2B] px-4 py-3 text-white sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#7FFFD4] px-3 py-1.5 text-xs font-bold text-[#071A2B] shadow-sm transition-all hover:bg-[#68f0c5]"
          >
            <span aria-hidden>←</span>
            <span>Return to Admin Console</span>
          </button>
          <span className="hidden text-xs text-slate-300 sm:inline-block">
            Showing the deployed public website
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7FFFD4]/30 bg-[#0d263d] px-2.5 py-1 font-mono text-[11px] text-[#7FFFD4]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7FFFD4]" />
          Live public site
        </span>
      </div>

      <iframe
        title="NexTake public website"
        src="https://www.nextakeafrica.com/"
        className="h-full w-full border-0 pt-[57px]"
      />
    </div>
  );
}
