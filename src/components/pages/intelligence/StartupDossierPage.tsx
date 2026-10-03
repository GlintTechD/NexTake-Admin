/**
 * Startup dossier (brief §13).
 *
 * Structured intelligence record with the sections the Operations Department
 * asked for: Overview, Financials, Funding, Products, Market, Traction,
 * Leadership, Competition, Technology, Risks, Developments, Due Diligence,
 * Sources and SEO — plus the editorial coverage linked to the company.
 */

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  ExternalLink,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  UserSquare2,
  X,
} from "lucide-react";
import { useWorkspace } from "../../../lib/workspace/context";
import { useAuth } from "../../../lib/auth/context";
import { can } from "../../../lib/permissions";
import type {
  Development,
  DevelopmentKind,
  DisclosureStatus,
  FundingRound,
  FundingRoundType,
  Startup,
} from "../../../lib/workspace/types";
import { MARKETS, canonicalDisplayName } from "../../../lib/workspace/taxonomy";
import { articlesForStartup } from "../../../lib/workspace/relations";
import EntityPicker from "../../admin/EntityPicker";
import SuggestionPanel from "../../admin/SuggestionPanel";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Notice,
  OriginBadge,
  ProgressBar,
  StatusBadge,
} from "../../ui/primitives";
import { DefinitionList, Tabs } from "../../ui/layout";
import { Field, Select, StringListEditor, TextArea, TextInput } from "../../ui/form";
import { Modal } from "../../ui/overlay";

const ROUND_TYPES: FundingRoundType[] = [
  "pre_seed",
  "seed",
  "series_a",
  "series_b",
  "series_c_plus",
  "debt",
  "grant",
  "ipo",
  "acquisition",
  "undisclosed",
];

const DISCLOSURE: DisclosureStatus[] = ["disclosed", "reported", "estimated", "undisclosed"];

const DEVELOPMENT_KINDS: DevelopmentKind[] = [
  "partnership",
  "funding",
  "product",
  "expansion",
  "leadership",
  "award",
  "regulatory",
  "other",
];

type SectionId =
  | "overview"
  | "financials"
  | "funding"
  | "operations"
  | "leadership"
  | "developments"
  | "coverage"
  | "diligence"
  | "sources"
  | "seo";

