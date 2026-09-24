import { useState, useMemo } from "react";
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Sparkles, 
  FileText,
  X
} from "lucide-react";
import type { Article } from "../../types";

interface BlogManagerProps {
  articles: Article[];
  onAddArticle: (article: Omit<Article, 'id'>) => void;
  onUpdateArticle: (article: Article) => void;
  onDeleteArticle: (id: string) => void;
  isNewModalOpen: boolean;
  onCloseNewModal: () => void;
  onOpenNewModal: () => void;
}

export default function BlogManager({
  articles,
  onAddArticle,
  onUpdateArticle,
  onDeleteArticle,
  isNewModalOpen,
  onCloseNewModal,
  onOpenNewModal,
}: BlogManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Form state for creating or editing article
  const [formData, setFormData] = useState({
    title: "",
    category: "Software Engineering",
    excerpt: "",
    content: "",
    author: "NexTake Editorial",
    status: "published" as 'published' | 'draft' | 'scheduled',
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&h=500&fit=crop",
    avatar: "https://i.pravatar.cc/64?img=60",
    isNew: true,
    isBigStory: false,
  });

  const categories = useMemo(() => {
    const set = new Set(articles.map(a => a.category));
    return ["All", ...Array.from(set)];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.author.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "All" || article.category === selectedCategory;
      const matchesStatus = selectedStatus === "all" || article.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [articles, searchTerm, selectedCategory, selectedStatus]);

  const handleOpenEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      category: article.category,
      excerpt: article.excerpt,
      content: article.content,
      author: article.author,
      status: article.status,
      readTime: article.readTime,
      image: article.image,
      avatar: article.avatar,
      isNew: !!article.isNew,
      isBigStory: !!article.isBigStory,
    });
  };

  const handleCloseModal = () => {
    setEditingArticle(null);
    onCloseNewModal();
    setFormData({
      title: "",
      category: "Software Engineering",
      excerpt: "",
      content: "",
      author: "NexTake Editorial",
      status: "published",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&h=500&fit=crop",
      avatar: "https://i.pravatar.cc/64?img=60",
      isNew: true,
      isBigStory: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.excerpt) return;

    if (editingArticle) {
      onUpdateArticle({
        ...editingArticle,
        ...formData,
      });
    } else {
      onAddArticle({
        ...formData,
        date: "Today",
        views: 0,
      });
    }

    handleCloseModal();
  };

  const isModalVisible = isNewModalOpen || editingArticle !== null;

  return (
    <div id="blog-manager-page" className="space-y-8 bg-white text-[#071A2B]">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#071A2B]/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#071A2B]">
              Blog Articles & Content
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FFFD4] text-[#071A2B]">
              {articles.length} POSTS
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Write, publish, draft, and organize technical articles on NextEdit.
          </p>
        </div>

        {/* Action button */}
        <button
          id="create-article-btn"
          onClick={onOpenNewModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7FFFD4] text-[#071A2B] font-bold text-sm shadow-md shadow-[#7FFFD4]/20 hover:bg-[#68f0c5] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Article</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="blog-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, keywords or author..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#071A2B]/15 bg-white text-sm text-[#071A2B] placeholder:text-slate-400 focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#071A2B]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#7FFFD4] text-[#071A2B] shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#071A2B] border border-[#071A2B]/10 cursor-pointer focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Articles Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map((article) => (
          <article
            key={article.id}
            id={`blog-card-${article.id}`}
            className="rounded-2xl border border-[#071A2B]/15 bg-white overflow-hidden shadow-xs hover:shadow-md hover:border-[#071A2B]/30 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Cover Image & Category Badges */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#7FFFD4] text-[#071A2B] shadow-xs">
                    {article.category}
                  </span>
                  {article.isNew && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#071A2B] text-[#7FFFD4] tracking-wide">
                      NEW
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
                    article.status === 'published' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    {article.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Body details */}
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#071A2B] leading-snug line-clamp-2 hover:text-[#093259] transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {article.excerpt}
                </p>
              </div>
            </div>

            {/* Author, Stats & Action Buttons */}
            <div className="px-5 pb-5 pt-3 border-t border-[#071A2B]/10 flex items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <img
                  src={article.avatar}
                  alt={article.author}
                  className="w-6 h-6 rounded-full object-cover border border-[#071A2B]/20"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-[#071A2B] leading-none">
                    {article.author}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {article.date}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(article)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#071A2B] hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Edit Article"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteArticle(article.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Article"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-[#071A2B]/20 bg-slate-50/50 space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-[#071A2B]">No articles matched your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or reset category filters to view all posts.
          </p>
          <button
            onClick={() => { setSearchTerm(""); setSelectedCategory("All"); setSelectedStatus("all"); }}
            className="text-xs font-bold text-[#071A2B] underline hover:text-[#7FFFD4]"
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Full Modal for Creating or Editing Article */}
      {isModalVisible && (
        <div 
          id="article-editor-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl border border-[#071A2B]/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6 sm:p-8">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#071A2B] text-[#7FFFD4] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#071A2B]">
                  {editingArticle ? "Edit Article" : "Create New Article"}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#071A2B] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Article Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next-Generation Edge Architecture"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B]"
                  >
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Management">Management</option>
                    <option value="Customer Success">Customer Success</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Publish Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'published' | 'draft' | 'scheduled' })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-sm font-semibold focus:outline-none focus:border-[#071A2B]"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Private)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Short Excerpt / Summary
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="A concise description displayed on cards and search results..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-xs focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Body Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Full article content, technical guidelines, code snippets..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#071A2B]/20 text-[#071A2B] text-xs font-mono focus:outline-none focus:border-[#071A2B] focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-[#071A2B]/15 bg-slate-50 px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isBigStory}
                  onChange={(e) => setFormData({ ...formData, isBigStory: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-[#071A2B]"
                />
                <span>
                  <span className="block text-xs font-bold text-[#071A2B]">Set as The Big Story</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    This published article will lead the public homepage. Selecting it replaces the current Big Story.
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#071A2B]/20 text-xs font-semibold text-[#071A2B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#071A2B]/20 text-xs text-slate-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#071A2B]/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl border border-[#071A2B]/20 text-xs font-semibold text-[#071A2B] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FFFD4] text-[#071A2B] font-bold text-xs shadow-md shadow-[#7FFFD4]/20 hover:bg-[#68f0c5] active:scale-[0.98] transition-all cursor-pointer"
                >
                  {editingArticle ? "Update Article" : "Publish Article"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
