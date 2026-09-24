import {
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  FileText,
  X,
} from "lucide-react";
import type { Article } from "../../types";

interface BlogManagerProps {
  articles: Article[];
  onAddArticle: (article: Omit<Article, "id">) => void;
  onUpdateArticle: (article: Article) => void;
  onDeleteArticle: (id: string) => void;
  isNewModalOpen: boolean;
  onCloseNewModal: () => void;
  onOpenNewModal: () => void;
}

type ArticleFormData = Omit<Article, "id" | "date" | "views">;

const DEFAULT_AUTHOR = "Promise Akanni";
const DEFAULT_AVATAR = "https://i.pravatar.cc/64?img=60";
const MAX_COVER_IMAGE_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_COVER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function createEmptyFormData(): ArticleFormData {
  return {
    title: "",
    category: "Software Engineering",
    excerpt: "",
    content: "",
    author: DEFAULT_AUTHOR,
    status: "published",
    readTime: "5 min read",
    image: "",
    avatar: DEFAULT_AVATAR,
    isNew: true,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("We couldn't read that image. Please try another file."));
    image.src = src;
  });
}

async function convertImageToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxWidth = 1600;
    const maxHeight = 900;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("We couldn't prepare that image right now.");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  const [coverImageError, setCoverImageError] = useState("");
  const [coverImageFileName, setCoverImageFileName] = useState("");
  const [isPreparingCoverImage, setIsPreparingCoverImage] = useState(false);
  const [isDraggingCoverImage, setIsDraggingCoverImage] = useState(false);

  // Form state for creating or editing article
  const [formData, setFormData] = useState<ArticleFormData>(createEmptyFormData);

  const categories = useMemo(() => {
    const set = new Set(articles.map((article) => article.category));
    return ["All", ...Array.from(set)];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.author.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || article.category === selectedCategory;
      const matchesStatus =
        selectedStatus === "all" || article.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [articles, searchTerm, selectedCategory, selectedStatus]);

  const handleOpenEdit = (article: Article) => {
    setEditingArticle(article);
    setCoverImageError("");
    setCoverImageFileName("");
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
    });
  };

  const handleCloseModal = () => {
    setEditingArticle(null);
    onCloseNewModal();
    setCoverImageError("");
    setCoverImageFileName("");
    setIsPreparingCoverImage(false);
    setIsDraggingCoverImage(false);
    setFormData(createEmptyFormData());
  };

  const processCoverImageFile = async (file: File) => {
    setCoverImageError("");

    if (!ACCEPTED_COVER_IMAGE_TYPES.includes(file.type)) {
      setCoverImageFileName("");
      setCoverImageError("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_COVER_IMAGE_FILE_SIZE) {
      setCoverImageFileName("");
      setCoverImageError("Please choose an image smaller than 8 MB.");
      return;
    }

    setIsPreparingCoverImage(true);

    try {
      const imageDataUrl = await convertImageToDataUrl(file);
      setFormData((current) => ({
        ...current,
        image: imageDataUrl,
      }));
      setCoverImageFileName(file.name);
    } catch (error) {
      console.error("Error preparing cover image:", error);
      setCoverImageFileName("");
      setCoverImageError(
        "We couldn't prepare that image. Please try another file."
      );
    } finally {
      setIsPreparingCoverImage(false);
    }
  };

  const handleCoverImageChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    await processCoverImageFile(file);
  };

  const handleCoverImageDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingCoverImage(true);
  };

  const handleCoverImageDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingCoverImage(false);
  };

  const handleCoverImageDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingCoverImage(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await processCoverImageFile(file);
  };

  const handleRemoveCoverImage = () => {
    setFormData((current) => ({
      ...current,
      image: "",
    }));
    setCoverImageFileName("");
    setCoverImageError("");
    setIsDraggingCoverImage(false);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const title = formData.title.trim();
    const excerpt = formData.excerpt.trim();
    const content = formData.content.trim();
    const author = formData.author.trim() || DEFAULT_AUTHOR;

    if (!title || !excerpt || isPreparingCoverImage) return;

    if (!formData.image) {
      setCoverImageError("Please upload a cover image before saving the article.");
      return;
    }

    const nextArticle = {
      ...formData,
      title,
      excerpt,
      content,
      author,
    };

    if (editingArticle) {
      onUpdateArticle({
        ...editingArticle,
        ...nextArticle,
      });
    } else {
      onAddArticle({
        ...nextArticle,
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
      <div className="flex flex-col gap-4 justify-between border-b border-[#071A2B]/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#071A2B] sm:text-3xl">
              Blog Articles & Content
            </h1>
            <span className="rounded bg-[#7FFFD4] px-2 py-0.5 text-[10px] font-bold text-[#071A2B]">
              {articles.length} POSTS
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Write, publish, draft, and organize technical articles on NexTake.
          </p>
        </div>

        {/* Action button */}
        <button
          id="create-article-btn"
          onClick={onOpenNewModal}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#7FFFD4] px-4 py-2.5 text-sm font-bold text-[#071A2B] shadow-md shadow-[#7FFFD4]/20 transition-all hover:bg-[#68f0c5] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>New Article</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 justify-between md:flex-row md:items-center">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="blog-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, keywords or author..."
            className="w-full rounded-xl border border-[#071A2B]/15 bg-white py-2.5 pl-10 pr-4 text-sm text-[#071A2B] placeholder:text-slate-400 focus:border-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#071A2B]"
            >
              <X className="h-3.5 w-3.5" />
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
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-[#7FFFD4] text-[#071A2B] shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
            className="cursor-pointer rounded-lg border border-[#071A2B]/10 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-[#071A2B] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Articles Grid / List */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.map((article) => (
          <article
            key={article.id}
            id={`blog-card-${article.id}`}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#071A2B]/15 bg-white shadow-xs transition-all hover:border-[#071A2B]/30 hover:shadow-md"
          >
            <div>
              {/* Cover Image & Category Badges */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute left-3 top-3 flex items-center gap-1.5">
                  <span className="rounded-md bg-[#7FFFD4] px-2.5 py-1 text-[11px] font-bold text-[#071A2B] shadow-xs">
                    {article.category}
                  </span>
                  {article.isNew && (
                    <span className="rounded bg-[#071A2B] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#7FFFD4]">
                      NEW
                    </span>
                  )}
                </div>

                <div className="absolute right-3 top-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-xs ${
                      article.status === "published"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                  >
                    {article.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Body details */}
              <div className="space-y-3 p-5">
                <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#071A2B] transition-colors hover:text-[#093259]">
                  {article.title}
                </h3>
                <p className="line-clamp-3 text-xs leading-relaxed text-slate-500">
                  {article.excerpt}
                </p>
              </div>
            </div>

            {/* Author, Stats & Action Buttons */}
            <div className="flex items-center justify-between gap-3 border-t border-[#071A2B]/10 px-5 pb-5 pt-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <img
                  src={article.avatar}
                  alt={article.author}
                  className="h-6 w-6 rounded-full border border-[#071A2B]/20 object-cover"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold leading-none text-[#071A2B]">
                    {article.author}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-400">
                    {article.date}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(article)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#071A2B]"
                  title="Edit Article"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteArticle(article.id)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  title="Delete Article"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed border-[#071A2B]/20 bg-slate-50/50 px-4 py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="text-base font-bold text-[#071A2B]">
            No articles matched your criteria
          </h3>
          <p className="mx-auto max-w-sm text-xs text-slate-500">
            Try adjusting your search query or reset category filters to view all
            posts.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("All");
              setSelectedStatus("all");
            }}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-2xl space-y-6 overflow-y-auto rounded-2xl border border-[#071A2B]/20 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[#071A2B]/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#071A2B] font-bold text-[#7FFFD4]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-[#071A2B]">
                  {editingArticle ? "Edit Article" : "Create New Article"}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#071A2B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Article Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next-Generation Edge Architecture"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2.5 text-sm font-semibold text-[#071A2B] focus:border-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2.5 text-sm font-semibold text-[#071A2B] focus:border-[#071A2B] focus:outline-none"
                  >
                    <option value="Software Engineering">
                      Software Engineering
                    </option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Management">Management</option>
                    <option value="Customer Success">Customer Success</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Publish Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as
                          | "published"
                          | "draft"
                          | "scheduled",
                      })
                    }
                    className="w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2.5 text-sm font-semibold text-[#071A2B] focus:border-[#071A2B] focus:outline-none"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Private)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Short Excerpt / Summary
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="A concise description displayed on cards and search results..."
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2.5 text-xs text-[#071A2B] focus:border-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Body Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Full article content, technical guidelines, code snippets..."
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2.5 text-xs font-mono text-[#071A2B] focus:border-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Author Name
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#071A2B]/20 px-3.5 py-2 text-xs font-semibold text-[#071A2B]"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Cover Image
                  </label>
                  {formData.image && (
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      className="text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700"
                    >
                      Remove image
                    </button>
                  )}
                </div>

                <label
                  onDragOver={handleCoverImageDragOver}
                  onDragEnter={handleCoverImageDragOver}
                  onDragLeave={handleCoverImageDragLeave}
                  onDrop={handleCoverImageDrop}
                  className={`block cursor-pointer rounded-2xl border border-dashed p-5 transition-colors ${
                    isDraggingCoverImage
                      ? "border-[#7FFFD4] bg-[#7FFFD4]/10"
                      : "border-[#071A2B]/20 bg-slate-50/70 hover:border-[#071A2B]/40 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleCoverImageChange}
                    className="hidden"
                  />
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-semibold text-[#071A2B]">
                      {isPreparingCoverImage
                        ? "Preparing cover image..."
                        : isDraggingCoverImage
                          ? "Drop cover image here"
                          : formData.image
                            ? "Replace cover image"
                            : "Upload cover image"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {coverImageFileName
                        ? coverImageFileName
                        : editingArticle && formData.image
                          ? "Current cover image is ready. Click or drag a new file here to replace it."
                          : "Click to choose, or drag and drop a JPG, PNG, or WebP file here instead of pasting a URL."}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Images are optimized automatically and saved with the article.
                    </p>
                  </div>
                </label>

                {coverImageError && (
                  <p className="text-xs font-medium text-rose-600">
                    {coverImageError}
                  </p>
                )}

                {formData.image && (
                  <div className="overflow-hidden rounded-2xl border border-[#071A2B]/10 bg-slate-50">
                    <img
                      src={formData.image}
                      alt="Cover preview"
                      className="h-52 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#071A2B]/10 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="cursor-pointer rounded-xl border border-[#071A2B]/20 px-4 py-2 text-xs font-semibold text-[#071A2B] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPreparingCoverImage}
                  className="cursor-pointer rounded-xl bg-[#7FFFD4] px-5 py-2 text-xs font-bold text-[#071A2B] shadow-md shadow-[#7FFFD4]/20 transition-all hover:bg-[#68f0c5] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
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