export default function StartupDossierPage({
  startupId,
  onExit,
  onOpenArticle,
}: {
  startupId: string;
  onExit: () => void;
  onOpenArticle: (articleId: string) => void;
}) {
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const canManage = can(profile, "startups.manage");

  const stored = workspace.startups.byId(startupId);
  const [draft, setDraft] = useState<Startup | null>(stored ? { ...stored } : null);
  const [section, setSection] = useState<SectionId>("overview");
  const [flash, setFlash] = useState<string | null>(null);
  const [roundModal, setRoundModal] = useState(false);
  const [developmentModal, setDevelopmentModal] = useState(false);

  const industryOptions = useMemo(
    () => workspace.taxonomy.names("industry"),
    [workspace.taxonomy]
  );

  const coverage = useMemo(
    () => (draft ? articlesForStartup(draft, workspace.articles.items) : []),
    [draft, workspace.articles.items]
  );

  if (!draft) {
    return (
      <EmptyState
        icon={<Building2 className="h-9 w-9" />}
        title="Dossier not found"
        description="This startup record is no longer in the workspace."
        action={
          <Button size="sm" variant="outline" onClick={onExit}>
            Back to startups
          </Button>
        }
      />
    );
  }

  const patch = (changes: Partial<Startup>) => setDraft({ ...draft, ...changes });

  const save = (detail?: string) => {
    workspace.startups.update(draft.id, draft);
    setFlash(detail ?? "Dossier saved.");
    window.setTimeout(() => setFlash(null), 3500);
  };

  const totalRaised = draft.fundingRounds.reduce((sum, round) => sum + (round.amount ?? 0), 0);
  const disclosed = draft.financials.filter((metric) => metric.disclosure === "disclosed").length;
  const incomplete = [
    !draft.description,
    draft.fundingRounds.length === 0,
    draft.leadershipIds.length === 0,
    draft.sourceIds.length === 0,
    !draft.market,
  ].filter(Boolean).length;

  const addRound = (round: FundingRound) => patch({ fundingRounds: [...draft.fundingRounds, round] });
  const addDevelopment = (development: Development) =>
    patch({
      developments: [...draft.developments, development].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    });

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 border-b border-[#071A2B]/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={onExit}
            className="mt-1 cursor-pointer rounded-lg border border-[#071A2B]/15 p-2 text-[#071A2B] hover:bg-slate-50"
            aria-label="Back to startups"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {draft.logoUrl ? (
            <img
              src={draft.logoUrl}
              alt=""
              className="h-14 w-14 rounded-xl border border-[#071A2B]/10 object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#071A2B] text-[#7FFFD4]">
              <Building2 className="h-6 w-6" />
            </span>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#071A2B]">
                {draft.name}
              </h1>
              <StatusBadge status={draft.companyStatus} />
              <Badge tone="mint">{draft.industry}</Badge>
              <OriginBadge origin={draft.origin} />
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {draft.description || "No overview yet — add a two-sentence summary."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
              <span>{draft.headquarters || draft.country}</span>
              <span>Founded {draft.foundedYear || "—"}</span>
              <span>Stage {draft.stage || "—"}</span>
              {draft.website && (
                <a
                  href={draft.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#071A2B] underline decoration-[#7FFFD4] decoration-2 underline-offset-2"
                >
                  Website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {canManage && (
          <Button size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={() => save()}>
            Save dossier
          </Button>
        )}
      </div>

      {flash && <Notice tone="success">{flash}</Notice>}
      {incomplete > 0 && (
        <Notice tone="warning" title="Dossier completeness">
          {incomplete} section{incomplete === 1 ? "" : "s"} still need input (overview, funding,
          leadership, market or sources). Incomplete records are flagged in the dossier index.
          <div className="mt-2">
            <ProgressBar value={((5 - incomplete) / 5) * 100} tone="amber" />
          </div>
        </Notice>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* SECTION TABS                                                      */}
      {/* ---------------------------------------------------------------- */}
      <Tabs<SectionId>
        active={section}
        onChange={setSection}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "financials", label: "Financials", count: draft.financials.length },
          { id: "funding", label: "Funding", count: draft.fundingRounds.length },
          { id: "operations", label: "Products & market" },
          { id: "leadership", label: "Leadership", count: draft.leadershipIds.length },
          { id: "developments", label: "Developments", count: draft.developments.length },
          { id: "coverage", label: "Coverage", count: coverage.length },
          { id: "diligence", label: "Due diligence" },
          { id: "sources", label: "Sources", count: draft.sourceIds.length },
          { id: "seo", label: "SEO" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {section === "overview" && (
            <Card className="space-y-4 p-5">
              <h2 className="text-sm font-bold text-[#071A2B]">Overview</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Company name">
                  <TextInput value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
                </Field>
                <Field label="Industry">
                  <Select
                    value={draft.industry}
                    onChange={(e) =>
                      patch({ industry: workspace.taxonomy.resolve("industry", e.target.value) })
                    }
                  >
                    {Array.from(new Set([...industryOptions, draft.industry])).map((entry) => (
                      <option key={entry} value={entry}>
                        {canonicalDisplayName(entry)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Logo URL">
                  <TextInput
                    value={draft.logoUrl}
                    onChange={(e) => patch({ logoUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Website">
                  <TextInput
                    value={draft.website}
                    onChange={(e) => patch({ website: e.target.value })}
                  />
                </Field>
                <Field label="Founded">
                  <TextInput
                    value={draft.foundedYear}
                    onChange={(e) => patch({ foundedYear: e.target.value })}
                  />
                </Field>
                <Field label="Headquarters">
                  <TextInput
                    value={draft.headquarters}
                    onChange={(e) => patch({ headquarters: e.target.value })}
                  />
                </Field>
                <Field label="Country">
                  <Select
                    value={draft.country}
                    onChange={(e) => patch({ country: e.target.value })}
                  >
                    {Array.from(new Set([...MARKETS, draft.country])).map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Company status">
                  <Select
                    value={draft.companyStatus}
                    onChange={(e) =>
                      patch({ companyStatus: e.target.value as Startup["companyStatus"] })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="acquired">Acquired</option>
                    <option value="merged">Merged</option>
                    <option value="ipo">Listed</option>
                    <option value="shut_down">Shut down</option>
                    <option value="unknown">Unknown</option>
                  </Select>
                </Field>
                <Field label="Stage">
                  <TextInput value={draft.stage} onChange={(e) => patch({ stage: e.target.value })} />
                </Field>
                <Field label="Business model">
                  <TextInput
                    value={draft.businessModel}
                    onChange={(e) => patch({ businessModel: e.target.value })}
                    placeholder="Transaction fees, subscriptions, licensing…"
                  />
                </Field>
              </div>

              <Field label="Description">
                <TextArea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              <Field label="Markets served" hint="Add each market; values match the country vocabulary.">
                <div className="flex flex-wrap gap-1.5">
                  {draft.markets.map((market) => (
                    <span
                      key={market}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#7FFFD4]/50 bg-[#7FFFD4]/15 px-2.5 py-1 text-[11px] font-semibold text-[#071A2B]"
                    >
                      {market}
                      <button
                        type="button"
                        onClick={() =>
                          patch({ markets: draft.markets.filter((entry) => entry !== market) })
                        }
                        className="cursor-pointer text-slate-500 hover:text-rose-600"
                        aria-label={`Remove ${market}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {MARKETS.filter((market) => !draft.markets.includes(market)).map((market) => (
                    <button
                      key={market}
                      type="button"
                      onClick={() => patch({ markets: [...draft.markets, market] })}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#071A2B]/15 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[#7FFFD4] hover:text-[#071A2B]"
                    >
                      <Plus className="h-3 w-3" /> {market}
                    </button>
                  ))}
                </div>
              </Field>
            </Card>
          )}

          {section === "financials" && (
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#071A2B]">Financials</h2>
                  <p className="text-[11px] text-slate-500">
                    Every figure keeps its disclosure status, source and date.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() =>
                    patch({
                      financials: [
                        ...draft.financials,
                        {
                          id: `fin-${Date.now().toString(36)}`,
                          label: "Total funding raised",
                          value: "",
                          currency: "USD",
                          disclosure: "reported",
                          sourceId: null,
                          asOf: new Date().toISOString(),
                        },
                      ],
                    })
                  }
                >
                  Add metric
                </Button>
              </div>

              <div className="space-y-3">
                {draft.financials.map((metric, index) => (
                  <div
                    key={metric.id}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-[#071A2B]/12 p-3 sm:grid-cols-12"
                  >
                    <TextInput
                      className="sm:col-span-3"
                      value={metric.label}
                      onChange={(e) => {
                        const next = [...draft.financials];
                        next[index] = { ...metric, label: e.target.value };
                        patch({ financials: next });
                      }}
                      placeholder="Metric"
                    />
                    <TextInput
                      className="sm:col-span-3"
                      value={metric.value}
                      onChange={(e) => {
                        const next = [...draft.financials];
                        next[index] = { ...metric, value: e.target.value };
                        patch({ financials: next });
                      }}
                      placeholder="Value"
                    />
                    <Select
                      className="sm:col-span-2"
                      value={metric.disclosure}
                      onChange={(e) => {
                        const next = [...draft.financials];
                        next[index] = {
                          ...metric,
                          disclosure: e.target.value as DisclosureStatus,
                        };
                        patch({ financials: next });
                      }}
                    >
                      {DISCLOSURE.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                    <Select
                      className="sm:col-span-3"
                      value={metric.sourceId ?? ""}
                      onChange={(e) => {
                        const next = [...draft.financials];
                        next[index] = { ...metric, sourceId: e.target.value || null };
                        patch({ financials: next });
                      }}
                    >
                      <option value="">No source linked</option>
                      {workspace.sources.items.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.publisher}
                        </option>
                      ))}
                    </Select>
                    <button
                      onClick={() =>
                        patch({
                          financials: draft.financials.filter((entry) => entry.id !== metric.id),
                        })
                      }
                      className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:col-span-1"
                      aria-label="Remove metric"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {draft.financials.length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#071A2B]/20 px-4 py-6 text-center text-xs text-slate-500">
                    No financial metrics recorded yet. Add funding raised, valuation, revenue,
                    headcount or the latest round.
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <DefinitionList
                  columns={3}
                  items={[
                    { label: "Metrics on record", value: draft.financials.length },
                    { label: "Fully disclosed", value: disclosed },
                    {
                      label: "Estimated / reported",
                      value: draft.financials.length - disclosed,
                    },
                  ]}
                />
              </div>
            </Card>
          )}

          {section === "funding" && (
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#071A2B]">Funding history</h2>
                  <p className="text-[11px] text-slate-500">
                    Rounds, amounts, investors and the sources that substantiate them.
                  </p>
                </div>
                <Button
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setRoundModal(true)}
                >
                  Add round
                </Button>
              </div>

              <div className="space-y-3">
                {[...draft.fundingRounds]
                  .sort(
                    (a, b) =>
                      new Date(b.announcedAt ?? 0).getTime() -
                      new Date(a.announcedAt ?? 0).getTime()
                  )
                  .map((round) => (
                    <div
                      key={round.id}
                      className="space-y-2 rounded-xl border border-[#071A2B]/12 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge tone="navy">{round.roundType.replace(/_/g, " ")}</Badge>
                          <span className="text-sm font-bold text-[#071A2B]">
                            {round.amount
                              ? `${round.currency} ${round.amount.toLocaleString()}`
                              : "Amount not disclosed"}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <CalendarClock className="h-3 w-3" />
                          {round.announcedAt
                            ? new Date(round.announcedAt).toLocaleDateString()
                            : "date unknown"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Lead investor: <strong>{round.leadInvestor || "—"}</strong>
                        {round.investors.length > 0 && ` · Also: ${round.investors.join(", ")}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {round.sourceIds.map((id) => (
                          <Badge key={id} tone="neutral">
                            {workspace.sources.byId(id)?.publisher ?? id}
                          </Badge>
                        ))}
                        <button
                          onClick={() =>
                            patch({
                              fundingRounds: draft.fundingRounds.filter(
                                (entry) => entry.id !== round.id
                              ),
                            })
                          }
                          className="ml-auto cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove round"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {round.notes && (
                        <p className="text-[11px] italic text-slate-500">{round.notes}</p>
                      )}
                    </div>
                  ))}

                {draft.fundingRounds.length === 0 && (
                  <EmptyState
                    icon={<BadgeCheck className="h-8 w-8" />}
                    title="No funding rounds on record"
                    description="Add rounds as they are reported, then link the sources that back each figure."
                  />
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <DefinitionList
                  columns={3}
                  items={[
                    { label: "Rounds", value: draft.fundingRounds.length },
                    {
                      label: "Total amount on record",
                      value: totalRaised > 0 ? `USD ${totalRaised.toLocaleString()}` : "Not disclosed",
                    },
                    {
                      label: "Sources linked",
                      value: new Set(draft.fundingRounds.flatMap((r) => r.sourceIds)).size,
                    },
                  ]}
                />
              </div>
            </Card>
          )}

          {section === "operations" && (
            <Card className="space-y-6 p-5">
              <Field label="Products & services">
                <StringListEditor
                  values={draft.products}
                  onChange={(products) => patch({ products })}
                  placeholder="Product name"
                />
              </Field>

              <Field label="Market position">
                <TextArea
                  rows={3}
                  value={draft.market}
                  onChange={(e) => patch({ market: e.target.value })}
                  placeholder="Who they sell to, and against whom."
                />
              </Field>

              <Field label="Traction signals">
                <StringListEditor
                  values={draft.traction}
                  onChange={(traction) => patch({ traction })}
                  placeholder="Customers, licences, volume…"
                />
              </Field>

              <Field label="Competitors">
                <StringListEditor
                  values={draft.competitors}
                  onChange={(competitors) => patch({ competitors })}
                  placeholder="Competitor"
                />
              </Field>

              <Field label="Technology">
                <StringListEditor
                  values={draft.technology}
                  onChange={(technology) => patch({ technology })}
                  placeholder="Platform, infrastructure, IP"
                />
              </Field>
            </Card>
          )}

          {section === "leadership" && (
            <Card className="space-y-5 p-5">
              <h2 className="text-sm font-bold text-[#071A2B]">Leadership</h2>
              <EntityPicker
                label="Executives & founders"
                types={["person"]}
                selectedIds={draft.leadershipIds}
                onChange={(leadershipIds) => patch({ leadershipIds })}
                hint="People are reusable entities — the same record can be linked from stories and interviews."
                allowCreate
                onCreate={() => onExit()}
              />

              <div className="space-y-2">
                {draft.leadershipIds.map((id) => {
                  const person = workspace.people.byId(id);
                  if (!person) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[#071A2B]/12 p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#071A2B] text-[#7FFFD4]">
                          <UserSquare2 className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#071A2B]">{person.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {person.currentRole || person.role} · {person.organization}
                          </p>
                          <p className="mt-1 max-w-xl text-[11px] text-slate-500">
                            {person.biography || "No background recorded yet."}
                          </p>
                        </div>
                      </div>
                      {person.links.linkedin && (
                        <a
                          href={person.links.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[11px] font-semibold text-[#071A2B] underline decoration-[#7FFFD4] decoration-2 underline-offset-2"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  );
                })}
                {draft.leadershipIds.length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#071A2B]/20 px-4 py-6 text-center text-xs text-slate-500">
                    No executives linked. Search the people directory above.
                  </p>
                )}
              </div>
            </Card>
          )}

          {section === "developments" && (
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#071A2B]">Development timeline</h2>
                  <p className="text-[11px] text-slate-500">
                    Partnerships, funding, launches, expansions and other significant changes.
                  </p>
                </div>
                <Button
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setDevelopmentModal(true)}
                >
                  Add development
                </Button>
              </div>

              <ol className="relative space-y-4 border-l border-[#071A2B]/12 pl-5">
                {draft.developments.map((development) => (
                  <li key={development.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#7FFFD4] ring-4 ring-[#7FFFD4]/20" />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="mint">{development.kind}</Badge>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {new Date(development.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#071A2B]">{development.title}</p>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        {development.summary}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {development.sourceIds.map((id) => (
                          <Badge key={id} tone="neutral">
                            {workspace.sources.byId(id)?.publisher ?? id}
                          </Badge>
                        ))}
                        <button
                          onClick={() =>
                            patch({
                              developments: draft.developments.filter(
                                (entry) => entry.id !== development.id
                              ),
                            })
                          }
                          className="ml-auto cursor-pointer rounded-lg p-1 text-slate-400 hover:text-rose-600"
                          aria-label="Remove development"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {draft.developments.length === 0 && (
                <EmptyState
                  icon={<CalendarClock className="h-8 w-8" />}
                  title="No developments recorded"
                  description="Add funding rounds, partnerships, product launches and expansions to build the timeline."
                />
              )}
            </Card>
          )}

          {section === "coverage" && (
            <Card className="space-y-4 p-5">
              <div>
                <h2 className="text-sm font-bold text-[#071A2B]">Editorial coverage</h2>
                <p className="text-[11px] text-slate-500">
                  Stories linked to this dossier from the article editor or the coverage screen.
                </p>
              </div>

              <div className="space-y-2">
                {coverage.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => onOpenArticle(article.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#071A2B]/12 p-3 text-left transition-colors hover:border-[#7FFFD4]"
                  >
                    {article.image && (
                      <img src={article.image} alt="" className="h-10 w-14 rounded-lg object-cover" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#071A2B]">
                        {article.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                        <StatusBadge status={article.status} />
                        <span>{article.date}</span>
                      </span>
                    </span>
                  </button>
                ))}

                {coverage.length === 0 && (
                  <EmptyState
                    title="No coverage yet"
                    description="Link stories from the article editor's relationships tab."
                  />
                )}
              </div>
            </Card>
          )}

          {section === "diligence" && (
            <Card className="space-y-6 p-5">
              <div>
                <h2 className="text-sm font-bold text-[#071A2B]">Due diligence</h2>
                <p className="text-[11px] text-slate-500">
                  Verification checklist and open questions for this record.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Overview complete", done: !!draft.description && !!draft.industry },
                  { label: "Funding rounds sourced", done: draft.fundingRounds.every((r) => r.sourceIds.length > 0) && draft.fundingRounds.length > 0 },
                  { label: "Leadership verified", done: draft.leadershipIds.length > 0 },
                  { label: "Market position documented", done: !!draft.market },
                  { label: "Risks recorded", done: draft.risks.filter(Boolean).length > 0 },
                  { label: "Primary source attached", done: draft.sourceIds.some((id) => workspace.sources.byId(id)?.reliability === "primary") },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-[#071A2B]/12 px-3.5 py-2.5"
                  >
                    <span className="text-xs font-semibold text-[#071A2B]">{item.label}</span>
                    <Badge tone={item.done ? "emerald" : "amber"}>
                      {item.done ? "complete" : "outstanding"}
                    </Badge>
                  </div>
                ))}
              </div>

              <Field label="Risks & open questions">
                <StringListEditor
                  values={draft.risks}
                  onChange={(risks) => patch({ risks })}
                  placeholder="Currency exposure, talent, regulation…"
                />
              </Field>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <ShieldAlert className="h-4 w-4" />
                  Verification responsibility
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
                  Claims extracted from this dossier must cite a source record. The fact-checker
                  role is the only one that can mark a claim as verified.
                </p>
              </div>
            </Card>
          )}

          {section === "sources" && (
            <Card className="space-y-5 p-5">
              <h2 className="text-sm font-bold text-[#071A2B]">Sources</h2>
              <EntityPicker
                label="Linked sources"
                types={["source"]}
                selectedIds={draft.sourceIds}
                onChange={(sourceIds) => patch({ sourceIds })}
                hint="Sources are reusable across articles, dossiers and claims."
              />

              <div className="space-y-2">
                {draft.sourceIds.map((id) => {
                  const source = workspace.sources.byId(id);
                  if (!source) return null;
                  const claims = workspace.claims.items.filter((claim) =>
                    claim.sourceIds.includes(source.id)
                  );
                  return (
                    <div
                      key={id}
                      className="space-y-1 rounded-xl border border-[#071A2B]/12 p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#071A2B]">
                          {source.publisher}
                        </span>
                        <Badge tone={source.reliability === "primary" ? "emerald" : "neutral"}>
                          {source.reliability}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600">{source.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {source.author} ·{" "}
                        {source.publishedAt
                          ? new Date(source.publishedAt).toLocaleDateString()
                          : "date unknown"}{" "}
                        · {claims.length} claim{claims.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {section === "seo" && (
            <Card className="space-y-4 p-5">
              <h2 className="text-sm font-bold text-[#071A2B]">Dossier SEO</h2>
              <Field label="URL slug">
                <TextInput
                  value={draft.seo.slug}
                  onChange={(e) => patch({ seo: { ...draft.seo, slug: e.target.value } })}
                />
              </Field>
              <Field label="Meta title">
                <TextInput
                  value={draft.seo.metaTitle}
                  onChange={(e) => patch({ seo: { ...draft.seo, metaTitle: e.target.value } })}
                />
              </Field>
              <Field label="Meta description">
                <TextArea
                  rows={3}
                  value={draft.seo.metaDescription}
                  onChange={(e) =>
                    patch({ seo: { ...draft.seo, metaDescription: e.target.value } })
                  }
                />
              </Field>
              <Field label="Open Graph image URL">
                <TextInput
                  value={draft.seo.ogImageUrl}
                  onChange={(e) => patch({ seo: { ...draft.seo, ogImageUrl: e.target.value } })}
                />
              </Field>
            </Card>
          )}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* SIDE PANEL                                                     */}
        {/* -------------------------------------------------------------- */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold text-[#071A2B]">Dossier snapshot</h2>
            <DefinitionList
              columns={1}
              items={[
                { label: "Industry", value: draft.industry },
                { label: "Country", value: draft.country },
                { label: "Stage", value: draft.stage || "—" },
                {
                  label: "Funding on record",
                  value: totalRaised > 0 ? `USD ${totalRaised.toLocaleString()}` : "Not disclosed",
                },
                { label: "Rounds", value: draft.fundingRounds.length },
                { label: "Developments", value: draft.developments.length },
                { label: "Stories", value: coverage.length },
                { label: "Sources", value: draft.sourceIds.length },
              ]}
            />
          </Card>

          <SuggestionPanel
            hostType="startup"
            hostId={draft.id}
            hostLabel={draft.name}
            text={`${draft.name} ${draft.description} ${draft.market} ${draft.tags.join(" ")}`}
            tags={draft.tags}
            linkedArticleIds={coverage.map((article) => article.id)}
            linkedPersonIds={draft.leadershipIds}
            onAccept={(suggestion) => {
              if (suggestion.targetType === "article") {
                patch({
                  articleIds: Array.from(new Set([...draft.articleIds, suggestion.targetId])),
                });
                const article = workspace.articles.byId(suggestion.targetId);
                if (article) {
                  workspace.articles.save({
                    ...article,
                    relatedStartupIds: Array.from(
                      new Set([...(article.relatedStartupIds ?? []), draft.id])
                    ),
                  });
                }
              } else if (suggestion.targetType === "person") {
                patch({
                  leadershipIds: Array.from(new Set([...draft.leadershipIds, suggestion.targetId])),
                });
              } else if (suggestion.targetType === "tag") {
                patch({ tags: Array.from(new Set([...draft.tags, suggestion.targetLabel])) });
              }
              setFlash("Approved — save the dossier to persist the change.");
            }}
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* MODALS                                                            */}
      {/* ---------------------------------------------------------------- */}
      <FundingRoundModal
        isOpen={roundModal}
        onClose={() => setRoundModal(false)}
        onSubmit={(round) => {
          addRound(round);
          setRoundModal(false);
          setFlash("Round added — save the dossier to persist it.");
        }}
        sources={workspace.sources.items.map((source) => ({
          id: source.id,
          label: source.publisher,
        }))}
      />

      <DevelopmentModal
        isOpen={developmentModal}
        onClose={() => setDevelopmentModal(false)}
        onSubmit={(development) => {
          addDevelopment(development);
          setDevelopmentModal(false);
          setFlash("Development added — save the dossier to persist it.");
        }}
        sources={workspace.sources.items.map((source) => ({
          id: source.id,
          label: source.publisher,
        }))}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             ROUND / TIMELINE                               */
/* -------------------------------------------------------------------------- */

function FundingRoundModal({
  isOpen,
  onClose,
  onSubmit,
  sources,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (round: FundingRound) => void;
  sources: Array<{ id: string; label: string }>;
}) {
  const [roundType, setRoundType] = useState<FundingRoundType>("seed");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [announcedAt, setAnnouncedAt] = useState(new Date().toISOString().slice(0, 10));
  const [leadInvestor, setLeadInvestor] = useState("");
  const [investors, setInvestors] = useState("");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add funding round"
      description="Leave the amount empty when the figure has not been disclosed."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSubmit({
                id: `fr-${Date.now().toString(36)}`,
                roundType,
                amount: amount.trim() ? Number(amount.replace(/[^\d.]/g, "")) : null,
                currency,
                announcedAt: announcedAt ? new Date(announcedAt).toISOString() : null,
                leadInvestor,
                investors: investors
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter(Boolean),
                sourceIds,
                notes,
              });
              setAmount("");
              setLeadInvestor("");
              setInvestors("");
              setNotes("");
            }}
          >
            Add round
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Round">
          <Select
            value={roundType}
            onChange={(event) => setRoundType(event.target.value as FundingRoundType)}
          >
            {ROUND_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Announced">
          <TextInput
            type="date"
            value={announcedAt}
            onChange={(event) => setAnnouncedAt(event.target.value)}
          />
        </Field>
        <Field label="Amount" hint="Numbers only — leave blank if undisclosed.">
          <TextInput
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="100000000"
          />
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {["USD", "EUR", "GBP", "NGN", "KES", "ZAR"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lead investor" className="sm:col-span-2">
          <TextInput
            value={leadInvestor}
            onChange={(event) => setLeadInvestor(event.target.value)}
          />
        </Field>
        <Field label="Other investors" hint="Comma separated" className="sm:col-span-2">
          <TextInput value={investors} onChange={(event) => setInvestors(event.target.value)} />
        </Field>
        <Field label="Sources" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {sources.map((source) => {
              const active = sourceIds.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() =>
                    setSourceIds(
                      active
                        ? sourceIds.filter((id) => id !== source.id)
                        : [...sourceIds, source.id]
                    )
                  }
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    active
                      ? "border-[#7FFFD4] bg-[#7FFFD4]/20 text-[#071A2B]"
                      : "border-[#071A2B]/15 text-slate-600"
                  }`}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <TextArea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function DevelopmentModal({
  isOpen,
  onClose,
  onSubmit,
  sources,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (development: Development) => void;
  sources: Array<{ id: string; label: string }>;
}) {
  const [kind, setKind] = useState<DevelopmentKind>("partnership");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add development"
      description="Developments appear on the company timeline in date order."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim()}
            onClick={() => {
              onSubmit({
                id: `dev-${Date.now().toString(36)}`,
                kind,
                title: title.trim(),
                summary,
                date: new Date(date).toISOString(),
                sourceIds,
              });
              setTitle("");
              setSummary("");
            }}
          >
            Add development
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select
            value={kind}
            onChange={(event) => setKind(event.target.value as DevelopmentKind)}
          >
            {DEVELOPMENT_KINDS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Headline" className="sm:col-span-2">
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Kenyan PSP licence granted"
          />
        </Field>
        <Field label="Summary" className="sm:col-span-2">
          <TextArea
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </Field>
        <Field label="Sources" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {sources.map((source) => {
              const active = sourceIds.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() =>
                    setSourceIds(
                      active
                        ? sourceIds.filter((id) => id !== source.id)
                        : [...sourceIds, source.id]
                    )
                  }
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    active
                      ? "border-[#7FFFD4] bg-[#7FFFD4]/20 text-[#071A2B]"
                      : "border-[#071A2B]/15 text-slate-600"
                  }`}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
