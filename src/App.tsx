import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type ArticleRow,
  type DailyTipRow,
} from "./lib/supabase";

import type {
  NavPageId,
  Article,
  DailyTip,
  WebsiteConfig,
  ActivityItem,
  SystemMetric,
} from "./types";

import {
  INITIAL_WEBSITE_CONFIG,
  SYSTEM_METRICS,
} from "./data/initialData";

import AdminHeader from "./components/AdminHeader";
import AdminSidebar from "./components/AdminSidebar";
import AdminFooter from "./components/AdminFooter";
import DashboardHome from "./components/pages/DashboardHome";
import WebsiteManager from "./components/pages/WebsiteManager";
import BlogManager from "./components/pages/BlogManager";
import LogoutModal from "./components/LogoutModal";
import LoggedOutView from "./components/LoggedOutView";
import LiveWebsiteModal from "./components/LiveWebsiteModal";

/* -------------------------------------------------------------------------- */
/*                              DATA MAPPERS                                  */
/* -------------------------------------------------------------------------- */

function mapArticleRow(article: ArticleRow): Article {
  return {
    id: article.id,
    category: article.category,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    author: article.author,
    date: article.date,
    status: article.status,
    views: article.views,
    likes: 0,
    comments: 0,
    saves: 0,
    readTime: article.read_time,
    avatar: article.avatar,
    image: article.image,
    isNew: article.is_new,
    isBigStory: article.status === "published" && !!article.is_new,
  };
}

