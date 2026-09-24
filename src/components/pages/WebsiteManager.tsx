import { useState, useMemo } from "react";
import { 
  Save, 
  CheckCircle2, 
  RotateCcw, 
  ExternalLink, 
  Sliders, 
  Layers, 
  Sparkles,
  Plus,
  Trash2,
  Check,
  Edit3,
  Search,
  X,
  FileText,
  ArrowRight,
  Send,
} from "lucide-react";

import type { WebsiteConfig, Article, DailyTip } from "../../types";
import NexTakeLogo from "../NexTakeLogo";

interface WebsiteManagerProps {
  config: WebsiteConfig;
  onUpdateConfig: (newConfig: WebsiteConfig) => void;
  onOpenLiveSite: () => void;

  articles: Article[];
  onUpdateArticle: (article: Article) => void;

  dailyTips: DailyTip[];
  onCreateDailyTip: (tip: DailyTip) => void;
  onUpdateDailyTip: (tip: DailyTip) => void;
  onDeleteDailyTip: (id: string) => void;
}

export default function WebsiteManager({
  config,
  onUpdateConfig,
  onOpenLiveSite,
  articles,
  onUpdateArticle,
  dailyTips,
  onCreateDailyTip,
  onUpdateDailyTip,
  onDeleteDailyTip,
}: WebsiteManagerProps) {
  const [form, setForm] = useState<WebsiteConfig>(config);
  const [configPublishMessage, setConfigPublishMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Search & filter state for the blog posts box
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Post Editing Modal State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    category: string;
    excerpt: string;
    content: string;
    author: string;
    status: 'published' | 'draft' | 'scheduled';
    image: string;
  }>({
    title: "",
    category: "Software Engineering",
    excerpt: "",
    content: "",
    author: "",
    status: "published",
    image: "",
  });
  const [postSaveSuccessMessage, setPostSaveSuccessMessage] = useState<string | null>(null);
  
  // Daily Tips Modal State
const [isDailyTipModalOpen, setIsDailyTipModalOpen] = useState(false);
const [editingDailyTip, setEditingDailyTip] = useState<DailyTip | null>(null);

const [dailyTipForm, setDailyTipForm] = useState<{
  title: string;
  content: string;
  category: string;
  image: string;
  author: string;
  status: "draft" | "published";
}>({
  title: "",
  content: "",
  category: "Finance",
  image: "",
  author: "",
  status: "draft",
});

  const showConfigPublishMessage = (message: string) => {
    setConfigPublishMessage(message);
    setTimeout(() => setConfigPublishMessage(null), 3000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(form);
    showConfigPublishMessage("Full website configuration published successfully.");
  };

  const handlePublishHeroSection = () => {
    onUpdateConfig({
      ...config,
      siteName: form.siteName,
      tagline: form.tagline,
      heroBadge: form.heroBadge,
      heroTitle: form.heroTitle,
      heroSubtitle: form.heroSubtitle,
    });

    showConfigPublishMessage("Hero section sent live separately.");
  };

  const handlePublishDailyEditSection = () => {
    onUpdateConfig({
      ...config,
      newsletterEnabled: form.newsletterEnabled,
      dailyEditLabel: form.dailyEditLabel,
      newsletterHeadline: form.newsletterHeadline,
      newsletterDescription: form.newsletterDescription,
      newsletterInputPlaceholder: form.newsletterInputPlaceholder,
      newsletterButtonText: form.newsletterButtonText,
    });

    showConfigPublishMessage("The Daily Edit section sent live separately.");
  };

  const handleReset = () => {
    setForm(config);
  };

  const handleAddNavLink = () => {
    setForm({
      ...form,
      navLinks: [...form.navLinks, { label: "New Link", href: "#", active: true }],
    });
  };

  const handleRemoveNavLink = (index: number) => {
    setForm({
      ...form,
      navLinks: form.navLinks.filter((_, i) => i !== index),
    });
  };

  const handleNavLinkChange = (index: number, label: string, href: string) => {
    const updated = [...form.navLinks];
    updated[index] = { ...updated[index], label, href };
    setForm({ ...form, navLinks: updated });
  };

  // Trigger editing for a specific blog post
  const handleOpenEditPost = (article: Article) => {
    setEditingArticle(article);
    setEditFormData({
      title: article.title,
      category: article.category,
      excerpt: article.excerpt,
      content: article.content,
      author: article.author,
      status: article.status,
      image: article.image,
    });
  };

  const handleCloseEditPost = () => {
    setEditingArticle(null);
  };

  const handleSaveEditedPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    const updated: Article = {
      ...editingArticle,
      ...editFormData,
    };

    onUpdateArticle(updated);
    setPostSaveSuccessMessage(`Successfully updated "${updated.title}" on the main blog website!`);
    setEditingArticle(null);

    setTimeout(() => {
      setPostSaveSuccessMessage(null);
    }, 4000);
  };
  // ============================================================
// DAILY TIPS HANDLERS
// ============================================================

const handleCreateNewDailyTip = () => {
  setEditingDailyTip(null);

  setDailyTipForm({
    title: "",
    content: "",
    category: "Finance",
    image: "",
    author: "",
    status: "draft",
  });

  setIsDailyTipModalOpen(true);
};

const handleOpenEditDailyTip = (tip: DailyTip) => {
  setEditingDailyTip(tip);

  setDailyTipForm({
    title: tip.title,
    content: tip.content,
    category: tip.category,
    image: tip.image || "",
    author: tip.author || "",
    status: tip.status,
  });

  setIsDailyTipModalOpen(true);
};

const handleCloseDailyTipModal = () => {
  setIsDailyTipModalOpen(false);
  setEditingDailyTip(null);
};

const handleSaveDailyTip = (e: React.FormEvent) => {
  e.preventDefault();

  const title = dailyTipForm.title.trim();
  const content = dailyTipForm.content.trim();

  if (!title || !content) {
    return;
  }

  if (editingDailyTip) {
    onUpdateDailyTip({
      ...editingDailyTip,
      title,
      content,
      category: dailyTipForm.category.trim(),
      image: dailyTipForm.image.trim(),
      author: dailyTipForm.author.trim(),
      status: dailyTipForm.status,
      updated_at: new Date().toISOString(),
    });
  } else {
    onCreateDailyTip({
      id: crypto.randomUUID(),
      title,
      content,
      category: dailyTipForm.category.trim(),
      image: dailyTipForm.image.trim(),
      author: dailyTipForm.author.trim(),
      status: dailyTipForm.status,
      published_at:
        dailyTipForm.status === "published"
          ? new Date().toISOString()
          : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  handleCloseDailyTipModal();
};

  // Filter articles in the "Website Blog Posts" box
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesSearch = 
        art.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
        art.excerpt.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
        art.author.toLowerCase().includes(articleSearchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategoryFilter === 'all' || art.category === selectedCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [articles, articleSearchQuery, selectedCategoryFilter]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(articles.map(a => a.category)));
    return ['all', ...unique];
  }, [articles]);

  return (
    <div className="space-y-8 animate-fade-in text-[#071A2B]">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#071A2B]/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#071A2B]">
            Website Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure the public landing page, manage navigation, and inspect or edit live blog posts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Modes */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white text-[#071A2B] shadow-xs'
                  : 'text-slate-500 hover:text-[#071A2B]'
              }`}
            >
              Config & Posts
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-[#071A2B] shadow-xs'
                  : 'text-slate-500 hover:text-[#071A2B]'
              }`}
            >
              Live Simulator
            </button>
          </div>

          <button
            onClick={onOpenLiveSite}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#071A2B] text-white hover:bg-[#0f2c45] text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <span>Launch Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#7FFFD4]" />
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {configPublishMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs font-semibold animate-slide-down">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{configPublishMessage}</span>
          </div>
        </div>
      )}

      {postSaveSuccessMessage && (
        <div className="p-4 rounded-xl bg-[#7FFFD4]/20 border border-[#7FFFD4] text-[#071A2B] flex items-center justify-between text-xs font-bold animate-slide-down shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{postSaveSuccessMessage}</span>
          </div>
          <button 
            onClick={() => setPostSaveSuccessMessage(null)}
            className="text-slate-500 hover:text-[#071A2B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE REQUEST: PLACE TO CHECK ALL BLOGS POSTED ON MAIN WEBSITE          */}
      {/* Small interactive boxes with click-to-edit capability                      */}
      {/* ========================================================================= */}
      <section 
        id="main-website-blog-feed-box"
        className="rounded-2xl bg-white border-2 border-[#071A2B]/15 p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#071A2B]/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#071A2B] tracking-tight">
                Main Blog Website Articles
              </h2>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#7FFFD4] text-[#071A2B] shadow-xs">
                Live Feed ({articles.length})
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Check all posts made to the main blog website. <strong className="text-[#071A2B]">Click any box below to edit the live post</strong> immediately.
            </p>
          </div>

          {/* Quick Filter & Search for the blog boxes */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={articleSearchQuery}
                onChange={(e) => setArticleSearchQuery(e.target.value)}
                placeholder="Search live posts..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#071A2B]/20 bg-slate-50 text-xs text-[#071A2B] focus:outline-none focus:border-[#071A2B] focus:bg-white w-44 sm:w-52"
              />
              {articleSearchQuery && (
                <button
                  onClick={() => setArticleSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#071A2B]/20 bg-slate-50 text-xs font-semibold text-[#071A2B] focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Small Blog Boxes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredArticles.map((art) => (
            <div
              key={art.id}
              id={`website-blog-box-${art.id}`}
              onClick={() => handleOpenEditPost(art)}
              className="group relative flex flex-col justify-between p-4 rounded-xl border border-[#071A2B]/15 bg-white hover:border-[#071A2B] hover:shadow-md transition-all cursor-pointer text-left overflow-hidden"
              title="Click this box to edit the post"
            >
              {/* Cover Image Thumbnail with Category Badge */}
              <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-slate-100 mb-3 border border-slate-100">
                <img
                  src={art.image}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#7FFFD4] text-[#071A2B] shadow-xs">
                  {art.category}
                </span>
                
                <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
                  art.status === 'published'
                    ? 'bg-[#071A2B] text-[#7FFFD4]'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {art.status === 'published' ? 'LIVE' : 'DRAFT'}
                </span>

                {/* Hover Quick Edit Badge */}
                <div className="absolute inset-0 bg-[#071A2B]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-xs">
                  <Edit3 className="w-4 h-4 text-[#7FFFD4]" />
                  <span>Click to Edit Post</span>
                </div>
              </div>

              {/* Title & Excerpt */}
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-bold text-[#071A2B] leading-snug group-hover:text-purple-900 line-clamp-2">
                  {art.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {art.excerpt}
                </p>
              </div>

              {/* Box Footer info & Edit action trigger */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                  {art.author}
                </span>
                <div className="inline-flex items-center gap-1 text-[#071A2B] font-bold text-[11px] group-hover:text-[#071A2B] transition-colors">
                  <span className="group-hover:underline">Edit</span>
                  <Edit3 className="w-3 h-3 text-[#071A2B]" />
                </div>
              </div>
            </div>
          ))}

          {filteredArticles.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No live blog posts match your filter criteria.</p>
              <button
                onClick={() => { setArticleSearchQuery(""); setSelectedCategoryFilter("all"); }}
                className="text-xs font-bold text-[#071A2B] underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
              {/* ========================================================================= */}
      {/* DAILY TIPS MANAGEMENT                                                     */}
      {/* ========================================================================= */}
      <section
        id="daily-tips-management"
        className="rounded-2xl bg-white border-2 border-[#071A2B]/15 p-6 sm:p-8 shadow-sm space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#071A2B]/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>

              <h2 className="text-lg sm:text-xl font-black text-[#071A2B] tracking-tight">
                Daily Tips
              </h2>

              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#7FFFD4] text-[#071A2B] shadow-xs">
                {dailyTips.length} Tips
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Create short-form tips and publish them directly to the public website.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateNewDailyTip}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#071A2B] text-white hover:bg-[#0f2c45] text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#7FFFD4]" />
            <span>New Daily Tip</span>
          </button>
        </div>

        {/* Daily Tips Grid */}
        {dailyTips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {dailyTips.map((tip) => (
              <div
                key={tip.id}
                className="group relative flex flex-col rounded-xl border border-[#071A2B]/15 bg-white hover:border-[#071A2B] hover:shadow-md transition-all overflow-hidden"
              >
                {/* Image */}
                <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                  {tip.image ? (
                    <img
                      src={tip.image}
                      alt={tip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#071A2B]/5">
                      <Sparkles className="w-8 h-8 text-[#071A2B]/30" />
                    </div>
                  )}

                  {/* Category */}
                  <span className="absolute top-2 left-2 text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#7FFFD4] text-[#071A2B] shadow-xs">
                    {tip.category || "Daily Tip"}
                  </span>

                  {/* Status */}
                  <span
                    className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
                      tip.status === "published"
                        ? "bg-[#071A2B] text-[#7FFFD4]"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {tip.status === "published" ? "LIVE" : "DRAFT"}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="text-sm font-bold text-[#071A2B] leading-snug line-clamp-2">
                    {tip.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {tip.content}
                  </p>

                  {/* Footer */}
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 mt-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Author
                      </p>

                      <p className="text-xs font-semibold text-[#071A2B] truncate max-w-[120px]">
                        {tip.author || "Admin"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditDailyTip(tip)}
                        className="p-2 rounded-lg text-slate-500 hover:text-[#071A2B] hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Daily Tip"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete "${tip.title}"?`
                          );

                          if (confirmed) {
                            onDeleteDailyTip(tip.id);
                          }
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Daily Tip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-14 text-center border border-dashed border-slate-200 rounded-xl">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#7FFFD4]/20 text-[#071A2B] flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="mt-4 text-sm font-bold text-[#071A2B]">
              No Daily Tips Yet
            </h3>

            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Create your first Daily Tip and publish it to the public website.
            </p>

            <button
              type="button"
              onClick={handleCreateNewDailyTip}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071A2B] text-white text-xs font-bold hover:bg-[#0f2c45] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#7FFFD4]" />
              Create First Tip
            </button>
          </div>
        )}
      </section>
      </section>

      {/* Main Tabs: Editor Config vs Live Simulator */}
      {activeTab === 'editor' ? (
        <form onSubmit={handleSaveConfig} className="space-y-8">
          
          {/* Section 1: Brand & Hero Configuration */}
          <section className="rounded-2xl bg-white border border-[#071A2B]/15 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#071A2B]">
                    Hero & Landing Identity
                  </h2>
                  <p className="text-xs text-slate-500">
                    Controls what visitors see upon landing on your site
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">Hero</span>
                <button
                  type="button"
                  onClick={handlePublishHeroSection}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#071A2B] px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-[#0f2c45] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#7FFFD4]" />
                  <span>Send Hero Live</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Brand / Website Name
                </label>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Badge Pill Text
                </label>
                <input
                  type="text"
                  value={form.heroBadge}
                  onChange={(e) => setForm({ ...form, heroBadge: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Main Headline
                </label>
                <input
                  type="text"
                  value={form.heroTitle}
                  onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-bold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                  required
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Hero Subtitle / Description
                </label>
                <textarea
                  rows={2}
                  value={form.heroSubtitle}
                  onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-normal focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Interactive Feature Toggles */}
          <section className="rounded-2xl bg-white border border-[#071A2B]/15 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#071A2B]">
                    Landing Page Features & Modules
                  </h2>
                  <p className="text-xs text-slate-500">
                    Enable or disable interactive widgets on the public website
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">Modules</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search Bar Toggle */}
              <div 
                onClick={() => setForm({ ...form, searchEnabled: !form.searchEnabled })}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  form.searchEnabled 
                    ? 'border-[#7FFFD4] bg-[#7FFFD4]/10' 
                    : 'border-[#071A2B]/15 bg-slate-50 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#071A2B]">
                    Search Widget
                  </span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    form.searchEnabled ? 'bg-[#071A2B] text-[#7FFFD4]' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {form.searchEnabled ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  Allow visitors to search articles instantly by title and content.
                </p>
              </div>

              {/* Category Filter Toggle */}
              <div 
                onClick={() => setForm({ ...form, categoryFilterEnabled: !form.categoryFilterEnabled })}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  form.categoryFilterEnabled 
                    ? 'border-[#7FFFD4] bg-[#7FFFD4]/10' 
                    : 'border-[#071A2B]/15 bg-slate-50 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#071A2B]">
                    Category Badges
                  </span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    form.categoryFilterEnabled ? 'bg-[#071A2B] text-[#7FFFD4]' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {form.categoryFilterEnabled ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  Display active Aquamarine category tags on posts.
                </p>
              </div>

              {/* The Daily Edit Toggle */}
              <div 
                onClick={() => setForm({ ...form, newsletterEnabled: !form.newsletterEnabled })}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  form.newsletterEnabled 
                    ? 'border-[#7FFFD4] bg-[#7FFFD4]/10' 
                    : 'border-[#071A2B]/15 bg-slate-50 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#071A2B]">
                    The Daily Edit
                  </span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    form.newsletterEnabled ? 'bg-[#071A2B] text-[#7FFFD4]' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {form.newsletterEnabled ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                  </div>
                </div>
                <p className="text-xs text-slate-600">
                  Show the Daily Edit signup module on the public blog page.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: The Daily Edit */}
          <section className="rounded-2xl bg-white border border-[#071A2B]/15 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#071A2B]">
                    The Daily Edit Section
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure the Daily Edit signup block shown on the public blog page footer.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">Signup module</span>
                <button
                  type="button"
                  onClick={handlePublishDailyEditSection}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#071A2B] px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-[#0f2c45] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#7FFFD4]" />
                  <span>Send Daily Edit Live</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Daily Edit Label
                </label>
                <input
                  type="text"
                  value={form.dailyEditLabel}
                  onChange={(e) => setForm({ ...form, dailyEditLabel: e.target.value })}
                  placeholder="The Daily Edit"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Button Text
                </label>
                <input
                  type="text"
                  value={form.newsletterButtonText}
                  onChange={(e) => setForm({ ...form, newsletterButtonText: e.target.value })}
                  placeholder="Subscribe"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Headline
                </label>
                <input
                  type="text"
                  value={form.newsletterHeadline}
                  onChange={(e) => setForm({ ...form, newsletterHeadline: e.target.value })}
                  placeholder="Get The Daily Edit in your inbox"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.newsletterDescription}
                  onChange={(e) => setForm({ ...form, newsletterDescription: e.target.value })}
                  placeholder="Write the short supporting copy shown beneath the Daily Edit headline."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-normal focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Email Input Placeholder
                </label>
                <input
                  type="text"
                  value={form.newsletterInputPlaceholder}
                  onChange={(e) => setForm({ ...form, newsletterInputPlaceholder: e.target.value })}
                  placeholder="Enter your work email"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-normal focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Navigation Links Management */}
          <section className="rounded-2xl bg-white border border-[#071A2B]/15 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#071A2B]">
                    Top Navigation Links
                  </h2>
                  <p className="text-xs text-slate-500">
                    Links displayed in the public header navigation bar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddNavLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7FFFD4] text-[#071A2B] text-xs font-bold hover:bg-[#68f0c5] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>

            <div className="space-y-3">
              {form.navLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => handleNavLinkChange(idx, e.target.value, link.href)}
                    placeholder="Link Label (e.g. Products)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[#071A2B]/20 text-xs font-semibold text-[#071A2B]"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => handleNavLinkChange(idx, link.label, e.target.value)}
                    placeholder="Destination (e.g. #products)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[#071A2B]/20 text-xs font-mono text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveNavLink(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove Link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Form Bottom Save Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-[#071A2B]/10">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7FFFD4] text-[#071A2B] font-bold text-sm shadow-md shadow-[#7FFFD4]/20 hover:bg-[#68f0c5] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Publish Full Website Config</span>
            </button>
          </div>

        </form>
      ) : (
        /* Live Preview Mode */
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-[#071A2B]/20 overflow-hidden shadow-lg bg-white">
            
            {/* Mock Browser Header in Deep Navy */}
            <div className="bg-[#071A2B] px-4 py-3 flex items-center justify-between text-white border-b border-[#0f2c45]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-[#7FFFD4] inline-block" />
                </div>
                <span className="text-xs font-mono text-slate-300 ml-2">
                  https://nextake.dev/ (Previewing {form.siteName})
                </span>
              </div>
              <span className="text-[11px] font-bold bg-[#7FFFD4] text-[#071A2B] px-2 py-0.5 rounded">
                LIVE RENDERING
              </span>
            </div>

            {/* Embedded Live Simulation */}
            {/* Live Simulation Top Header with NexTake Image */}
            <div className="bg-[#071A2B] text-white px-6 py-3.5 flex items-center justify-between border-b border-[#0f2c45]">
              <div className="flex items-center gap-3">
                <NexTakeLogo size="sm" />
              </div>
              <div className="hidden sm:flex items-center gap-5 text-xs text-slate-300 font-medium">
                {form.navLinks.filter(l => l.active).map(link => (
                  <span key={link.label} className="hover:text-[#7FFFD4] transition-colors">{link.label}</span>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-10 space-y-12 bg-white">
              
              {/* Preview Hero */}
              <div className="text-center max-w-3xl mx-auto space-y-5 pt-6 pb-8">
                {form.heroBadge && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#7FFFD4]/20 text-[#071A2B] text-xs font-bold border border-[#7FFFD4]/40">
                    <Sparkles className="w-3 h-3 text-[#071A2B]" />
                    {form.heroBadge}
                  </span>
                )}
                <h1 className="text-3xl sm:text-5xl font-black text-[#071A2B] tracking-tight">
                  {form.heroTitle}
                </h1>
                <p className="text-base text-slate-600 max-w-xl mx-auto">
                  {form.heroSubtitle}
                </p>

                {form.searchEnabled && (
                  <div className="max-w-md mx-auto pt-2">
                    <input
                      type="text"
                      disabled
                      placeholder="Search industry news, tech articles..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 placeholder:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Preview Article Grid (Clickable to edit!) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#071A2B] uppercase tracking-wider">
                    Main Blog Articles (Click to Edit)
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Interactive</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((art) => (
                    <div 
                      key={art.id} 
                      onClick={() => handleOpenEditPost(art)}
                      className="group rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs hover:border-[#071A2B] hover:shadow-md transition-all cursor-pointer"
                      title="Click to edit this post"
                    >
                      <div className="relative">
                        <img src={art.image} alt={art.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-[#071A2B]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                          <Edit3 className="w-4 h-4 text-[#7FFFD4]" />
                          <span>Edit Post</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-2.5">
                        <span className="text-xs font-bold text-[#071A2B] bg-[#7FFFD4]/25 px-2.5 py-1 rounded-md border border-[#7FFFD4]/40">
                          {art.category}
                        </span>
                        <h3 className="text-base font-bold text-[#071A2B] leading-snug group-hover:text-purple-900 transition-colors">
                          {art.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {art.excerpt}
                        </p>
                        <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                          <span>{art.author}</span>
                          <span className="font-bold text-[#071A2B] flex items-center gap-1">
                            Edit <ArrowRight className="w-3 h-3 text-[#7FFFD4]" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {form.newsletterEnabled && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-8 text-white shadow-xs sm:px-8">
                  <div className="max-w-3xl space-y-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      {form.dailyEditLabel}
                    </span>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tight text-white">
                        {form.newsletterHeadline}
                      </h3>
                      <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
                        {form.newsletterDescription}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        disabled
                        value={form.newsletterInputPlaceholder}
                        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-500"
                      />
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white"
                      >
                        {form.newsletterButtonText}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Live Simulation Footer with NexTake Image */}
            <div className="bg-[#071A2B] text-slate-400 px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-[#0f2c45] gap-3">
              <NexTakeLogo size="sm" />
              <span className="text-[11px]">© {new Date().getFullYear()} NexTake. All rights reserved.</span>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT POST THAT YOU MADE TO THE MAIN BLOG WEBSITE                    */}
      {/* ========================================================================= */}
      {editingArticle && (
        <div 
          id="edit-live-post-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-[#071A2B]/20 w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center font-bold shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-[#071A2B] tracking-tight">
                      Edit Post for Main Blog Website
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#7FFFD4] text-[#071A2B]">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Modifications will be immediately reflected on the public website.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditPost}
                className="p-2 text-slate-400 hover:text-[#071A2B] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveEditedPost} className="space-y-4">
              
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Article Title
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="E.g., Engineering High Availability Systems"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-bold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/40"
                  required
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Category Tag
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B]"
                  >
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Management">Management</option>
                    <option value="Customer Success">Customer Success</option>
                    <option value="Security">Security</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Publishing Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as 'published' | 'draft' | 'scheduled' })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B]"
                  >
                    <option value="published">Published (Visible on Main Site)</option>
                    <option value="draft">Draft (Hidden from Main Site)</option>
                  </select>
                </div>
              </div>

              {/* Author & Cover Image */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.author}
                    onChange={(e) => setEditFormData({ ...editFormData, author: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={editFormData.image}
                    onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-xs font-mono focus:outline-none focus:border-[#071A2B]"
                    required
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Short Excerpt / Summary
                </label>
                <textarea
                  rows={2}
                  value={editFormData.excerpt}
                  onChange={(e) => setEditFormData({ ...editFormData, excerpt: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-xs font-normal focus:outline-none focus:border-[#071A2B]"
                  required
                />
              </div>

              {/* Full Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Article Body Content
                </label>
                <textarea
                  rows={5}
                  value={editFormData.content}
                  onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-xs font-mono focus:outline-none focus:border-[#071A2B]"
                  required
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseEditPost}
                  className="px-4 py-2.5 rounded-xl border border-[#071A2B]/20 text-xs font-semibold text-[#071A2B] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7FFFD4] text-[#071A2B] hover:bg-[#68f0c5] text-xs font-extrabold shadow-md shadow-[#7FFFD4]/25 transition-all cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Update Live Blog</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
            {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT DAILY TIP                                             */}
      {/* ========================================================================= */}
      {isDailyTipModalOpen && (
        <div
          id="daily-tip-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-[#071A2B]/20 w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-black text-[#071A2B] tracking-tight">
                    {editingDailyTip
                      ? "Edit Daily Tip"
                      : "Create Daily Tip"}
                  </h2>

                  <p className="text-xs text-slate-500">
                    {editingDailyTip
                      ? "Update the Daily Tip displayed on the public website."
                      : "Create a new tip for the public website."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDailyTipModal}
                className="p-2 text-slate-400 hover:text-[#071A2B] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSaveDailyTip}
              className="space-y-5"
            >
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Tip Title
                </label>

                <input
                  type="text"
                  value={dailyTipForm.title}
                  onChange={(e) =>
                    setDailyTipForm({
                      ...dailyTipForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="e.g. Start tracking your spending today"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-bold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/40"
                  required
                />
              </div>

              {/* Category + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Category
                  </label>

                  <select
                    value={dailyTipForm.category}
                    onChange={(e) =>
                      setDailyTipForm({
                        ...dailyTipForm,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B]"
                  >
                    <option value="Finance">Finance</option>
                    <option value="Technology">Technology</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Business">Business</option>
                    <option value="Career">Career</option>
                    <option value="Security">Security</option>
                    <option value="Lifestyle">Lifestyle</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Publishing Status
                  </label>

                  <select
                    value={dailyTipForm.status}
                    onChange={(e) =>
                      setDailyTipForm({
                        ...dailyTipForm,
                        status: e.target.value as
                          | "draft"
                          | "published",
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B]"
                  >
                    <option value="draft">
                      Draft — Hidden from Website
                    </option>

                    <option value="published">
                      Published — Visible on Website
                    </option>
                  </select>
                </div>
              </div>

              {/* Author + Image */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Author
                  </label>

                  <input
                    type="text"
                    value={dailyTipForm.author}
                    onChange={(e) =>
                      setDailyTipForm({
                        ...dailyTipForm,
                        author: e.target.value,
                      })
                    }
                    placeholder="e.g. NexTake Editorial"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Image URL
                  </label>

                  <input
                    type="url"
                    value={dailyTipForm.image}
                    onChange={(e) =>
                      setDailyTipForm({
                        ...dailyTipForm,
                        image: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-xs font-mono focus:outline-none focus:border-[#071A2B]"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Tip Content
                  </label>

                  <span className="text-[10px] text-slate-400">
                    Short-form content
                  </span>
                </div>

                <textarea
                  rows={7}
                  value={dailyTipForm.content}
                  onChange={(e) =>
                    setDailyTipForm({
                      ...dailyTipForm,
                      content: e.target.value,
                    })
                  }
                  placeholder="Write your daily tip here..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm leading-relaxed focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/40 resize-y"
                  required
                />
              </div>

              {/* Preview */}
              {(dailyTipForm.title || dailyTipForm.content) && (
                <div className="rounded-xl border border-[#7FFFD4]/50 bg-[#7FFFD4]/10 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#071A2B]/60 mb-2">
                    Preview
                  </p>

                  <h3 className="text-sm font-bold text-[#071A2B]">
                    {dailyTipForm.title || "Untitled Daily Tip"}
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {dailyTipForm.content || "Your tip content will appear here."}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseDailyTipModal}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#071A2B]/20 text-xs font-semibold text-[#071A2B] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7FFFD4] text-[#071A2B] hover:bg-[#68f0c5] text-xs font-extrabold shadow-md shadow-[#7FFFD4]/25 transition-all cursor-pointer active:scale-95"
                >
                  {dailyTipForm.status === "published" ? (
                    <Send className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}

                  <span>
                    {editingDailyTip
                      ? "Save Changes"
                      : dailyTipForm.status === "published"
                        ? "Publish Daily Tip"
                        : "Save Draft"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
