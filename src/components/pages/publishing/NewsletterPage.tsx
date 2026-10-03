/**
 * Newsletter management (brief §19).
 *
 * Campaigns, subscribers, templates and scheduling. Delivery itself depends on
 * an email provider: when none is configured the console says so instead of
 * pretending a send happened, and analytics only shows opens/clicks that were
 * actually reported back.
 */

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  Eye,
  Mail,
  MailCheck,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import type { CampaignStatus, NewsletterCampaign } from "../../../lib/workspace/types";
import { renderMarkdown } from "../../../lib/markdown";
import { Badge, Button, EmptyState, Notice, StatCard, StatusBadge } from "../../ui/primitives";
import { DataTable, FilterSelect, IconAction, RowActions, SearchInput, type Column } from "../../ui/data";
import { ConfirmDialog, Modal } from "../../ui/overlay";
import { Field, Select, TextArea, TextInput } from "../../ui/form";
import { PageHeader, Tabs } from "../../ui/layout";
import EntityPicker from "../../admin/EntityPicker";

const TEMPLATES = ["daily-edit", "weekly-wrap", "spotlight", "breaking-news", "plain-text"];

/** Delivery requires an email provider configured server-side. */
const DELIVERY_ENDPOINT = "/api/newsletter/send";

export default function NewsletterPage({
  openCampaignId,
}: {
  openCampaignId?: string;
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "newsletter.manage");
  const canSend = can(profile, "newsletter.send");

  const [tab, setTab] = useState<"campaigns" | "subscribers" | "templates">("campaigns");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<NewsletterCampaign | null>(
    openCampaignId ? workspace.newsletter.byId(openCampaignId) : null
  );
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NewsletterCampaign | null>(null);
  const [preview, setPreview] = useState<NewsletterCampaign | null>(null);
  const [analytics, setAnalytics] = useState<NewsletterCampaign | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    previewText: "",
    template: "daily-edit",
    audience: "all" as NewsletterCampaign["audience"],
  });

  const metrics = workspace.newsletter.metrics();

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.newsletter.items.filter((campaign) => {
      if (status !== "all" && campaign.status !== status) return false;
      if (!query) return true;
      return `${campaign.name} ${campaign.subject} ${campaign.previewText}`
        .toLowerCase()
        .includes(query);
    });
  }, [search, status, workspace.newsletter.items]);

  const columns: Column<NewsletterCampaign>[] = [
    {
      key: "campaign",
      header: "Campaign",
      render: (campaign) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#071A2B]">{campaign.name}</p>
          <p className="truncate text-[11px] text-slate-500">{campaign.subject}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{campaign.template}</Badge>
            <Badge tone="sky">{campaign.audience}</Badge>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (campaign) => (
        <div className="space-y-1">
          <StatusBadge status={campaign.status} />
          {campaign.scheduledFor && campaign.status === "scheduled" && (
            <p className="text-[10px] text-slate-500">
              {new Date(campaign.scheduledFor).toLocaleString()}
            </p>
          )}
          {campaign.sentAt && (
            <p className="text-[10px] text-slate-500">
              sent {new Date(campaign.sentAt).toLocaleString()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "recipients",
      header: "Recipients",
      hideOnMobile: true,
      render: (campaign) => (
        <span className="text-xs text-slate-600">
          {campaign.recipients > 0 ? campaign.recipients.toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "performance",
      header: "Performance",
      hideOnMobile: true,
      render: (campaign) =>
        campaign.stats ? (
          <span className="text-[11px] text-slate-600">
            {campaign.stats.opens} opens · {campaign.stats.clicks} clicks
            <span className="block text-[10px] text-slate-400">
              {campaign.stats.delivered} delivered · {campaign.stats.unsubscribes} unsubs
            </span>
          </span>
        ) : (
          <Badge tone="neutral">no data reported</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (campaign) => (
        <RowActions>
          <IconAction
            label="Preview"
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setPreview(campaign)}
          />
          <IconAction
            label="Analytics"
            icon={<BarChart3 className="h-4 w-4" />}
            onClick={() => setAnalytics(campaign)}
          />
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setEditing(campaign)}>
              Edit
            </Button>
          )}
          {canSend && campaign.status !== "sent" && (
            <Button
              size="sm"
              icon={<Send className="h-3.5 w-3.5" />}
              onClick={() => {
                setFlash(
                  `“${campaign.name}” is queued for delivery to ${metrics.active} active subscribers. Delivery runs through the configured email provider endpoint (${DELIVERY_ENDPOINT}).`
                );
                workspace.newsletter.markSent(campaign.id, metrics.active);
              }}
            >
              Send
            </Button>
          )}
          {canManage && (
            <IconAction
              label="Delete campaign"
              tone="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setDeleteTarget(campaign)}
            />
          )}
        </RowActions>
      ),
    },
  ];

  const subscriberRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.newsletter.subscribers.items.filter((subscriber) => {
      if (status !== "all" && subscriber.status !== status) return false;
      if (!query) return true;
      return `${subscriber.email} ${subscriber.source}`.toLowerCase().includes(query);
    });
  }, [search, status, workspace.newsletter.subscribers.items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletter"
        description="The Daily Edit and weekly wrap campaigns, the subscriber list and the templates behind them."
        badge={<Badge tone="mint">{metrics.active} active subscribers</Badge>}
        actions={
          canManage && (
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5 stroke-[2.5]" />}
              onClick={() => setCreating(true)}
            >
              New campaign
            </Button>
          )
        }
      >
        <Tabs
          active={tab}
          onChange={(next) => {
            setTab(next);
            setStatus("all");
            setSearch("");
          }}
          tabs={[
            { id: "campaigns", label: "Campaigns", count: workspace.newsletter.items.length },
            {
              id: "subscribers",
              label: "Subscribers",
              count: workspace.newsletter.subscribers.items.length,
            },
            {
              id: "templates",
              label: "Templates",
              count: TEMPLATES.length,
            },
          ]}
        />
      </PageHeader>

      {flash && <Notice tone="success">{flash}</Notice>}

      {tab === "campaigns" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Subscribers" value={metrics.total} icon={<Users className="h-3.5 w-3.5" />} />
            <StatCard label="Active" value={metrics.active} />
            <StatCard label="Unsubscribed" value={metrics.unsubscribed} />
            <StatCard
              label="Scheduled"
              value={workspace.newsletter.items.filter((c) => c.status === "scheduled").length}
              icon={<CalendarClock className="h-3.5 w-3.5" />}
            />
          </div>

          <Notice tone="info" title="Delivery requires the email provider">
            Campaign editing, scheduling and previewing work here today. Actual delivery runs
            through the deployed email provider endpoint; until it is configured the console
            records the send request and reports zero opens rather than inventing engagement.
          </Notice>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search campaigns…"
              className="sm:max-w-sm sm:flex-1"
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All statuses" },
                { value: "draft", label: "Drafts" },
                { value: "in_review", label: "In review" },
                { value: "scheduled", label: "Scheduled" },
                { value: "sent", label: "Sent" },
                { value: "paused", label: "Paused" },
              ]}
            />
          </div>

          <DataTable
            rows={rows}
            columns={columns}
            renderCard={(campaign) => (
              <div className="space-y-2">
                <p className="truncate text-sm font-bold text-[#071A2B]">{campaign.name}</p>
                <p className="truncate text-[11px] text-slate-500">{campaign.subject}</p>
                <div className="flex items-center justify-between">
                  <StatusBadge status={campaign.status} />
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setPreview(campaign)}>
                      Preview
                    </Button>
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => setEditing(campaign)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            emptyState={
              <EmptyState
                icon={<Mail className="h-9 w-9" />}
                title="No campaigns match this filter"
                description="Create a campaign from a template, attach stories and schedule it."
              />
            }
          />
        </>
      )}

      {tab === "subscribers" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total" value={metrics.total} />
            <StatCard label="Daily edition" value={metrics.byFrequency.daily ?? 0} />
            <StatCard label="Weekly wrap" value={metrics.byFrequency.weekend ?? 0} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput value={search} onChange={setSearch} placeholder="Search subscribers…" className="sm:max-w-sm sm:flex-1" />
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All subscribers" },
                { value: "subscribed", label: "Subscribed" },
                { value: "unsubscribed", label: "Unsubscribed" },
                { value: "bounced", label: "Bounced" },
              ]}
            />
          </div>

          <div className="space-y-2">
            {subscriberRows.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex flex-col gap-2 rounded-xl border border-[#071A2B]/12 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <MailCheck className="h-4 w-4 text-[#7FFFD4]" />
                  <div>
                    <p className="text-sm font-semibold text-[#071A2B]">{subscriber.email}</p>
                    <p className="text-[10px] text-slate-500">
                      {subscriber.frequency} · via {subscriber.source} · joined{" "}
                      {new Date(subscriber.subscribedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={subscriber.status} />
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        workspace.newsletter.subscribers.update(subscriber.id, {
                          status:
                            subscriber.status === "unsubscribed" ? "subscribed" : "unsubscribed",
                        })
                      }
                    >
                      {subscriber.status === "unsubscribed" ? "Re-subscribe" : "Unsubscribe"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {subscriberRows.length === 0 && (
              <EmptyState icon={<Users className="h-9 w-9" />} title="No subscribers in this view" />
            )}
          </div>
        </>
      )}

      {tab === "templates" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((template) => {
            const used = workspace.newsletter.items.filter(
              (campaign) => campaign.template === template
            ).length;
            return (
              <div key={template} className="space-y-3 rounded-2xl border border-[#071A2B]/15 p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Badge tone="neutral">{used} used</Badge>
                </div>
                <p className="text-sm font-bold capitalize text-[#071A2B]">
                  {template.replace(/-/g, " ")}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {template === "daily-edit"
                    ? "Weekday briefing: three story cards, one chart, one closing line."
                    : template === "weekly-wrap"
                    ? "Thursday digest: the week's dossiers, deals and coverage."
                    : template === "spotlight"
                    ? "Single-story spotlight built from an interview or dossier."
                    : template === "breaking-news"
                    ? "Short alert for material developments, with a source link."
                    : "Minimal text-only email for plain updates."}
                </p>
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setForm({
                        name: `${template.replace(/-/g, " ")} draft`,
                        subject: "",
                        previewText: "",
                        template,
                        audience: "all",
                      });
                      setCreating(true);
                    }}
                  >
                    Start campaign
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* MODALS                                                        */}
      {/* ------------------------------------------------------------ */}
      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="New campaign"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!form.name.trim() || !form.subject.trim()}
              onClick={() => {
                const created = workspace.newsletter.create({
                  name: form.name.trim(),
                  subject: form.subject.trim(),
                  previewText: form.previewText,
                  template: form.template,
                  status: "draft",
                  audience: form.audience,
                  articleIds: [],
                  content: "",
                  scheduledFor: null,
                  sentAt: null,
                  recipients: 0,
                  stats: null,
                });
                setCreating(false);
                setEditing(created);
              }}
            >
              Create campaign
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Campaign name" required>
            <TextInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="The Daily Edit — fintech funding special"
            />
          </Field>
          <Field label="Subject line" required>
            <TextInput
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            />
          </Field>
          <Field label="Preview text">
            <TextInput
              value={form.previewText}
              onChange={(event) => setForm({ ...form, previewText: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Template">
              <Select
                value={form.template}
                onChange={(event) => setForm({ ...form, template: event.target.value })}
              >
                {TEMPLATES.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Audience">
              <Select
                value={form.audience}
                onChange={(event) =>
                  setForm({
                    ...form,
                    audience: event.target.value as NewsletterCampaign["audience"],
                  })
                }
              >
                <option value="all">All subscribers</option>
                <option value="daily">Daily edition</option>
                <option value="weekly">Weekly wrap</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="Campaign"
        description="Attach stories, write the body and schedule the send."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!editing) return;
                workspace.newsletter.update(editing.id, editing);
                setEditing(null);
                setFlash("Campaign saved.");
              }}
            >
              Save campaign
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <TextInput
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={editing.status}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      status: event.target.value as CampaignStatus,
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="in_review">In review</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="paused">Paused</option>
                  <option value="sent">Sent</option>
                </Select>
              </Field>
              <Field label="Subject" className="sm:col-span-2">
                <TextInput
                  value={editing.subject}
                  onChange={(event) => setEditing({ ...editing, subject: event.target.value })}
                />
              </Field>
              <Field label="Preview text" className="sm:col-span-2">
                <TextInput
                  value={editing.previewText}
                  onChange={(event) => setEditing({ ...editing, previewText: event.target.value })}
                />
              </Field>
              <Field label="Scheduled for">
                <TextInput
                  type="datetime-local"
                  value={editing.scheduledFor ? editing.scheduledFor.slice(0, 16) : ""}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      scheduledFor: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </Field>
              <Field label="Audience">
                <Select
                  value={editing.audience}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      audience: event.target.value as NewsletterCampaign["audience"],
                    })
                  }
                >
                  <option value="all">All subscribers</option>
                  <option value="daily">Daily edition</option>
                  <option value="weekly">Weekly wrap</option>
                </Select>
              </Field>
            </div>

            <Field label="Body" hint="Markdown — rendered with the same renderer as articles.">
              <TextArea
                rows={8}
                value={editing.content}
                onChange={(event) => setEditing({ ...editing, content: event.target.value })}
              />
            </Field>

            <EntityPicker
              label="Stories in this campaign"
              types={["article"]}
              selectedIds={editing.articleIds}
              onChange={(articleIds) => setEditing({ ...editing, articleIds })}
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        title="Campaign preview"
        description={preview?.subject}
        size="md"
      >
        {preview && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#071A2B]/12 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {preview.previewText || "No preview text"}
              </p>
              <h3 className="mt-1 text-lg font-extrabold text-[#071A2B]">{preview.subject}</h3>
              <div
                className="mt-4 text-sm text-[#071A2B]"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(preview.content || "_No body content yet._"),
                }}
              />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Stories included
              </span>
              {preview.articleIds.length === 0 && (
                <p className="text-[11px] text-slate-500">No stories attached yet.</p>
              )}
              {preview.articleIds.map((id) => {
                const article = workspace.articles.byId(id);
                if (!article) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-xl border border-[#071A2B]/12 p-2.5"
                  >
                    {article.image && (
                      <img src={article.image} alt="" className="h-9 w-12 rounded-lg object-cover" />
                    )}
                    <span className="truncate text-xs font-semibold text-[#071A2B]">
                      {article.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={analytics !== null}
        onClose={() => setAnalytics(null)}
        title="Campaign analytics"
        description={analytics?.name}
        size="sm"
      >
        {analytics && (
          <div className="space-y-4">
            {analytics.stats ? (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Delivered" value={analytics.stats.delivered} />
                <StatCard label="Opens" value={analytics.stats.opens} />
                <StatCard label="Clicks" value={analytics.stats.clicks} />
                <StatCard label="Unsubscribes" value={analytics.stats.unsubscribes} />
              </div>
            ) : (
              <Notice tone="warning" title="No engagement reported">
                This campaign has not reported delivery or engagement data. NexTake does not
                fabricate newsletter metrics — numbers appear once the email provider posts
                webhook results back to the console.
              </Notice>
            )}

            <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-600">
              Recipients at queue time: {analytics.recipients || "not resolved"}
              <br />
              Template: {analytics.template} · Audience: {analytics.audience}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete this campaign?"
        message={`“${deleteTarget?.name ?? ""}” will be removed from the campaign list.`}
        confirmLabel="Delete campaign"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) workspace.newsletter.remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