function mapDailyTipRow(tip: DailyTipRow): DailyTip {
  return {
    id: tip.id,
    title: tip.title,
    content: tip.content,
    category: tip.category,
    image: tip.image ?? "",
    author: tip.author ?? "",
    status: tip.status,
    published_at: tip.published_at ?? null,
    created_at: tip.created_at,
    updated_at: tip.updated_at,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  APP                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  const [currentPage, setCurrentPage] =
    useState<NavPageId>("home");

  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  // =========================================================
  // MODALS
  // =========================================================

  const [isLogoutModalOpen, setIsLogoutModalOpen] =
    useState(false);

  const [isLiveWebsiteOpen, setIsLiveWebsiteOpen] =
    useState(false);

  const [isNewArticleModalOpen, setIsNewArticleModalOpen] =
    useState(false);

  // =========================================================
  // ARTICLES
  // =========================================================

  const [articles, setArticles] = useState<Article[]>([]);

  const [isLoadingArticles, setIsLoadingArticles] =
    useState(true);

  // =========================================================
  // DAILY TIPS
  // =========================================================

  const [dailyTips, setDailyTips] = useState<DailyTip[]>([]);

 

  // =========================================================
  // WEBSITE CONFIG
  // =========================================================

  const [websiteConfig, setWebsiteConfig] =
    useState<WebsiteConfig>(
      INITIAL_WEBSITE_CONFIG,
    );

  // =========================================================
  // ACTIVITIES
  // =========================================================

  const [activities, setActivities] =
    useState<ActivityItem[]>([]);

  // =========================================================
  // DASHBOARD METRICS
  // =========================================================

  const [liveMetrics, setLiveMetrics] = useState({
    visitors: 0,
    subscribers: 0,
    health: 99.98,
    latency: 42,
    publishedArticles: 0,
  });

  useEffect(() => {
    const loadPublicActivities = async () => {
      try {
        const response = await fetch('/api/public/activity');
        if (!response.ok) return;

        const payload = await response.json();
        const articleTitles = new Map(articles.map((article) => [article.id, article.title]));
        const publicItems: ActivityItem[] = (payload.items ?? []).map((item: ActivityItem) => ({
          ...item,
          target: articleTitles.get(item.target) ?? item.target,
          timestamp: new Date(item.timestamp).toLocaleString(),
        }));
        const publicIds = new Set(publicItems.map((item) => item.id));

        setActivities((current) => [
          ...publicItems,
          ...current.filter((item) => !item.id.startsWith('public-') && !publicIds.has(item.id)),
        ].slice(0, 25));
      } catch (error) {
        console.error('Unable to fetch public activities:', error);
      }
    };

    loadPublicActivities();
    const timer = window.setInterval(loadPublicActivities, 5000);

    return () => window.clearInterval(timer);
  }, [articles]);

  useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        const response = await fetch('/api/public/metrics');
        if (!response.ok) {
          throw new Error('Metrics request failed');
        }

        const payload = await response.json();
        setLiveMetrics({
          visitors: Number(payload.monthlyVisitors ?? 0),
          subscribers: Number(payload.newsletterSubscribers ?? 0),
          health: Number(payload.systemHealth?.availability ?? 99.98),
          latency: Number(payload.systemHealth?.latencyMs ?? 42),
          publishedArticles: Number(payload.publishedArticles ?? 0),
        });
      } catch (error) {
        console.error('Unable to fetch live metrics:', error);
        const publishedCount = articles.filter((article) => article.status === 'published').length;
        const articleViews = articles
          .filter((article) => article.status === 'published')
          .reduce((sum, article) => sum + article.views, 0);

        setLiveMetrics({
          visitors: Math.max(articleViews, publishedCount * 300),
          subscribers: 0,
          health: 99.98,
          latency: 42,
          publishedArticles: publishedCount,
        });
      }
    };

    fetchLiveMetrics();
    const timer = window.setInterval(fetchLiveMetrics, 10000);

    return () => window.clearInterval(timer);
  }, [articles]);

  const metrics: SystemMetric[] = useMemo(() => {
    const publishedCount = Math.max(
      liveMetrics.publishedArticles,
      articles.filter((article) => article.status === 'published').length,
    );

    const compactNumber = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });

    const formattedVisitors = compactNumber.format(liveMetrics.visitors || 0);
    const formattedSubscribers = new Intl.NumberFormat('en-US').format(liveMetrics.subscribers || 0);

    return SYSTEM_METRICS.map((metric) => {
      if (metric.label === 'Total Published Articles') {
        return {
          ...metric,
          value: String(publishedCount),
          change: 'Live from site data',
          progressPercent: Math.min(100, Math.max(35, publishedCount * 12)),
        };
      }

      if (metric.label === 'Monthly Site Visitors') {
        return {
          ...metric,
          value: formattedVisitors,
          change: 'Measured from live page traffic',
          progressPercent: Math.min(100, Math.max(35, Math.round((liveMetrics.visitors / 50000) * 100))),
          technicalDetail: `${liveMetrics.visitors.toLocaleString()} tracked visits`,
        };
      }

      if (metric.label === 'Newsletter Subscribers') {
        return {
          ...metric,
          value: formattedSubscribers,
          change: 'Live from subscription signups',
          progressPercent: Math.min(100, Math.max(25, Math.round((liveMetrics.subscribers / 5000) * 100))),
          technicalDetail: `${liveMetrics.subscribers.toLocaleString()} active subscribers`,
        };
      }

      if (metric.label === 'Live System Health') {
        return {
          ...metric,
          value: `${liveMetrics.health.toFixed(2)}%`,
          change: `Latency ${liveMetrics.latency}ms`,
          progressPercent: Math.min(100, Math.max(96, Math.round(liveMetrics.health))),
          technicalDetail: `Edge latency ${liveMetrics.latency}ms`,
        };
      }

      return metric;
    });
  }, [articles, liveMetrics]);

  // =========================================================
  // LOAD DAILY TIPS
  // =========================================================

