/**
 * Sample workspace records.
 *
 * These are the contents of the local NexTake workspace when no database is
 * provisioned (or when a table has not been migrated yet). Every record is
 * tagged `origin: "sample"` so the console can label it — the UI never presents
 * sample content as live production data, and analytics derived from it say so.
 */

import type {
  Claim,
  Company,
  EngagementEvent,
  Industry,
  MediaAsset,
  NexTakeEvent,
  NewsletterCampaign,
  NewsletterSubscriber,
  Person,
  RelationshipSuggestion,
  StoredRoleDefinition,
  Source,
  Startup,
  TaxonomyTerm,
  WorkspaceUser,
} from "./types";
import { ROLE_DEFINITIONS } from "../permissions";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_INDUSTRIES,
  DEFAULT_TAGS,
  taxonomySlug,
} from "./taxonomy";

const DAY = 86_400_000;

function daysAgo(days: number, hour = 9): string {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function inDays(days: number, hour = 10): string {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function base(id: string, createdAt: string, updatedAt = createdAt) {
  return {
    origin: "sample" as const,
    id,
    createdAt,
    updatedAt,
    createdBy: "nextake-admin@nextake.africa",
    updatedBy: "nextake-admin@nextake.africa",
  };
}

/* -------------------------------------------------------------------------- */
/*                                  TAXONOMY                                  */
/* -------------------------------------------------------------------------- */

export function seedTaxonomy(): TaxonomyTerm[] {
  const categories: TaxonomyTerm[] = DEFAULT_CATEGORIES.map((name, index) => ({
    ...base(`cat-${taxonomySlug(name)}`, daysAgo(120 - index)),
    kind: "category",
    name,
    slug: taxonomySlug(name),
    aliases: [],
    description: `${name} coverage on NexTake.`,
  }));

  const industries: TaxonomyTerm[] = DEFAULT_INDUSTRIES.map((name, index) => ({
    ...base(`ind-${taxonomySlug(name)}`, daysAgo(120 - index)),
    kind: "industry",
    name,
    slug: taxonomySlug(name),
    aliases: name === "Fintech" ? ["FinTech", "financial technology"] : [],
    description: `${name} companies tracked in NexTake intelligence.`,
  }));

  const tags: TaxonomyTerm[] = DEFAULT_TAGS.map((name, index) => ({
    ...base(`tag-${taxonomySlug(name)}`, daysAgo(120 - index)),
    kind: "tag",
    name,
    slug: taxonomySlug(name),
    aliases: [],
    description: "",
  }));

  return [...categories, ...industries, ...tags];
}

export function seedIndustries(): Industry[] {
  return DEFAULT_INDUSTRIES.map((name, index) => ({
    ...base(`industry-${taxonomySlug(name)}`, daysAgo(150 - index)),
    name,
    slug: taxonomySlug(name),
    description: `Companies, deals and products across the ${name.toLowerCase()} landscape.`,
    parentId: null,
    aliases: name === "Fintech" ? ["FinTech", "financial technology"] : [],
  }));
}

/* -------------------------------------------------------------------------- */
/*                                   SOURCES                                  */
/* -------------------------------------------------------------------------- */

export function seedSources(): Source[] {
  const rows: Array<
    [string, string, string, string, Source["type"], Source["reliability"], number]
  > = [
    ["TechCrunch", "Flutterwave hits $3bn valuation after Series D extension", "https://techcrunch.com/flutterwave-series-d", "Tage Kene-Okafor", "news", "secondary", 26],
    ["Business Daily Africa", "Paystack expands into Kenya with local acquiring licence", "https://businessdailyafrica.com/paystack-kenya", "Njeri Mwangi", "news", "secondary", 18],
    ["CB Insights", "Africa fintech funding report — H2 2026", "https://cbinsights.com/africa-fintech-h2-2026", "CB Insights Research", "report", "primary", 12],
    ["Flutterwave Newsroom", "Flutterwave acquires Kenyan payments provider", "https://flutterwave.com/newsroom/ke-acquisition", "Corporate Communications", "press_release", "primary", 9],
    ["Kenya Capital Markets Authority", "Digital payments licensing registry", "https://cma.or.ke/licensing-registry", "CMA Kenya", "filing", "primary", 7],
    ["NexTake Interview Desk", "Inside M-KOPA's pay-as-you-go solar playbook", "https://nextake.africa/interviews/m-kopa-playbook", "NexTake Editorial", "interview", "primary", 4],
    ["The Continent", "Why Nigerian startups are hiring in Nairobi", "https://thecontinent.africa/nigeria-nairobi-hiring", "Simon Allison", "news", "secondary", 3],
    ["LinkedIn", "Sun King announces new CEO for West Africa", "https://linkedin.com/posts/sun-king-west-africa-ceo", "Sun King", "social", "secondary", 2],
    ["World Bank", "Sub-Saharan Africa digital economy diagnostic", "https://worldbank.org/ssa-digital-diagnostic", "World Bank", "report", "primary", 33],
    ["NexTake Intelligence", "NexTake startup tracker (internal dataset)", "https://nextake.africa/intelligence", "NexTake Research", "database", "primary", 1],
  ];

  return rows.map(([publisher, title, url, author, type, reliability, ago], index) => ({
    ...base(`src-${index + 1}`, daysAgo(ago)),
    publisher,
    title,
    url,
    publishedAt: daysAgo(ago, 8),
    author,
    type,
    reliability,
    accessedAt: daysAgo(Math.max(0, ago - 1), 11),
    notes: "",
    claimIds: [],
  }));
}

/* -------------------------------------------------------------------------- */
/*                                   CLAIMS                                   */
/* -------------------------------------------------------------------------- */

export function seedClaims(): Claim[] {
  return [
    {
      ...base("claim-1", daysAgo(25)),
      statement:
        "Flutterwave raised an additional $100m Series D extension at a $3bn valuation.",
      claimType: "funding_amount",
      value: "$100,000,000",
      confidence: "reported",
      sourceIds: ["src-1", "src-3"],
      entityRefs: [
        { type: "startup", id: "startup-flutterwave", label: "Flutterwave" },
      ],
      verifiedBy: "NexTake Admin",
      verifiedAt: daysAgo(24),
      notes: "Valuation confirmed by two independent sources; company declined to comment.",
    },
    {
      ...base("claim-2", daysAgo(17)),
      statement: "Paystack holds a Kenyan payment service provider licence.",
      claimType: "market_expansion",
      value: "Kenya PSP licence",
      confidence: "verified",
      sourceIds: ["src-2", "src-5"],
      entityRefs: [{ type: "startup", id: "startup-paystack", label: "Paystack" }],
      verifiedBy: "NexTake Admin",
      verifiedAt: daysAgo(16),
      notes: "Licence number cross-checked against the CMA registry.",
    },
    {
      ...base("claim-3", daysAgo(12)),
      statement:
        "Africa-focused fintech startups raised $1.4bn in the first half of 2026.",
      claimType: "metrics",
      value: "$1,400,000,000",
      confidence: "verified",
      sourceIds: ["src-3", "src-9"],
      entityRefs: [{ type: "industry", id: "industry-fintech", label: "Fintech" }],
      verifiedBy: "NexTake Admin",
      verifiedAt: daysAgo(11),
      notes: "Report excludes debt financing.",
    },
    {
      ...base("claim-4", daysAgo(9)),
      statement: "Flutterwave completed the acquisition of a Kenyan payments provider.",
      claimType: "market_expansion",
      value: "Acquisition completed",
      confidence: "reported",
      sourceIds: ["src-4"],
      entityRefs: [
        { type: "startup", id: "startup-flutterwave", label: "Flutterwave" },
        { type: "startup", id: "startup-paystack", label: "Paystack" },
      ],
      verifiedBy: "NexTake Admin",
      verifiedAt: null,
      notes: "Awaiting regulatory confirmation of the completion notice.",
    },
    {
      ...base("claim-5", daysAgo(3)),
      statement: "Sun King appointed a new West Africa chief executive.",
      claimType: "leadership_change",
      value: "CEO — West Africa",
      confidence: "unverified",
      sourceIds: ["src-8"],
      entityRefs: [
        { type: "startup", id: "startup-sun-king", label: "Sun King" },
        { type: "person", id: "person-adaeze-okoye", label: "Adaeze Okoye" },
      ],
      verifiedBy: "",
      verifiedAt: null,
      notes: "Single social source — needs a second confirmation before publishing.",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*                                  STARTUPS                                  */
/* -------------------------------------------------------------------------- */

function round(
  id: string,
  roundType: Startup["fundingRounds"][number]["roundType"],
  amount: number | null,
  currency: string,
  announcedAt: string,
  leadInvestor: string,
  investors: string[],
  sourceIds: string[],
  notes = ""
): Startup["fundingRounds"][number] {
  return { id, roundType, amount, currency, announcedAt, leadInvestor, investors, sourceIds, notes };
}

export function seedStartups(): Startup[] {
  return [
    {
      ...base("startup-flutterwave", daysAgo(90), daysAgo(4)),
      name: "Flutterwave",
      slug: "flutterwave",
      logoUrl:
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=200&fit=crop",
      description:
        "Pan-African payments infrastructure company offering collections, payouts and a developer-first API across 30+ African markets.",
      industry: "Fintech",
      foundedYear: "2016",
      headquarters: "San Francisco / Lagos",
      country: "Nigeria",
      website: "https://flutterwave.com",
      markets: ["Nigeria", "Kenya", "Ghana", "South Africa", "Egypt", "Africa (pan-regional)"],
      businessModel: "Transaction fees on payment processing and merchant settlement",
      companyStatus: "active",
      stage: "Series D",
      financials: [
        {
          id: "fin-flw-1",
          label: "Total funding raised",
          value: "600,000,000",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-1",
          asOf: daysAgo(26),
        },
        {
          id: "fin-flw-2",
          label: "Valuation",
          value: "3,000,000,000",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-1",
          asOf: daysAgo(26),
        },
        {
          id: "fin-flw-3",
          label: "Employees",
          value: "1,000+",
          currency: null,
          disclosure: "estimated",
          sourceId: "src-10",
          asOf: daysAgo(30),
        },
        {
          id: "fin-flw-4",
          label: "Latest round",
          value: "Series D extension — $100m",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-1",
          asOf: daysAgo(26),
        },
      ],
      fundingRounds: [
        round("fr-flw-1", "series_c_plus", 250_000_000, "USD", daysAgo(1500), "Tiger Global", ["Avenir Growth", "Durable Capital"], ["src-3"]),
        round("fr-flw-2", "series_c_plus", 170_000_000, "USD", daysAgo(1200), "B Capital", ["Alta Park Capital"], ["src-3"]),
        round("fr-flw-3", "series_c_plus", 100_000_000, "USD", daysAgo(26), "Avenir Growth Capital", ["Durable Capital Partners"], ["src-1"], "Series D extension."),
      ],
      products: ["Checkout", "Payment links", "Payouts API", "Flutterwave Store", "Send by Flutterwave"],
      market:
        "Cross-border payments for African merchants and global diaspora remittances, competing with incumbent banks and local PSPs.",
      traction: ["Licensed in 10 African markets", "30+ country coverage", "Enterprise merchants across retail and travel"],
      leadershipIds: ["person-olugbenga-agboola", "person-lara-tella"],
      competitors: ["Paystack", "M-Pesa ecosystem partners", "Stripe Africa partners"],
      technology: ["REST API", "Card tokenisation", "Real-time settlement ledger", "Fraud scoring"],
      risks: [
        "Currency volatility across operating markets",
        "Regulatory fragmentation between jurisdictions",
        "Enterprise concentration risk",
      ],
      developments: [
        {
          id: "dev-flw-1",
          kind: "funding",
          title: "Series D extension closed at $3bn valuation",
          summary: "Existing investors extended the Series D to fund cross-border expansion.",
          date: daysAgo(26),
          sourceIds: ["src-1"],
        },
        {
          id: "dev-flw-2",
          kind: "expansion",
          title: "Acquisition of a Kenyan payments provider",
          summary: "Move adds local acquiring capability and a Nairobi engineering hub.",
          date: daysAgo(9),
          sourceIds: ["src-4"],
        },
        {
          id: "dev-flw-3",
          kind: "partnership",
          title: "Partnered with a regional airline for travel payments",
          summary: "Direct card acquiring for airline ticket inventory.",
          date: daysAgo(60),
          sourceIds: ["src-4"],
        },
      ],
      sourceIds: ["src-1", "src-3", "src-4", "src-10"],
      articleIds: ["art-3"],
      tags: ["fintech", "payments", "Nigeria"],
      seo: {
        slug: "flutterwave",
        metaTitle: "Flutterwave — funding, leadership and coverage | NexTake",
        metaDescription:
          "NexTake intelligence dossier on Flutterwave: funding history, valuation, leadership, products and coverage.",
        ogImageUrl: "",
      },
    },
    {
      ...base("startup-paystack", daysAgo(88), daysAgo(17)),
      name: "Paystack",
      slug: "paystack",
      logoUrl:
        "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=200&h=200&fit=crop",
      description:
        "Payments platform for African businesses, acquired by Stripe, now expanding from Nigeria into East Africa.",
      industry: "Fintech",
      foundedYear: "2015",
      headquarters: "Lagos",
      country: "Nigeria",
      website: "https://paystack.com",
      markets: ["Nigeria", "Ghana", "Kenya"],
      businessModel: "Per-transaction fee on online and in-person payments",
      companyStatus: "acquired",
      stage: "Acquired (Stripe)",
      financials: [
        {
          id: "fin-psy-1",
          label: "Acquisition value",
          value: "200,000,000",
          currency: "USD",
          disclosure: "disclosed",
          sourceId: "src-3",
          asOf: daysAgo(1000),
        },
        {
          id: "fin-psy-2",
          label: "Employees",
          value: "300+",
          currency: null,
          disclosure: "estimated",
          sourceId: "src-10",
          asOf: daysAgo(40),
        },
        {
          id: "fin-psy-3",
          label: "Revenue",
          value: "Not disclosed",
          currency: null,
          disclosure: "undisclosed",
          sourceId: null,
          asOf: null,
        },
      ],
      fundingRounds: [
        round("fr-psy-1", "series_a", 10_000_000, "USD", daysAgo(2200), "Tencent", ["Spark Capital", "Visa"], ["src-3"]),
        round("fr-psy-2", "acquisition", 200_000_000, "USD", daysAgo(1000), "Stripe", [], ["src-3"], "Full acquisition."),
      ],
      products: ["Paystack API", "Terminal", "Paystack Commerce", "Transfers"],
      market:
        "SME and enterprise payment acceptance in Nigeria with a growing East African footprint.",
      traction: ["Kenyan PSP licence granted", "Pan-African merchant base", "Stripe global support"],
      leadershipIds: ["person-shola-akinyemi"],
      competitors: ["Flutterwave", "Moniepoint", "Interswitch"],
      technology: ["REST API", "Point-of-sale hardware", "Bank settlement rails"],
      risks: ["Concentration in the Nigerian market", "FX repatriation constraints"],
      developments: [
        {
          id: "dev-psy-1",
          kind: "expansion",
          title: "Kenyan payment service provider licence granted",
          summary: "Enables local acquiring and settlement in Kenya.",
          date: daysAgo(17),
          sourceIds: ["src-2", "src-5"],
        },
      ],
      sourceIds: ["src-2", "src-3", "src-5"],
      articleIds: [],
      tags: ["fintech", "payments", "Nigeria", "Kenya"],
      seo: {
        slug: "paystack",
        metaTitle: "Paystack — dossier | NexTake",
        metaDescription: "Funding, licensing and market expansion record for Paystack.",
        ogImageUrl: "",
      },
    },
    {
      ...base("startup-m-kopa", daysAgo(80), daysAgo(4)),
      name: "M-KOPA",
      slug: "m-kopa",
      logoUrl:
        "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=200&h=200&fit=crop",
      description:
        "Pay-as-you-go solar and smartphone financing platform serving unbanked households across East and West Africa.",
      industry: "Climate",
      foundedYear: "2011",
      headquarters: "Nairobi",
      country: "Kenya",
      website: "https://m-kopa.com",
      markets: ["Kenya", "Uganda", "Nigeria", "Ghana", "Tanzania"],
      businessModel: "Consumer asset financing repaid via mobile money micro-instalments",
      companyStatus: "active",
      stage: "Series C+",
      financials: [
        {
          id: "fin-mkp-1",
          label: "Total funding raised",
          value: "600,000,000",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-6",
          asOf: daysAgo(120),
        },
        {
          id: "fin-mkp-2",
          label: "Customers financed",
          value: "5,000,000+",
          currency: null,
          disclosure: "reported",
          sourceId: "src-6",
          asOf: daysAgo(60),
        },
      ],
      fundingRounds: [
        round("fr-mkp-1", "debt", 250_000_000, "USD", daysAgo(120), "Standard Bank", ["British International Investment", "FMO"], ["src-6"]),
      ],
      products: ["Solar home systems", "Smartphone financing", "Health insurance bundle"],
      market: "Off-grid energy and device financing for low-income households.",
      traction: ["5m+ customers financed", "Pan-African mobile money collection network"],
      leadershipIds: ["person-jesse-moore", "person-adaeze-okoye"],
      competitors: ["Sun King", "d.light", "Zola Electric"],
      technology: ["IoT telemetry", "Machine-learning credit scoring", "Mobile money rails"],
      risks: ["Currency depreciation affecting repayment value", "Repossession costs in rural areas"],
      developments: [
        {
          id: "dev-mkp-1",
          kind: "product",
          title: "Launched smartphone upgrade programme",
          summary: "Existing customers can trade up devices on the same credit rail.",
          date: daysAgo(45),
          sourceIds: ["src-6"],
        },
      ],
      sourceIds: ["src-6", "src-9"],
      articleIds: [],
      tags: ["climate tech", "Kenya", "Nigeria"],
      seo: {
        slug: "m-kopa",
        metaTitle: "M-KOPA — dossier | NexTake",
        metaDescription: "Solar financing, funding history and coverage for M-KOPA.",
        ogImageUrl: "",
      },
    },
    {
      ...base("startup-sun-king", daysAgo(76), daysAgo(3)),
      name: "Sun King",
      slug: "sun-king",
      logoUrl:
        "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=200&h=200&fit=crop",
      description:
        "Solar energy provider financing pay-as-you-go solar home systems for off-grid households across Africa and Asia.",
      industry: "Climate",
      foundedYear: "2007",
      headquarters: "Nairobi / Amsterdam",
      country: "Kenya",
      website: "https://sun-king.com",
      markets: ["Kenya", "Tanzania", "Uganda", "Nigeria", "Ethiopia"],
      businessModel: "Pay-as-you-go consumer financing on solar products",
      companyStatus: "active",
      stage: "Series D",
      financials: [
        {
          id: "fin-sun-1",
          label: "Total funding raised",
          value: "1,000,000,000",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-9",
          asOf: daysAgo(200),
        },
        {
          id: "fin-sun-2",
          label: "Latest round",
          value: "Series D — $260m",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-9",
          asOf: daysAgo(200),
        },
      ],
      fundingRounds: [
        round("fr-sun-1", "series_c_plus", 260_000_000, "USD", daysAgo(200), "M&G Investments", ["British International Investment", "Lightrock"], ["src-9"]),
      ],
      products: ["Home solar kits", "Solar lanterns", "Appliance bundles"],
      market: "Off-grid household electrification.",
      traction: ["Millions of households served", "Distribution network across 10+ countries"],
      leadershipIds: ["person-adaeze-okoye"],
      competitors: ["M-KOPA", "d.light"],
      technology: ["Pay-as-you-go metering", "Agent mobile app"],
      risks: ["Country-level foreign exchange exposure", "Sensitivity to subsidy policy changes"],
      developments: [
        {
          id: "dev-sun-1",
          kind: "leadership",
          title: "New West Africa chief executive appointed",
          summary: "Reported via social channels — awaiting corporate confirmation.",
          date: daysAgo(3),
          sourceIds: ["src-8"],
        },
      ],
      sourceIds: ["src-8", "src-9"],
      articleIds: [],
      tags: ["climate tech", "Kenya"],
      seo: {
        slug: "sun-king",
        metaTitle: "Sun King — dossier | NexTake",
        metaDescription: "Solar financing intelligence record for Sun King.",
        ogImageUrl: "",
      },
    },
    {
      ...base("startup-mpharma", daysAgo(70), daysAgo(6)),
      name: "mPharma",
      slug: "mpharma",
      logoUrl:
        "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop",
      description:
        "Health technology company operating pharmacy retail networks and managing medicines supply across Africa.",
      industry: "Healthtech",
      foundedYear: "2013",
      headquarters: "Accra",
      country: "Ghana",
      website: "https://mpharma.com",
      markets: ["Ghana", "Nigeria", "Kenya", "Zambia", "Uganda"],
      businessModel: "B2B pharmacy supply chain plus retail franchise network",
      companyStatus: "active",
      stage: "Series C",
      financials: [
        {
          id: "fin-mph-1",
          label: "Total funding raised",
          value: "110,000,000",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-3",
          asOf: daysAgo(300),
        },
        {
          id: "fin-mph-2",
          label: "Pharmacies served",
          value: "1,000+",
          currency: null,
          disclosure: "estimated",
          sourceId: "src-10",
          asOf: daysAgo(20),
        },
      ],
      fundingRounds: [
        round("fr-mph-1", "series_c_plus", 17_000_000, "USD", daysAgo(300), "CDC Group", ["Novastar Ventures", "Kaiser Permanente"], ["src-3"]),
      ],
      products: ["Mutti pharmacy franchise", "HealthPlus retail", "Pharmacy delivery app"],
      market: "Medicine access and pharmacy retail modernisation.",
      traction: ["Multi-country pharmacy network", "Insurance-backed medicine access programmes"],
      leadershipIds: ["person-gregory-rock"],
      competitors: ["HealthPlus", "Local pharmacy chains"],
      technology: ["Inventory management platform", "Cold-chain logistics tracking"],
      risks: ["Regulatory approval timelines per market", "Consumer price sensitivity"],
      developments: [
        {
          id: "dev-mph-1",
          kind: "partnership",
          title: "Insurer partnership for chronic medication access",
          summary: "Patients on the scheme collect subsidised chronic medication at Mutti pharmacies.",
          date: daysAgo(55),
          sourceIds: ["src-3"],
        },
      ],
      sourceIds: ["src-3", "src-10"],
      articleIds: [],
      tags: ["venture capital", "Ghana"],
      seo: {
        slug: "mpharma",
        metaTitle: "mPharma — dossier | NexTake",
        metaDescription: "Funding, footprint and coverage for mPharma.",
        ogImageUrl: "",
      },
    },
    {
      ...base("startup-andela", daysAgo(64), daysAgo(20)),
      name: "Andela",
      slug: "andela",
      logoUrl:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=200&h=200&fit=crop",
      description:
        "Global talent network that places African and Latin American senior engineers with remote-first technology companies.",
      industry: "SaaS",
      foundedYear: "2014",
      headquarters: "New York / Lagos",
      country: "Nigeria",
      website: "https://andela.com",
      markets: ["Nigeria", "Kenya", "Egypt", "Global"],
      businessModel: "Talent marketplace margin on placed engineers",
      companyStatus: "active",
      stage: "Series E",
      financials: [
        {
          id: "fin-and-1",
          label: "Total funding raised",
          value: "381,000,000",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-3",
          asOf: daysAgo(700),
        },
        {
          id: "fin-and-2",
          label: "Valuation",
          value: "Not disclosed",
          currency: null,
          disclosure: "undisclosed",
          sourceId: null,
          asOf: null,
        },
      ],
      fundingRounds: [
        round("fr-and-1", "series_c_plus", 200_000_000, "USD", daysAgo(1400), "SoftBank Vision Fund 2", ["Chan Zuckerberg Initiative", "Generation Investment Management"], ["src-3"]),
      ],
      products: ["Talent placement", "Engineering teams", "AI-assisted matching"],
      market: "Global remote engineering talent supply.",
      traction: ["Thousands of engineers placed", "Enterprise client roster"],
      leadershipIds: ["person-jeremy-johnson"],
      competitors: ["Toptal", "Global talent marketplaces"],
      technology: ["Matching engine", "Assessment platform"],
      risks: ["Wage inflation in source markets", "Client concentration in North America"],
      developments: [],
      sourceIds: ["src-3"],
      articleIds: [],
      tags: ["venture capital", "Nigeria"],
      seo: {
        slug: "andela",
        metaTitle: "Andela — dossier | NexTake",
        metaDescription: "Talent market intelligence for Andela.",
        ogImageUrl: "",
      },
    },
    {
      ...base("startup-sendy", daysAgo(52), daysAgo(11)),
      name: "Sendy",
      slug: "sendy",
      logoUrl:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&h=200&fit=crop",
      description:
        "Logistics technology platform connecting shippers with vetted transporters for first- and last-mile delivery in East Africa.",
      industry: "Logistics",
      foundedYear: "2015",
      headquarters: "Nairobi",
      country: "Kenya",
      website: "https://sendy.co.ke",
      markets: ["Kenya", "Uganda", "Tanzania"],
      businessModel: "Freight marketplace commission and fulfilment services",
      companyStatus: "shut_down",
      stage: "Series B",
      financials: [
        {
          id: "fin-sen-1",
          label: "Total funding raised",
          value: "26,500,000",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-3",
          asOf: daysAgo(800),
        },
        {
          id: "fin-sen-2",
          label: "Status note",
          value: "Operations wound down",
          currency: null,
          disclosure: "reported",
          sourceId: "src-7",
          asOf: daysAgo(30),
        },
      ],
      fundingRounds: [
        round("fr-sen-1", "series_b", 20_000_000, "USD", daysAgo(1600), "Atlantica Ventures", ["Toyota Tsusho", "AAICA"], ["src-3"]),
      ],
      products: ["Freight marketplace", "Fulfilment as a service"],
      market: "B2B freight and last-mile delivery in East Africa.",
      traction: ["Wind-down reported", "Assets and rider network absorbed by competitors"],
      leadershipIds: [],
      competitors: ["Lori Systems", "Third-party logistics operators"],
      technology: ["Dispatch optimisation", "Driver app"],
      risks: ["Unit economics in B2B freight", "Capital intensity of fleet operations"],
      developments: [
        {
          id: "dev-sen-1",
          kind: "other",
          title: "Operations wound down",
          summary: "Reported closure after failing to close a follow-on round.",
          date: daysAgo(30),
          sourceIds: ["src-7"],
        },
      ],
      sourceIds: ["src-3", "src-7"],
      articleIds: [],
      tags: ["Kenya", "venture capital"],
      seo: {
        slug: "sendy",
        metaTitle: "Sendy — dossier | NexTake",
        metaDescription: "Wind-down record and funding history for Sendy.",
        ogImageUrl: "",
      },
    },
    {
      ...base("startup-uci", daysAgo(44), daysAgo(8)),
      name: "UCI Digital",
      slug: "uci-digital",
      logoUrl:
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&h=200&fit=crop",
      description:
        "Cybersecurity services provider offering managed detection and response for financial institutions in West Africa.",
      industry: "Cybersecurity",
      foundedYear: "2020",
      headquarters: "Lagos",
      country: "Nigeria",
      website: "https://ucidigital.example",
      markets: ["Nigeria", "Ghana"],
      businessModel: "Annual managed-security retainers",
      companyStatus: "active",
      stage: "Seed",
      financials: [
        {
          id: "fin-uci-1",
          label: "Total funding raised",
          value: "3,200,000",
          currency: "USD",
          disclosure: "reported",
          sourceId: "src-10",
          asOf: daysAgo(90),
        },
      ],
      fundingRounds: [
        round("fr-uci-1", "seed", 3_200_000, "USD", daysAgo(90), "Ventures Platform", ["Microtraction"], ["src-10"]),
      ],
      products: ["Managed detection & response", "Penetration testing", "Compliance advisory"],
      market: "Regulated financial services security operations.",
      traction: ["Retained by tier-1 Nigerian banks", "SOC built in Lagos"],
      leadershipIds: ["person-tunde-adebayo"],
      competitors: ["Global MSSPs", "Regional IT consultancies"],
      technology: ["SIEM", "Threat intelligence feeds", "Zero-trust rollout"],
      risks: ["Talent scarcity for security engineers", "Concentration among a few large clients"],
      developments: [],
      sourceIds: ["src-10"],
      articleIds: [],
      tags: ["venture capital", "Nigeria"],
      seo: {
        slug: "uci-digital",
        metaTitle: "UCI Digital — dossier | NexTake",
        metaDescription: "Cybersecurity intelligence record for UCI Digital.",
        ogImageUrl: "",
      },
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*                                   PEOPLE                                   */
/* -------------------------------------------------------------------------- */

export function seedPeople(): Person[] {
  const people: Array<Partial<Person> & { id: string; name: string }> = [
    {
      id: "person-olugbenga-agboola",
      name: "Olugbenga Agboola",
      role: "Co-founder & CEO",
      organization: "Flutterwave",
      startupIds: ["startup-flutterwave"],
      location: "Lagos, Nigeria",
      biography:
        "Co-founded Flutterwave in 2016 after leading product and engineering roles at PayPal and Paystack's early infrastructure era.",
      currentRole: "Chief Executive Officer, Flutterwave",
      links: { linkedin: "https://linkedin.com/in/olugbenga-agboola", x: "https://x.com/techbroiler", website: "" },
    },
    {
      id: "person-lara-tella",
      name: "Lara Tella",
      role: "Chief Financial Officer",
      organization: "Flutterwave",
      startupIds: ["startup-flutterwave"],
      location: "Lagos, Nigeria",
      biography:
        "Finance leader who has run treasury and investor relations for African payments businesses since 2014.",
      currentRole: "CFO, Flutterwave",
      links: { linkedin: "https://linkedin.com/in/lara-tella", x: "", website: "" },
    },
    {
      id: "person-shola-akinyemi",
      name: "Shola Akinyemi",
      role: "Co-founder & CEO",
      organization: "Paystack",
      startupIds: ["startup-paystack"],
      location: "Lagos, Nigeria",
      biography:
        "Founded Paystack in 2015; previously founded Kudimoney and worked at PayPal as a risk engineer.",
      currentRole: "CEO, Paystack",
      links: { linkedin: "https://linkedin.com/in/sholla", x: "https://x.com/sholla", website: "" },
    },
    {
      id: "person-jesse-moore",
      name: "Jesse Moore",
      role: "Co-founder & CEO",
      organization: "M-KOPA",
      startupIds: ["startup-m-kopa"],
      location: "Nairobi, Kenya",
      biography:
        "Co-founded M-KOPA in 2011 to finance solar power for off-grid households, later extending the model to smartphones.",
      currentRole: "CEO, M-KOPA",
      links: { linkedin: "https://linkedin.com/in/jesse-moore", x: "", website: "" },
    },
    {
      id: "person-adaeze-okoye",
      name: "Adaeze Okoye",
      role: "Managing Director, West Africa",
      organization: "Sun King",
      startupIds: ["startup-sun-king", "startup-m-kopa"],
      location: "Lagos, Nigeria",
      biography:
        "Energy access executive who has scaled pay-as-you-go distribution networks across West Africa.",
      currentRole: "MD West Africa, Sun King",
      links: { linkedin: "https://linkedin.com/in/adaeze-okoye", x: "", website: "" },
    },
    {
      id: "person-gregory-rock",
      name: "Gregory Rock",
      role: "Co-founder & CEO",
      organization: "mPharma",
      startupIds: ["startup-mpharma"],
      location: "Accra, Ghana",
      biography:
        "Founded mPharma to modernise medicine supply chains; previously worked in healthcare investment banking.",
      currentRole: "CEO, mPharma",
      links: { linkedin: "https://linkedin.com/in/gregory-rock", x: "", website: "" },
    },
    {
      id: "person-jeremy-johnson",
      name: "Jeremy Johnson",
      role: "Co-founder & CEO",
      organization: "Andela",
      startupIds: ["startup-andela"],
      location: "New York, USA",
      biography:
        "Co-founded Andela in 2014 to build distributed engineering teams across Africa.",
      currentRole: "CEO, Andela",
      links: { linkedin: "https://linkedin.com/in/jeremy-johnson", x: "", website: "" },
    },
    {
      id: "person-tunde-adebayo",
      name: "Tunde Adebayo",
      role: "Founder & CEO",
      organization: "UCI Digital",
      startupIds: ["startup-uci-digital"],
      location: "Lagos, Nigeria",
      biography:
        "Former bank security architect who founded UCI Digital to bring managed detection to West African financial institutions.",
      currentRole: "CEO, UCI Digital",
      links: { linkedin: "https://linkedin.com/in/tunde-adebayo", x: "", website: "" },
    },
    {
      id: "person-njeri-mwangi",
      name: "Njeri Mwangi",
      role: "Business Editor",
      organization: "Business Daily Africa",
      startupIds: [],
      location: "Nairobi, Kenya",
      biography:
        "Business journalist covering payments, banking and startup financing in East Africa.",
      currentRole: "Business Editor",
      links: { linkedin: "", x: "https://x.com/njerimwangi", website: "" },
    },
    {
      id: "person-tage-kene",
      name: "Tage Kene-Okafor",
      role: "Senior Reporter",
      organization: "TechCrunch",
      startupIds: [],
      location: "Lagos, Nigeria",
      biography: "Reporter covering African startups, venture capital and fintech.",
      currentRole: "Senior Reporter, TechCrunch",
      links: { linkedin: "", x: "https://x.com/tagekene", website: "" },
    },
  ];

  return people.map((person, index) => ({
    ...base(person.id, daysAgo(60 - index)),
    name: person.name,
    role: person.role ?? "",
    organization: person.organization ?? "",
    startupIds: person.startupIds ?? [],
    location: person.location ?? "",
    biography: person.biography ?? "",
    currentRole: person.currentRole ?? person.role ?? "",
    photoUrl: "",
    links: person.links ?? { linkedin: "", x: "", website: "" },
    articleIds: [],
    interviewIds: [],
  }));
}

/* -------------------------------------------------------------------------- */
/*                                  COMPANIES                                 */
/* -------------------------------------------------------------------------- */

export function seedCompanies(): Company[] {
  const rows: Array<[string, string, string, string, string[]]> = [
    ["Stripe", "Payments", "Global payments infrastructure company; acquired Paystack in 2020.", "https://stripe.com", ["startup-paystack"]],
    ["Tiger Global", "Venture capital", "Crossover investor active across African growth-stage technology.", "https://tigerglobal.com", ["startup-flutterwave"]],
    ["Avenir Growth Capital", "Venture capital", "Growth investor leading Flutterwave's Series D extension.", "https://avenirgrowth.com", ["startup-flutterwave"]],
    ["British International Investment", "Development finance", "DFI backing climate and financial inclusion platforms.", "https://bii.co.uk", ["startup-sun-king", "startup-m-kopa"]],
    ["Standard Bank", "Banking", "Provided debt facilities to African consumer-finance platforms.", "https://standardbank.com", ["startup-m-kopa"]],
    ["Ventures Platform", "Venture capital", "Early-stage fund supporting Nigerian founders.", "https://venturesplatform.com", ["startup-uci-digital"]],
    ["Novastar Ventures", "Venture capital", "Impact investor in African health and commerce businesses.", "https://novastarventures.com", ["startup-mpharma"]],
    ["Toyota Tsusho", "Logistics", "Trading house that invested in East African logistics platforms.", "https://toyota-tsusho.com", ["startup-sendy"]],
  ];

  return rows.map(([name, sector, description, websiteUrl, relatedStartupIds], index) => ({
    ...base(`company-${taxonomySlug(name)}`, daysAgo(100 - index)),
    name,
    sector,
    description,
    websiteUrl,
    country: sector === "Banking" ? "South Africa" : "Global",
    relatedStartupIds,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                   EVENTS                                   */
/* -------------------------------------------------------------------------- */

export function seedEvents(): NexTakeEvent[] {
  const rows: Array<[string, NexTakeEvent["kind"], number, number, string, string, string]> = [
    ["GITEX Africa 2026", "conference", 5, 8, "Marrakech, Morocco", "https://gitexafrica.com", "Kaoun International"],
    ["Africa Fintech Summit Nairobi", "summit", 18, 20, "Nairobi, Kenya", "https://africafintechsummit.com", "Africa Fintech Summit"],
    ["NexTake Startup Spotlight — Lagos", "meetup", 24, 24, "Lagos, Nigeria", "https://nextake.africa/events/lagos", "NexTake"],
    ["M-KOPA Pay-As-You-Go Launch Briefing", "launch", 2, 2, "Nairobi, Kenya", "https://m-kopa.com", "M-KOPA"],
    ["West Africa Cyber Defence Forum", "conference", 40, 42, "Abuja, Nigeria", "https://wacdf.example", "UCI Digital"],
    ["African Startup Awards", "award", 60, 60, "Cape Town, South Africa", "https://africanstartupawards.example", "Africa Startup Collective"],
  ];

  return rows.map(([name, kind, startOffset, endOffset, location, url, organizer], index) => ({
    ...base(`event-${taxonomySlug(name)}`, daysAgo(30 - index)),
    name,
    kind,
    startDate: inDays(startOffset, 9),
    endDate: inDays(endOffset, 17),
    location,
    url,
    description: `${name} — tracked on the NexTake events calendar.`,
    organizer,
    startupIds: [],
    personIds: [],
    articleIds: [],
  }));
}

/* -------------------------------------------------------------------------- */
/*                                   MEDIA                                    */
/* -------------------------------------------------------------------------- */

export function seedMedia(): MediaAsset[] {
  const rows: Array<[string, string, string, string, number, number]> = [
    ["flutterwave-lagos-office.jpg", "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop", "Open-plan office of a Lagos payments company", "Flutterwave press kit", 1200, 800],
    ["paystack-terminal.jpg", "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=800&fit=crop", "Card payment terminal on a checkout counter", "NexTake / Paystack", 1200, 800],
    ["nairobi-skyline.jpg", "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&h=800&fit=crop", "Nairobi central business district skyline", "NexTake photo desk", 1200, 800],
    ["solar-home-installation.jpg", "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=800&fit=crop", "Solar panels on a rural household roof", "M-KOPA media library", 1200, 800],
    ["fintech-conference-panel.jpg", "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop", "Panellists speaking at a fintech conference", "GITEX Africa", 1200, 800],
    ["pharmacy-cold-chain.jpg", "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&h=800&fit=crop", "Pharmacy cold-chain storage unit", "mPharma", 1200, 800],
    ["security-operations-centre.jpg", "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=800&fit=crop", "Analysts monitoring dashboards in a security operations centre", "NexTake photo desk", 1200, 800],
    ["engineers-remote-standup.jpg", "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&h=800&fit=crop", "Distributed engineering team in a stand-up meeting", "NexTake photo desk", 1200, 800],
    ["nex-take-hero-placeholder.jpg", "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1600&h=900&fit=crop", "Editorial desk with laptops and notebooks", "NexTake", 1600, 900],
    ["africa-data-chart.png", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop", "Analyst reviewing a funding chart", "NexTake data desk", 1200, 800],
  ];

  return rows.map(([filename, url, alt, credit, width, height], index) => ({
    ...base(`media-${index + 1}`, daysAgo(70 - index * 4)),
    filename,
    url,
    alt,
    caption: "",
    credit,
    kind: "image",
    mimeType: filename.endsWith(".png") ? "image/png" : "image/jpeg",
    width,
    height,
    sizeBytes: 240_000 + index * 31_500,
    uploadedBy: "nextake-admin@nextake.africa",
    folder: "editorial",
  }));
}

/* -------------------------------------------------------------------------- */
/*                               SUBSCRIBERS                                  */
/* -------------------------------------------------------------------------- */

export function seedSubscribers(): NewsletterSubscriber[] {
  const emails = [
    "ops@nextake.africa",
    "editor@nextake.africa",
    "research@nextake.africa",
    "adeola.ogun@example.com",
    "brian.kimani@example.com",
    "chiamaka.eze@example.com",
    "daniel.mwangi@example.com",
    "esther.adeyemi@example.com",
    "fatima.bello@example.com",
    "grace.njoroge@example.com",
    "hassan.mohamed@example.com",
    "ifeoma.nwosu@example.com",
    "joseph.otieno@example.com",
    "kemi.adebayo@example.com",
    "lucas.mensah@example.com",
    "maryam.issa@example.com",
    "nnamdi.okafor@example.com",
    "ophelia.boateng@example.com",
    "peter.achola@example.com",
    "queeneth.ndlovu@example.com",
    "ruth.abebe@example.com",
    "samuel.diallo@example.com",
    "thandi.mokoena@example.com",
    "uche.nwachukwu@example.com",
  ];

  const frequencies: NewsletterSubscriber["frequency"][] = ["daily", "all", "weekend"];

  return emails.map((email, index) => ({
    ...base(`sub-${index + 1}`, daysAgo(120 - index * 4)),
    email,
    frequency: frequencies[index % frequencies.length],
    status: index % 17 === 16 ? "unsubscribed" : "subscribed",
    source: index % 3 === 0 ? "website" : index % 3 === 1 ? "referral" : "social",
    subscribedAt: daysAgo(120 - index * 4),
  }));
}

/* -------------------------------------------------------------------------- */
/*                                CAMPAIGNS                                   */
/* -------------------------------------------------------------------------- */

export function seedCampaigns(): NewsletterCampaign[] {
  return [
    {
      ...base("campaign-1", daysAgo(21)),
      name: "The Daily Edit — fintech funding special",
      subject: "Africa's fintech funding reset, explained",
      previewText: "What the $1.4bn H1 number actually signals.",
      template: "daily-edit",
      status: "sent",
      audience: "daily",
      articleIds: ["art-3"],
      content:
        "This week: the fintech funding reset, Flutterwave's $3bn mark, and why Nairobi is the new hiring pool.",
      scheduledFor: daysAgo(21),
      sentAt: daysAgo(21, 7),
      recipients: 24,
      stats: { delivered: 24, opens: 17, clicks: 6, unsubscribes: 1 },
    },
    {
      ...base("campaign-2", daysAgo(6)),
      name: "Startup Spotlight — M-KOPA",
      subject: "Inside M-KOPA's pay-as-you-go solar playbook",
      previewText: "The interview every energy-access operator should read.",
      template: "spotlight",
      status: "sent",
      audience: "all",
      articleIds: [],
      content: "A deep dive into consumer asset financing for off-grid households.",
      scheduledFor: daysAgo(6),
      sentAt: daysAgo(6, 8),
      recipients: 24,
      stats: { delivered: 24, opens: 14, clicks: 5, unsubscribes: 0 },
    },
    {
      ...base("campaign-3", daysAgo(1)),
      name: "Weekly Wrap — deals and dossiers",
      subject: "The NexTake weekly wrap: 3 dossiers, 2 deals",
      previewText: "Your Thursday intelligence digest.",
      template: "weekly-wrap",
      status: "scheduled",
      audience: "weekly",
      articleIds: ["art-3"],
      content: "Draft body awaiting editor review before the Thursday 07:00 send.",
      scheduledFor: inDays(2, 7),
      sentAt: null,
      recipients: 0,
      stats: null,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*                                SUGGESTIONS                                 */
/* -------------------------------------------------------------------------- */

export function seedSuggestions(): RelationshipSuggestion[] {
  return [
    {
      ...base("sugg-1", daysAgo(2)),
      hostType: "article",
      hostId: "art-3",
      hostLabel: "Building your modern API Stack with OpenAPI & Edge Workers",
      targetType: "startup",
      targetId: "startup-flutterwave",
      targetLabel: "Flutterwave",
      confidence: 0.82,
      reason: "“Flutterwave” appears in the body copy and the story is tagged payments.",
      detectedEntities: ["Flutterwave", "Nigeria", "Fintech", "Payments"],
      status: "pending",
      decidedAt: null,
      decidedBy: "",
    },
    {
      ...base("sugg-2", daysAgo(2)),
      hostType: "article",
      hostId: "art-3",
      hostLabel: "Building your modern API Stack with OpenAPI & Edge Workers",
      targetType: "startup",
      targetId: "startup-paystack",
      targetLabel: "Paystack",
      confidence: 0.71,
      reason: "Same industry and market as the story's detected entities.",
      detectedEntities: ["Fintech", "Nigeria"],
      status: "pending",
      decidedAt: null,
      decidedBy: "",
    },
    {
      ...base("sugg-3", daysAgo(2)),
      hostType: "article",
      hostId: "art-3",
      hostLabel: "Building your modern API Stack with OpenAPI & Edge Workers",
      targetType: "person",
      targetId: "person-olugbenga-agboola",
      targetLabel: "Olugbenga Agboola",
      confidence: 0.58,
      reason: "Leadership of a detected startup.",
      detectedEntities: ["Flutterwave"],
      status: "pending",
      decidedAt: null,
      decidedBy: "",
    },
    {
      ...base("sugg-4", daysAgo(4)),
      hostType: "startup",
      hostId: "startup-sun-king",
      hostLabel: "Sun King",
      targetType: "article",
      targetId: "art-3",
      targetLabel: "West Africa's solar financing race",
      confidence: 0.64,
      reason: "Story mentions Sun King alongside M-KOPA distribution numbers.",
      detectedEntities: ["Sun King", "M-KOPA", "Climate"],
      status: "accepted",
      decidedAt: daysAgo(3),
      decidedBy: "nextake-admin@nextake.africa",
    },
    {
      ...base("sugg-5", daysAgo(9)),
      hostType: "startup",
      hostId: "startup-sendy",
      hostLabel: "Sendy",
      targetType: "article",
      targetId: "art-4",
      targetLabel: "Why East African freight startups stalled",
      confidence: 0.69,
      reason: "Sendy is named in the wind-down analysis.",
      detectedEntities: ["Sendy", "Kenya", "Logistics"],
      status: "rejected",
      decidedAt: daysAgo(8),
      decidedBy: "nextake-admin@nextake.africa",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*                                ENGAGEMENT                                  */
/* -------------------------------------------------------------------------- */

/**
 * Engagement samples are explicitly marked as captured from a sample workspace:
 * the analytics screen labels them rather than presenting them as live traffic.
 */
export function seedEngagement(articleIds: string[]): EngagementEvent[] {
  if (articleIds.length === 0) return [];

  const sources: EngagementEvent["trafficSource"][] = [
    "direct",
    "search",
    "social",
    "referral",
  ];

  const events: EngagementEvent[] = [];
  let index = 0;

  for (let day = 0; day < 30; day += 1) {
    for (let slot = 0; slot < 3; slot += 1) {
      const articleId = articleIds[(day + slot) % articleIds.length];
      const kind: EngagementEvent["kind"] =
        slot === 2 ? (day % 4 === 0 ? "share" : "read") : "view";

      events.push({
        ...base(`eng-${index}`, daysAgo(day, 8 + (slot * 5) % 12)),
        at: daysAgo(day, 8 + (slot * 5) % 12),
        entityType: "article",
        entityId: articleId,
        kind,
        trafficSource: sources[(day + slot) % sources.length],
        path: `/articles/${articleId}`,
        context: "public",
        meta: { origin: "sample" },
      });
      index += 1;
    }
  }

  return events;
}

/* -------------------------------------------------------------------------- */
/*                                   USERS                                    */
/* -------------------------------------------------------------------------- */

export function seedUsers(): WorkspaceUser[] {
  const rows: Array<[string, string, WorkspaceUser["role"], WorkspaceUser["status"]]> = [
    ["nextake-admin@nextake.africa", "NexTake Admin", "admin", "active"],
    ["editor.inchief@nextake.africa", "Amara Nwosu", "editor_in_chief", "active"],
    ["managing.editor@nextake.africa", "Kofi Mensah", "managing_editor", "active"],
    ["editor@nextake.africa", "Zainab Yusuf", "editor", "active"],
    ["writer@nextake.africa", "Lerato Dube", "writer", "active"],
    ["researcher@nextake.africa", "Brian Kimani", "researcher", "active"],
    ["factcheck@nextake.africa", "Chioma Eze", "fact_checker", "active"],
    ["analyst@nextake.africa", "Mohamed Hassan", "analyst", "invited"],
  ];

  return rows.map(([email, fullName, role, status], index) => ({
    ...base(`user-${index + 1}`, daysAgo(150 - index * 10)),
    email,
    fullName,
    role,
    status,
    invitedAt: status === "invited" ? daysAgo(4) : daysAgo(150 - index * 10),
    lastActiveAt: status === "active" ? daysAgo(index) : null,
    avatarUrl: "",
    notes: "",
  }));
}

export function seedRoles(): StoredRoleDefinition[] {
  return ROLE_DEFINITIONS.map((role, index) => ({
    ...base(role.id, daysAgo(180 - index)),
    role: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                  BUNDLE                                    */
/* -------------------------------------------------------------------------- */

export interface SampleWorkspace {
  taxonomy: TaxonomyTerm[];
  industries: Industry[];
  sources: Source[];
  claims: Claim[];
  startups: Startup[];
  people: Person[];
  companies: Company[];
  events: NexTakeEvent[];
  media: MediaAsset[];
  subscribers: NewsletterSubscriber[];
  campaigns: NewsletterCampaign[];
  suggestions: RelationshipSuggestion[];
  users: WorkspaceUser[];
  roles: StoredRoleDefinition[];
}

export function buildSampleWorkspace(articleIds: string[]): SampleWorkspace {
  const startups = seedStartups();
  const sources = seedSources();
  const claims = seedClaims();

  /* Link claims onto their sources and articles onto their entities so the
     relationship graph is populated from the very first render. */
  const linkedSources = sources.map((source) => ({
    ...source,
    claimIds: claims
      .filter((claim) => claim.sourceIds.includes(source.id))
      .map((claim) => claim.id),
  }));

  const linkedStartups = startups.map((startup) => ({
    ...startup,
    articleIds: startup.articleIds.filter((id) => articleIds.includes(id)),
  }));

  return {
    taxonomy: seedTaxonomy(),
    industries: seedIndustries(),
    sources: linkedSources,
    claims,
    startups: linkedStartups,
    people: seedPeople(),
    companies: seedCompanies(),
    events: seedEvents(),
    media: seedMedia(),
    subscribers: seedSubscribers(),
    campaigns: seedCampaigns(),
    suggestions: seedSuggestions().filter(
      (suggestion) =>
        suggestion.hostType !== "article" || articleIds.includes(suggestion.hostId)
    ),
    users: seedUsers(),
    roles: seedRoles(),
  };
}
