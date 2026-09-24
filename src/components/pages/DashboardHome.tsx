import { 
  Plus, 
  Globe, 
  TrendingUp, 
  Eye, 
  Sparkles, 
  Activity,
  Layers,
  ArrowRight,
  FileText
} from "lucide-react";
import type { Article, NavPageId, SystemMetric, ActivityItem } from "../../types";

interface DashboardHomeProps {
  articles: Article[];
  metrics: SystemMetric[];
  activities: ActivityItem[];
  onNavigate: (page: NavPageId) => void;
  onOpenNewArticleModal: () => void;
}

export default function DashboardHome({
  articles,
  metrics,
  activities,
  onNavigate,
  onOpenNewArticleModal,
}: DashboardHomeProps) {
  const publishedCount = articles.filter(a => a.status === 'published').length;
  const draftCount = articles.filter(a => a.status === 'draft').length;
  const totalViews = articles.reduce((sum, a) => sum + a.views, 0);

  return (
    <div id="dashboard-home-page" className="space-y-8 bg-white text-[#071A2B]">
      
      {/* Welcome Top Banner (Selected Navy Feature Section) */}
      <section 
        id="dashboard-hero"
        className="rounded-2xl bg-[#071A2B] text-white p-6 sm:p-8 border border-[#0f2c45] shadow-sm relative overflow-hidden"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 bg-[#7FFFD4]/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d263d] border border-[#7FFFD4]/30 text-xs font-semibold text-[#7FFFD4]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NextEdit Portal Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#7FFFD4] animate-ping" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back to <span className="text-[#7FFFD4]">NexTake</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your website and technical blog are running smoothly. You have <strong className="text-white font-semibold">{draftCount} pending drafts</strong> and <strong className="text-white font-semibold">{publishedCount} live articles</strong> reaching over {totalViews.toLocaleString()} readers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="dashboard-new-article-btn"
              onClick={onOpenNewArticleModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7FFFD4] text-[#071A2B] font-bold text-sm shadow-md shadow-[#7FFFD4]/20 hover:bg-[#68f0c5] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Article</span>
            </button>
            <button
              id="dashboard-manage-website-btn"
              onClick={() => onNavigate('website')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f2c45] text-white hover:bg-[#163857] border border-[#1d476e] text-sm font-semibold transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[#7FFFD4]" />
              <span>Manage Website</span>
            </button>
          </div>
        </div>
      </section>

      {/* Metrics Row (White background cards with navy borders and aquamarine accents) */}
      <section aria-label="System Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            id={`metric-card-${idx}`}
            className="rounded-2xl bg-white border border-[#071A2B]/15 p-5 shadow-xs hover:border-[#071A2B]/30 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {metric.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7FFFD4]/20 text-[#071A2B] border border-[#7FFFD4]/40">
                <TrendingUp className="w-3 h-3 text-[#071A2B]" />
                {metric.change}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#071A2B] tracking-tight">
                {metric.value}
              </span>
            </div>

            {/* Progress indicator with Aquamarine accent */}
            <div className="space-y-1 pt-1">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#7FFFD4] h-full rounded-full"
                  style={{ width: `${metric.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono text-[#071A2B]">{metric.technicalDetail}</span>
                <span className="font-semibold text-[#071A2B]">{metric.progressPercent}%</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Two Column Layout: Recent Articles & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recent Articles (8 cols) */}
        <section className="lg:col-span-8 rounded-2xl bg-white border border-[#071A2B]/15 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
            <div>
              <h2 className="text-lg font-bold text-[#071A2B] tracking-tight">
                Recent Content & Articles
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of latest published materials and active drafts in NextEdit
              </p>
            </div>
            <button
              onClick={() => onNavigate('blog')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#071A2B] hover:text-[#0a3154] cursor-pointer group"
            >
              <span>View all ({articles.length})</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="space-y-3.5">
            {articles.slice(0, 4).map((article) => (
              <div
                key={article.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-[#071A2B]/10 hover:border-[#071A2B]/30 hover:bg-slate-50/50 transition-all gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-14 h-14 rounded-lg object-cover shrink-0 border border-[#071A2B]/10"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#7FFFD4]/25 text-[#071A2B] border border-[#7FFFD4]/50">
                        {article.category}
                      </span>
                      {article.isNew && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#7FFFD4] text-[#071A2B] tracking-wide">
                          NEW
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        article.status === 'published' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {article.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#071A2B] truncate group-hover:text-purple-900 transition-colors">
                      {article.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{article.author}</span>
                      <span>•</span>
                      <span>{article.date}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.views.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  <button
                    onClick={() => onNavigate('blog')}
                    className="px-3 py-1.5 text-xs font-semibold text-[#071A2B] bg-slate-100 hover:bg-[#7FFFD4] hover:text-[#071A2B] rounded-lg transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={onOpenNewArticleModal}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#071A2B] hover:text-[#0c2f50] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#071A2B]" />
              <span>Write a new blog post</span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Auto-synced with Git repository
            </span>
          </div>
        </section>

        {/* Right Column: Live Activity Feed & Quick Controls (4 cols) */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Quick Page Jump Card */}
          <div className="rounded-2xl bg-white border border-[#071A2B]/15 p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#071A2B] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#071A2B]" />
              Quick Navigation
            </h2>
            <div className="space-y-2">
              <button
                id="jump-to-website-btn"
                onClick={() => onNavigate('website')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-[#7FFFD4]/15 border border-[#071A2B]/10 hover:border-[#7FFFD4]/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#071A2B] block">Website Structure</span>
                    <span className="text-[11px] text-slate-500">Edit hero & layout</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#071A2B] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                id="jump-to-blog-btn"
                onClick={() => onNavigate('blog')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-[#7FFFD4]/15 border border-[#071A2B]/10 hover:border-[#7FFFD4]/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#071A2B] block">Blog & Editor</span>
                    <span className="text-[11px] text-slate-500">Draft, edit & publish</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#071A2B] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Activity Log */}
          <div className="rounded-2xl bg-white border border-[#071A2B]/15 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#071A2B] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#071A2B]" />
                Recent Audit Log
              </h2>
              <span className="text-[10px] font-mono text-[#071A2B] font-semibold bg-[#7FFFD4]/30 px-2 py-0.5 rounded">
                Live
              </span>
            </div>

            <div className="space-y-3.5">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs pb-3 border-b border-[#071A2B]/5 last:border-b-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-[#7FFFD4] mt-1.5 shrink-0 ring-4 ring-[#7FFFD4]/20" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-[#071A2B]">
                      {act.action}
                    </p>
                    <p className="text-slate-500 truncate">
                      {act.target}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{act.timestamp}</span>
                      <span>•</span>
                      <span>{act.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

      </div>

    </div>
  );
}