useEffect(() => {
  const loadDailyTips = async () => {
    const { data, error } = await supabase
      .from("daily_tips")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error loading daily tips:",
        error,
      );
      return;
    }

    const formattedTips: DailyTip[] = (
      data ?? []
    )
      .filter(
        (tip): tip is DailyTipRow =>
          "published_at" in tip,
      )
      .map(mapDailyTipRow);

    setDailyTips(formattedTips);
  };

  loadDailyTips();
}, []);

  // =========================================================
  // LOAD ARTICLES
  // =========================================================

  useEffect(() => {
    const loadArticles = async () => {
      setIsLoadingArticles(true);

      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Error loading articles:",
          error,
        );

        setIsLoadingArticles(false);
        return;
      }

      const formattedArticles: Article[] = (
        data ?? []
      )
        .filter(
          (article): article is ArticleRow =>
            "read_time" in article,
        )
        .map(mapArticleRow);

      try {
        const engagementResponse = await fetch('/api/public/articles');
        if (engagementResponse.ok) {
          const payload = await engagementResponse.json();
          const statsMap = new Map<string, {
            id?: string;
            views?: number;
            likes?: number;
            comments?: number;
            saves?: number;
          }>();

          for (const item of payload.items ?? []) {
            if (item?.id) {
              statsMap.set(String(item.id), item as any);
            }
          }

          const mergedArticles = formattedArticles.map((article) => {
            const stats = statsMap.get(article.id);
            if (!stats) return article;
            return {
              ...article,
              views: Number(stats.views ?? article.views ?? 0),
              likes: Number(stats.likes ?? 0),
              comments: Number(stats.comments ?? 0),
              saves: Number(stats.saves ?? 0),
            };
          });

          setArticles(mergedArticles);
        } else {
          setArticles(formattedArticles);
        }
      } catch {
        setArticles(formattedArticles);
      } finally {
        setIsLoadingArticles(false);
      }
    };

    loadArticles();
  }, []);

  // =========================================================
  // NAVIGATION
  // =========================================================

  const handleNavigate = (
    page: NavPageId,
  ) => {
    if (page === "logout") {
      setIsLogoutModalOpen(true);
      return;
    }

    setCurrentPage(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // AUTH / LOGOUT
  // =========================================================

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    setIsLoggedIn(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage("home");
  };

  // =========================================================
  // ARTICLE ACTIONS
  // =========================================================

  const handleAddArticle = async (
    newArticleData: Omit<Article, "id">,
  ) => {
    const { data, error } = await supabase
      .from("articles")
      .insert({
        category: newArticleData.category,
        title: newArticleData.title,
        excerpt: newArticleData.excerpt,
        content: newArticleData.content,
        author: newArticleData.author,
        date: newArticleData.date,
        status: newArticleData.status,
        views: newArticleData.views,
        read_time: newArticleData.readTime,
        avatar: newArticleData.avatar,
        image: newArticleData.image,
        is_new:
          newArticleData.status === "published"
            ? !!newArticleData.isBigStory
            : false,
      })
      .select()
      .single();

    if (error || !data) {
      console.error(
        "Error creating article:",
        error ?? "No article returned",
      );
      return;
    }

    if (!("read_time" in data)) {
      console.error(
        "Invalid article returned from database",
      );
      return;
    }

    const newArticle =
      mapArticleRow(data);

    setArticles((prev) => [
      newArticle,
      ...prev,
    ]);

    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        action:
          newArticle.status ===
          "published"
            ? "Published article"
            : "Created article",
        target: newArticle.title,
        timestamp: "Just now",
        user: "NexTake Admin",
        type: "edit",
      },
      ...prev,
    ]);
  };

  const handleUpdateArticle = async (
    updatedArticle: Article,
  ) => {
    const { error } = await supabase
      .from("articles")
      .update({
        category: updatedArticle.category,
        title: updatedArticle.title,
        excerpt: updatedArticle.excerpt,
        content: updatedArticle.content,
        author: updatedArticle.author,
        date: updatedArticle.date,
        status: updatedArticle.status,
        views: updatedArticle.views,
        read_time: updatedArticle.readTime,
        avatar: updatedArticle.avatar,
        image: updatedArticle.image,
        is_new:
          updatedArticle.status === "published"
            ? !!updatedArticle.isBigStory
            : false,
      })
      .eq("id", updatedArticle.id);

    if (error) {
      console.error(
        "Error updating article:",
        error,
      );
      return;
    }

    setArticles((prev) =>
      prev.map((article) =>
        article.id ===
        updatedArticle.id
          ? updatedArticle
          : article,
      ),
    );

    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        action:
          updatedArticle.status ===
          "published"
            ? "Published article"
            : "Updated article",
        target: updatedArticle.title,
        timestamp: "Just now",
        user: "NexTake Admin",
        type: "edit",
      },
      ...prev,
    ]);
  };

  const handleDeleteArticle = async (
    id: string,
  ) => {
    const target = articles.find(
      (article) =>
        article.id === id,
    );

    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Error deleting article:",
        error,
      );
      return;
    }

    setArticles((prev) =>
      prev.filter(
        (article) =>
          article.id !== id,
      ),
    );

    if (target) {
      const newActivity: ActivityItem =
        {
          id: `act-${Date.now()}`,
          action: "Removed article",
          target: target.title,
          timestamp: "Just now",
          user: "NexTake Admin",
          type: "system",
        };

      setActivities((prev) => [
        newActivity,
        ...prev,
      ]);
    }
  };

  // =========================================================
  // DAILY TIP ACTIONS
  // =========================================================

  const handleCreateDailyTip = async (
    tip: DailyTip,
  ) => {
    const publishedAt =
      tip.status === "published"
        ? tip.published_at ??
          new Date().toISOString()
        : null;

    const { data, error } =
      await supabase
        .from("daily_tips")
        .insert({
          title: tip.title,
          content: tip.content,
          category: tip.category,
          image: tip.image || null,
          author: tip.author || null,
          status: tip.status,
          published_at: publishedAt,
        })
        .select()
        .single();

    if (error || !data) {
      console.error(
        "Error creating daily tip:",
        error ??
          "No daily tip returned",
      );
      return;
    }

    if (!("published_at" in data)) {
      console.error(
        "Invalid daily tip returned from database",
      );
      return;
    }

    const newTip =
      mapDailyTipRow(data);

    setDailyTips((prev) => [
      newTip,
      ...prev,
    ]);

    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        action:
          newTip.status ===
          "published"
            ? "Published daily tip"
            : "Created daily tip",
        target: newTip.title,
        timestamp: "Just now",
        user: "NexTake Admin",
        type: "edit",
      },
      ...prev,
    ]);
  };

  const handleUpdateDailyTip = async (
    tip: DailyTip,
  ) => {
    const publishedAt =
      tip.status === "published"
        ? tip.published_at ??
          new Date().toISOString()
        : null;

    const updatePayload = {
      title: tip.title,
      content: tip.content,
      category: tip.category,
      image: tip.image || null,
      author: tip.author || null,
      status: tip.status,
      published_at: publishedAt,
      updated_at:
        new Date().toISOString(),
    };

    const { data, error } =
      await supabase
        .from("daily_tips")
        .update(updatePayload)
        .eq("id", tip.id)
        .select()
        .single();

    if (error || !data) {
      console.error(
        "Error updating daily tip:",
        error ??
          "No daily tip returned",
      );
      return;
    }

    if (!("published_at" in data)) {
      console.error(
        "Invalid daily tip returned from database",
      );
      return;
    }

    const updatedTip =
      mapDailyTipRow(data);

    setDailyTips((prev) =>
      prev.map((item) =>
        item.id === updatedTip.id
          ? updatedTip
          : item,
      ),
    );

    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        action:
          updatedTip.status ===
          "published"
            ? "Published daily tip"
            : "Updated daily tip",
        target: updatedTip.title,
        timestamp: "Just now",
        user: "NexTake Admin",
        type: "edit",
      },
      ...prev,
    ]);
  };

  const handleDeleteDailyTip = async (
    id: string,
  ) => {
    const target = dailyTips.find(
      (tip) => tip.id === id,
    );

    const { error } = await supabase
      .from("daily_tips")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Error deleting daily tip:",
        error,
      );
      return;
    }

    setDailyTips((prev) =>
      prev.filter(
        (tip) => tip.id !== id,
      ),
    );

    if (target) {
      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          action: "Deleted daily tip",
          target: target.title,
          timestamp: "Just now",
          user: "NexTake Admin",
          type: "system",
        },
        ...prev,
      ]);
    }
  };

  // =========================================================
  // WEBSITE CONFIG ACTIONS
  // =========================================================

  const handleUpdateWebsiteConfig = (
    newConfig: WebsiteConfig,
  ) => {
    setWebsiteConfig(newConfig);

    const newActivity: ActivityItem =
      {
        id: `act-${Date.now()}`,
        action: "Updated website layout",
        target: `Hero & Navigation for ${newConfig.siteName}`,
        timestamp: "Just now",
        user: "NexTake Admin",
        type: "edit",
      };

    setActivities((prev) => [
      newActivity,
      ...prev,
    ]);
  };

  // =========================================================
  // LOGGED OUT
  // =========================================================

  if (!isLoggedIn) {
    return (
      <LoggedOutView
        onLogin={handleLogin}
      />
    );
  }

  // =========================================================
  // MAIN APPLICATION
  // =========================================================

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#071A2B]">
      {/* HEADER */}
      <AdminHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() =>
          setMobileMenuOpen(
            !mobileMenuOpen,
          )
        }
        onOpenLiveSite={() =>
          setIsLiveWebsiteOpen(true)
        }
      />

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* SIDEBAR */}
        <AdminSidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() =>
            setMobileMenuOpen(false)
          }
          articleCount={
            articles.length
          }
        />

        {/* CONTENT */}
        <main
          id="admin-main-content"
          className="flex-1 w-full lg:pl-64 bg-white min-h-[calc(100vh-140px)] transition-all"
        >
          <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto">
            {isLoadingArticles ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-slate-500">
                  Loading articles...
                </p>
              </div>
            ) : (
              <>
                {/* =====================================================
                    DASHBOARD
                ====================================================== */}

                {currentPage ===
                  "home" && (
                  <DashboardHome
                    articles={articles}
                    metrics={metrics}
                    activities={activities}
                    onNavigate={
                      handleNavigate
                    }
                    onOpenNewArticleModal={() => {
                      setCurrentPage(
                        "blog",
                      );
                      setIsNewArticleModalOpen(
                        true,
                      );
                    }}
                  />
                )}

                {/* =====================================================
                    WEBSITE MANAGER
                ====================================================== */}

                {currentPage ===
                  "website" && (
                  <WebsiteManager
                    config={
                      websiteConfig
                    }
                    onUpdateConfig={
                      handleUpdateWebsiteConfig
                    }
                    onOpenLiveSite={() =>
                      setIsLiveWebsiteOpen(
                        true,
                      )
                    }
                    articles={articles}
                    onUpdateArticle={
                      handleUpdateArticle
                    }
                    dailyTips={
                      dailyTips
                    }
                    onCreateDailyTip={
                      handleCreateDailyTip
                    }
                    onUpdateDailyTip={
                      handleUpdateDailyTip
                    }
                    onDeleteDailyTip={
                      handleDeleteDailyTip
                    }
                  />
                )}

                {/* =====================================================
                    BLOG MANAGER
                ====================================================== */}

                {currentPage ===
                  "blog" && (
                  <BlogManager
                    articles={
                      articles
                    }
                    onAddArticle={
                      handleAddArticle
                    }
                    onUpdateArticle={
                      handleUpdateArticle
                    }
                    onDeleteArticle={
                      handleDeleteArticle
                    }
                    isNewModalOpen={
                      isNewArticleModalOpen
                    }
                    onCloseNewModal={() =>
                      setIsNewArticleModalOpen(
                        false,
                      )
                    }
                    onOpenNewModal={() =>
                      setIsNewArticleModalOpen(
                        true,
                      )
                    }
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <div className="lg:pl-64 bg-[#071A2B]">
        <AdminFooter
          onNavigate={handleNavigate}
        />
      </div>

      {/* LOGOUT MODAL */}
      <LogoutModal
        isOpen={
          isLogoutModalOpen
        }
        onClose={() =>
          setIsLogoutModalOpen(
            false,
          )
        }
        onConfirmLogout={
          handleConfirmLogout
        }
      />

      {/* LIVE WEBSITE MODAL */}
      <LiveWebsiteModal
        isOpen={
          isLiveWebsiteOpen
        }
        onClose={() =>
          setIsLiveWebsiteOpen(
            false,
          )
        }
        config={websiteConfig}
        articles={articles}
      />
    </div>
  );
}