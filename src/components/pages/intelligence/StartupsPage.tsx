/**
 * Startup intelligence listing (brief §12).
 *
 * Search + industry/country/stage filtering, the record fields editors scan for
 * (funding, founded, stage, coverage, sources) and a route into the dossier.
 */

import { useMemo, useState } from "react";
import {
  Building2,
  ExternalLink,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import type { Startup } from "../../../lib/workspace/types";
import { MARKETS, canonicalDisplayName } from "../../../lib/workspace/taxonomy";
import {
  Badge,
  Button,
  EmptyState,
  Notice,
  OriginBadge,
  StatusBadge,
  StatCard,
} from "../../ui/primitives";
import {
  DataTable,
  FilterSelect,
  IconAction,
  Pagination,
  RowActions,
  SearchInput,
  type Column,
} from "../../ui/data";
import { Modal, ConfirmDialog } from "../../ui/overlay";
import { Field, Select, TextArea, TextInput } from "../../ui/form";
import { PageHeader } from "../../ui/layout";

const PAGE_SIZE = 10;

function totalRaised(startup: Startup): number {
  return startup.fundingRounds.reduce(
    (sum, round) => sum + (round.amount ?? 0),
    0
  );
}

function formatMoney(amount: number, currency = "USD"): string {
  if (amount <= 0) return "Not disclosed";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: amount >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(amount);
}

export default function StartupsPage({
  onOpenDossier,
}: {
  onOpenDossier: (startupId: string) => void;
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "startups.manage");

  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [country, setCountry] = useState("all");
  const [stage, setStage] = useState("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Startup | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    industry: workspace.taxonomy.names("industry")[0] ?? "Fintech",
    country: "Nigeria" as string,
    headquarters: "",
    website: "",
    foundedYear: "",
    stage: "Seed",
    description: "",
  });

  const industries = useMemo(() => {
    const set = new Set([
      ...workspace.taxonomy.names("industry"),
      ...workspace.startups.items.map((startup) => startup.industry),
    ]);
    return Array.from(set).sort();
  }, [workspace.startups.items, workspace.taxonomy]);

  const stages = useMemo(() => {
    const set = new Set(workspace.startups.items.map((startup) => startup.stage).filter(Boolean));
    return Array.from(set).sort();
  }, [workspace.startups.items]);

  const coverageCount = (startup: Startup) =>
    workspace.articles.items.filter(
      (article) =>
        startup.articleIds.includes(article.id) ||
        (article.relatedStartupIds ?? []).includes(startup.id)
    ).length;

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.startups.items.filter((startup) => {
      if (industry !== "all" && startup.industry !== industry) return false;
      if (country !== "all" && startup.country !== country) return false;
      if (stage !== "all" && startup.stage !== stage) return false;

      if (!query) return true;
      return [startup.name, startup.description, startup.industry, startup.country, startup.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [country, industry, search, stage, workspace.startups.items]);

  const totals = useMemo(
    () => ({
      count: workspace.startups.items.length,
      tracked: workspace.startups.items.reduce((sum, startup) => sum + totalRaised(startup), 0),
      withCoverage: workspace.startups.items.filter((startup) => coverageCount(startup) > 0).length,
      sources: new Set(workspace.startups.items.flatMap((startup) => startup.sourceIds)).size,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace.startups.items, workspace.articles.items]
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const createStartup = () => {
    if (!form.name.trim()) return;
    const created = workspace.startups.create({
      name: form.name.trim(),
      slug: form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      logoUrl: "",
      description: form.description,
      industry: workspace.taxonomy.resolve("industry", form.industry),
      foundedYear: form.foundedYear,
      headquarters: form.headquarters,
      country: form.country,
      website: form.website,
      markets: [form.country],
      businessModel: "",
      companyStatus: "active",
      stage: form.stage,
      financials: [],
      fundingRounds: [],
      products: [],
      market: "",
      traction: [],
      leadershipIds: [],
      competitors: [],
      technology: [],
      risks: [],
      developments: [],
      sourceIds: [],
      articleIds: [],
      tags: [],
      seo: {
        slug: form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        metaTitle: `${form.name.trim()} — dossier | NexTake`,
        metaDescription: form.description.slice(0, 160),
        ogImageUrl: "",
      },
    });
    setCreating(false);
    setFlash(`“${created.name}” added to the intelligence store.`);
    setForm({
      name: "",
      industry: industries[0] ?? "Fintech",
      country: "Nigeria",
      headquarters: "",
      website: "",
      foundedYear: "",
      stage: "Seed",
      description: "",
    });
    onOpenDossier(created.id);
  };

  const columns: Column<Startup>[] = [
    {
      key: "name",
      header: "Startup",
      render: (startup) => (
        <div className="flex items-center gap-3">
          {startup.logoUrl ? (
            <img
              src={startup.logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg border border-[#071A2B]/10 object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
              <Building2 className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <button
              onClick={() => onOpenDossier(startup.id)}
              className="block cursor-pointer truncate text-left text-sm font-bold text-[#071A2B] hover:underline"
            >
              {startup.name}
            </button>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="mint">{startup.industry}</Badge>
              <OriginBadge origin={startup.origin} />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      hideOnMobile: true,
      render: (startup) => (
        <span className="text-xs text-slate-600">
          {startup.headquarters || startup.country}
        </span>
      ),
    },
    {
      key: "funding",
      header: "Funding",
      render: (startup) => (
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-[#071A2B]">
            {formatMoney(totalRaised(startup))}
          </span>
          <span className="block text-[10px] text-slate-500">
            {startup.fundingRounds.length} round
            {startup.fundingRounds.length === 1 ? "" : "s"} on record
          </span>
        </div>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      hideOnMobile: true,
      render: (startup) => <StatusBadge status={startup.stage || "unknown"} />,
    },
    {
      key: "coverage",
      header: "Coverage",
      hideOnMobile: true,
      render: (startup) => (
        <span className="text-xs text-slate-600">
          {coverageCount(startup)} stor{coverageCount(startup) === 1 ? "y" : "ies"}
          <span className="block text-[10px] text-slate-400">
            {startup.sourceIds.length} sources
          </span>
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (startup) => (
        <RowActions>
          <Button size="sm" variant="outline" onClick={() => onOpenDossier(startup.id)}>
            Open dossier
          </Button>
          {startup.website && (
            <IconAction
              label="Open website"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(startup.website, "_blank", "noopener")}
            />
          )}
          {canManage && (
            <IconAction
              label="Delete startup"
              tone="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setDeleteTarget(startup)}
            />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Startups"
        description="Structured intelligence records: funding, leadership, products, risks and coverage."
        badge={<Badge tone="mint">{workspace.startups.items.length} dossiers</Badge>}
        actions={
          canManage && (
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5 stroke-[2.5]" />}
              onClick={() => setCreating(true)}
            >
              Add startup
            </Button>
          )
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tracked startups" value={totals.count} icon={<Zap className="h-3.5 w-3.5" />} />
        <StatCard
          label="Funding on record"
          value={formatMoney(totals.tracked)}
          hint="from disclosed rounds"
          icon={<Building2 className="h-3.5 w-3.5" />}
        />
        <StatCard label="With editorial coverage" value={totals.withCoverage} />
        <StatCard label="Distinct sources" value={totals.sources} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search startups by name, industry or tag…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Industry"
            value={industry}
            onChange={(value) => {
              setIndustry(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All industries" },
              ...industries.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
          <FilterSelect
            label="Country"
            value={country}
            onChange={(value) => {
              setCountry(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All countries" },
              ...MARKETS.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
          <FilterSelect
            label="Stage"
            value={stage}
            onChange={(value) => {
              setStage(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All stages" },
              ...stages.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
        </div>
      </div>

      <DataTable
        rows={paged}
        columns={columns}
        onRowClick={(startup) => onOpenDossier(startup.id)}
        renderCard={(startup) => (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {startup.logoUrl ? (
                <img src={startup.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                  <Building2 className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#071A2B]">{startup.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone="mint">{startup.industry}</Badge>
                  <Badge tone="neutral">{startup.country}</Badge>
                  <StatusBadge status={startup.stage || "unknown"} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {formatMoney(totalRaised(startup))} · {coverageCount(startup)} stories
              </span>
              <Button size="sm" variant="outline" onClick={() => onOpenDossier(startup.id)}>
                Dossier
              </Button>
            </div>
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Zap className="h-9 w-9" />}
            title="No startups match these filters"
            description="Try a different industry, country or stage — or add a new dossier."
          />
        }
        footer={
          <Pagination page={page} pageCount={pageCount} total={rows.length} onPageChange={setPage} />
        }
      />

      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Add a startup dossier"
        description="Create the record, then complete the dossier sections."
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!form.name.trim()} onClick={createStartup}>
              Create dossier
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name" required className="sm:col-span-2">
            <TextInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Flutterwave"
            />
          </Field>
          <Field label="Industry">
            <Select
              value={form.industry}
              onChange={(event) => setForm({ ...form, industry: event.target.value })}
            >
              {industries.map((entry) => (
                <option key={entry} value={entry}>
                  {canonicalDisplayName(entry)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Country">
            <Select
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            >
              {MARKETS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Headquarters">
            <TextInput
              value={form.headquarters}
              onChange={(event) => setForm({ ...form, headquarters: event.target.value })}
              placeholder="Lagos"
            />
          </Field>
          <Field label="Founded">
            <TextInput
              value={form.foundedYear}
              onChange={(event) => setForm({ ...form, foundedYear: event.target.value })}
              placeholder="2016"
            />
          </Field>
          <Field label="Stage">
            <TextInput
              value={form.stage}
              onChange={(event) => setForm({ ...form, stage: event.target.value })}
              placeholder="Series B"
            />
          </Field>
          <Field label="Website">
            <TextInput
              value={form.website}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What the company does, in two sentences."
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete this dossier?"
        message={`“${deleteTarget?.name ?? ""}” and its dossier sections will be removed. Linked stories keep their own records.`}
        confirmLabel="Delete dossier"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) workspace.startups.remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
