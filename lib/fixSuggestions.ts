export type FixCategory = "performance" | "seo" | "accessibility" | "aeo" | "privacy" | "carbon";
export type FixPriority = "critical" | "high" | "medium" | "low";
export type FixEffort = "easy" | "medium" | "hard";

export interface FixSuggestion {
  id: string;
  title: string;
  category: FixCategory;
  priority: FixPriority;
  effort: FixEffort;
  impactScore: number;
  confidence: number;
  estimatedGain: {
    performance?: number;
    seo?: number;
    accessibility?: number;
    aeo?: number;
    privacy?: number;
    carbon?: number;
  };
  problem: string;
  recommendation: string;
  implementation?: string;
  source: "Lighthouse" | "AEO" | "Privacy" | "Carbon";
}

type Language = "it" | "en";

interface BuildFixSuggestionInput {
  result: AnalysisResult;
  aeoResult?: AEOAnalysisResult | null;
  privacyResult?: PrivacyAnalysisResult | null;
  language: Language;
}

export interface ResourceSummaryItem {
  resourceType?: string;
  transferSize?: number;
}

export interface LighthouseOpportunity {
  title?: string;
  description?: string;
  impact?: string;
  level?: "High" | "Medium" | "Low";
}

export interface AuditDetail {
  title?: string;
  score?: number | null;
}

export interface AnalysisResult {
  opportunities?: LighthouseOpportunity[];
  resourceSummary?: ResourceSummaryItem[];
  keyMetrics?: {
    tbt_v?: number;
  };
  scores?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  details?: {
    seo?: AuditDetail[];
    accessibility?: AuditDetail[];
  };
}

export interface AEOAnalysisResult {
  signals?: Partial<Record<
    "schema" | "headings" | "semantic" | "metaDesc" | "qa" | "chunks" | "definitions" | "answerFirst" | "author" | "datePublished" | "citations" | "llmsTxt" | "faqSchema",
    number
  >>;
}

export interface PrivacyAnalysisResult {
  error?: string;
  adCount?: number;
  analyticsCount?: number;
  thirdPartyDomains?: number;
  consentDetected?: boolean;
}

const effortScore: Record<FixEffort, number> = {
  easy: 100,
  medium: 68,
  hard: 38,
};

function priorityFromScore(score: number): FixPriority {
  if (score >= 86) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function rankSuggestion(fix: FixSuggestion) {
  return fix.impactScore * 0.58 + effortScore[fix.effort] * 0.24 + fix.confidence * 0.18;
}

function uniqueById(items: FixSuggestion[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function bytesFromResources(resources: ResourceSummaryItem[] = [], type: string) {
  return resources.find((r) => r.resourceType === type)?.transferSize || 0;
}

function buildPerformanceFixes(result: AnalysisResult, language: Language): FixSuggestion[] {
  const opportunities = result?.opportunities || [];
  const resources = result?.resourceSummary || [];
  const scripts = bytesFromResources(resources, "script");
  const images = bytesFromResources(resources, "image");
  const total = bytesFromResources(resources, "total");
  const tbt = result?.keyMetrics?.tbt_v || 0;
  const fixes: FixSuggestion[] = [];

  opportunities.slice(0, 4).forEach((opportunity, index) => {
    const isHigh = opportunity.level === "High";
    const impactScore = isHigh ? 88 - index * 4 : opportunity.level === "Medium" ? 66 - index * 3 : 44;
    fixes.push({
      id: `lh-${String(opportunity.title || index).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: opportunity.title || (language === "it" ? "Ottimizzazione performance" : "Performance optimization"),
      category: "performance",
      priority: priorityFromScore(impactScore),
      effort: isHigh ? "medium" : "easy",
      impactScore,
      confidence: 92,
      estimatedGain: { performance: isHigh ? 10 : 5, carbon: images > 700_000 ? 4 : undefined },
      problem: opportunity.description?.replace(/<[^>]*>/g, "") || (
        language === "it" ? "Lighthouse ha rilevato un'opportunita di ottimizzazione." : "Lighthouse detected an optimization opportunity."
      ),
      recommendation: language === "it"
        ? "Parti da questo intervento per ridurre tempi di caricamento e attrito percepito."
        : "Start here to reduce load time and perceived friction.",
      implementation: opportunity.impact
        ? (language === "it" ? `Risparmio stimato: ${opportunity.impact}` : `Estimated saving: ${opportunity.impact}`)
        : undefined,
      source: "Lighthouse",
    });
  });

  if (images > 900_000) {
    fixes.push({
      id: "compress-heavy-images",
      title: language === "it" ? "Comprimi e converti le immagini pesanti" : "Compress and convert heavy images",
      category: "performance",
      priority: "high",
      effort: "medium",
      impactScore: 78,
      confidence: 88,
      estimatedGain: { performance: 8, carbon: 10 },
      problem: language === "it"
        ? "Le immagini incidono molto sul peso trasferito della pagina."
        : "Images account for a large share of the transferred page weight.",
      recommendation: language === "it"
        ? "Converti immagini hero e gallery in WebP/AVIF, ridimensionale al viewport reale e applica lazy loading fuori dalla prima schermata."
        : "Convert hero and gallery images to WebP/AVIF, resize them to the real viewport, and lazy-load below-the-fold assets.",
      implementation: "Use responsive srcset/sizes, width/height attributes, and fetchpriority=\"high\" only on the LCP image.",
      source: "Lighthouse",
    });
  }

  if (scripts > 650_000 || tbt > 300) {
    fixes.push({
      id: "reduce-main-thread-js",
      title: language === "it" ? "Riduci JavaScript e lavoro sul main thread" : "Reduce JavaScript and main-thread work",
      category: "performance",
      priority: "high",
      effort: "hard",
      impactScore: 82,
      confidence: 84,
      estimatedGain: { performance: 12 },
      problem: language === "it"
        ? "Script pesanti o task lunghi possono bloccare input, scroll e rendering."
        : "Heavy scripts or long tasks can block input, scrolling, and rendering.",
      recommendation: language === "it"
        ? "Rimuovi librerie non essenziali, spezza bundle grandi, differisci script terzi e carica interazioni non critiche dopo il primo paint."
        : "Remove non-essential libraries, split large bundles, defer third-party scripts, and load non-critical interactions after first paint.",
      implementation: "Audit bundle chunks, use dynamic imports, defer/async third-party scripts, and hydrate only interactive islands.",
      source: "Lighthouse",
    });
  }

  if (total > 2_400_000) {
    fixes.push({
      id: "page-weight-budget",
      title: language === "it" ? "Imposta un budget peso pagina" : "Set a page weight budget",
      category: "carbon",
      priority: "medium",
      effort: "easy",
      impactScore: 62,
      confidence: 80,
      estimatedGain: { performance: 4, carbon: 8 },
      problem: language === "it"
        ? "Il peso complessivo rende la pagina piu lenta e aumenta l'impatto per visita."
        : "The overall page weight makes the page slower and increases impact per visit.",
      recommendation: language === "it"
        ? "Definisci un limite massimo per immagini, JS, CSS e font prima di aggiungere nuovi asset."
        : "Define maximum budgets for images, JS, CSS, and fonts before adding new assets.",
      implementation: "Target: < 1.5 MB transferred for content pages, < 250 KB JS initial payload where possible.",
      source: "Carbon",
    });
  }

  return fixes;
}

function buildAeoFixes(aeoResult: AEOAnalysisResult | null | undefined, language: Language): FixSuggestion[] {
  if (!aeoResult?.signals) return [];
  const s = aeoResult.signals;
  const fixes: FixSuggestion[] = [];

  if ((s.faqSchema || 0) < 70 || (s.qa || 0) < 45) {
    fixes.push({
      id: "add-faq-schema",
      title: language === "it" ? "Aggiungi FAQ e schema FAQPage" : "Add FAQs and FAQPage schema",
      category: "aeo",
      priority: "high",
      effort: "easy",
      impactScore: 84,
      confidence: 86,
      estimatedGain: { aeo: 12, seo: 4 },
      problem: language === "it"
        ? "La pagina non espone abbastanza domande e risposte strutturate per i motori di risposta AI."
        : "The page does not expose enough structured questions and answers for AI answer engines.",
      recommendation: language === "it"
        ? "Aggiungi 3-5 FAQ reali legate all'intento della pagina e marcatele con JSON-LD FAQPage."
        : "Add 3-5 real FAQs tied to the page intent and mark them up with FAQPage JSON-LD.",
      implementation: `<script type="application/ld+json">{ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [] }</script>`,
      source: "AEO",
    });
  }

  if ((s.answerFirst || 0) < 60 || (s.chunks || 0) < 55) {
    fixes.push({
      id: "answer-first-content",
      title: language === "it" ? "Scrivi risposte dirette sotto i titoli" : "Write direct answers under headings",
      category: "aeo",
      priority: "high",
      effort: "medium",
      impactScore: 76,
      confidence: 82,
      estimatedGain: { aeo: 10 },
      problem: language === "it"
        ? "I contenuti non sembrano organizzati in blocchi brevi, estraibili e citabili."
        : "Content does not appear to be organized into short, extractable, citable blocks.",
      recommendation: language === "it"
        ? "Dopo ogni H2/H3 inserisci un primo paragrafo di risposta entro 80-100 parole, poi eventuali dettagli."
        : "After each H2/H3, add a first answer paragraph within 80-100 words, followed by supporting detail.",
      implementation: language === "it"
        ? "Pattern: H2 in forma di domanda -> risposta breve -> dettagli -> prova/fonte."
        : "Pattern: question-style H2 -> short answer -> details -> proof/source.",
      source: "AEO",
    });
  }

  if ((s.schema || 0) < 70) {
    fixes.push({
      id: "add-json-ld-schema",
      title: language === "it" ? "Aggiungi dati strutturati JSON-LD" : "Add JSON-LD structured data",
      category: "aeo",
      priority: "medium",
      effort: "easy",
      impactScore: 68,
      confidence: 88,
      estimatedGain: { aeo: 8, seo: 3 },
      problem: language === "it"
        ? "Manca un segnale esplicito sul tipo di contenuto della pagina."
        : "There is no explicit signal describing the page content type.",
      recommendation: language === "it"
        ? "Aggiungi schema Organization, WebSite, Article, Product o Service in base alla pagina."
        : "Add Organization, WebSite, Article, Product, or Service schema depending on the page.",
      implementation: "Prefer JSON-LD in the page head and keep values aligned with visible content.",
      source: "AEO",
    });
  }

  if ((s.author || 0) < 70 || (s.datePublished || 0) < 70 || (s.citations || 0) < 45) {
    fixes.push({
      id: "increase-content-authority",
      title: language === "it" ? "Rendi il contenuto piu autorevole" : "Make the content more authoritative",
      category: "aeo",
      priority: "medium",
      effort: "medium",
      impactScore: 64,
      confidence: 78,
      estimatedGain: { aeo: 7 },
      problem: language === "it"
        ? "Autore, data o fonti esterne non sono abbastanza visibili per valutare affidabilita e freschezza."
        : "Author, date, or external sources are not visible enough to assess trust and freshness.",
      recommendation: language === "it"
        ? "Mostra autore/byline, data di aggiornamento e link a fonti autorevoli dove fai affermazioni verificabili."
        : "Show author/byline, update date, and links to authoritative sources where you make verifiable claims.",
      source: "AEO",
    });
  }

  if ((s.llmsTxt || 0) < 70) {
    fixes.push({
      id: "create-llms-txt",
      title: language === "it" ? "Crea un file /llms.txt" : "Create an /llms.txt file",
      category: "aeo",
      priority: "low",
      effort: "easy",
      impactScore: 42,
      confidence: 70,
      estimatedGain: { aeo: 4 },
      problem: language === "it"
        ? "Il sito non espone una guida testuale dedicata ai crawler AI."
        : "The site does not expose a text guide dedicated to AI crawlers.",
      recommendation: language === "it"
        ? "Aggiungi /llms.txt con pagine chiave, descrizione del sito e contenuti consigliati per i modelli."
        : "Add /llms.txt with key pages, site description, and recommended content for models.",
      source: "AEO",
    });
  }

  return fixes;
}

function buildPrivacyFixes(privacyResult: PrivacyAnalysisResult | null | undefined, language: Language): FixSuggestion[] {
  if (!privacyResult || privacyResult.error === "fetch_failed") return [];
  const fixes: FixSuggestion[] = [];

  if ((privacyResult.adCount || 0) > 0) {
    fixes.push({
      id: "reduce-ad-trackers",
      title: language === "it" ? "Riduci i tracker pubblicitari" : "Reduce advertising trackers",
      category: "privacy",
      priority: "high",
      effort: "medium",
      impactScore: 78,
      confidence: 86,
      estimatedGain: { privacy: Math.min((privacyResult.adCount || 0) * 14, 30), performance: 4 },
      problem: language === "it"
        ? "I tracker pubblicitari pesano su privacy, consenso e spesso anche performance."
        : "Advertising trackers affect privacy, consent, and often performance too.",
      recommendation: language === "it"
        ? "Rimuovi tag marketing non essenziali e caricali solo dopo consenso esplicito."
        : "Remove non-essential marketing tags and load them only after explicit consent.",
      implementation: "Gate marketing scripts behind consent categories and remove duplicate pixels.",
      source: "Privacy",
    });
  }

  if (!privacyResult.consentDetected && ((privacyResult.adCount || 0) > 0 || (privacyResult.analyticsCount || 0) > 0)) {
    fixes.push({
      id: "add-consent-manager",
      title: language === "it" ? "Aggiungi o correggi il consent manager" : "Add or fix the consent manager",
      category: "privacy",
      priority: "critical",
      effort: "medium",
      impactScore: 88,
      confidence: 82,
      estimatedGain: { privacy: 12 },
      problem: language === "it"
        ? "Sono presenti tracker ma non e stato rilevato un gestore del consenso."
        : "Trackers are present but no consent manager was detected.",
      recommendation: language === "it"
        ? "Blocca analytics e marketing fino al consenso e separa le categorie funzionali, statistiche e marketing."
        : "Block analytics and marketing until consent and separate functional, analytics, and marketing categories.",
      source: "Privacy",
    });
  }

  if ((privacyResult.thirdPartyDomains || 0) >= 8) {
    fixes.push({
      id: "consolidate-third-parties",
      title: language === "it" ? "Consolida domini di terze parti" : "Consolidate third-party domains",
      category: "privacy",
      priority: "medium",
      effort: "hard",
      impactScore: 60,
      confidence: 76,
      estimatedGain: { privacy: 8, performance: 5 },
      problem: language === "it"
        ? "Molti domini esterni aumentano latenza, superficie privacy e fragilita del caricamento."
        : "Many external domains increase latency, privacy surface, and load fragility.",
      recommendation: language === "it"
        ? "Elimina fornitori duplicati, self-hosta asset statici quando possibile e limita widget non critici."
        : "Remove duplicate vendors, self-host static assets where possible, and limit non-critical widgets.",
      source: "Privacy",
    });
  }

  return fixes;
}

function buildSeoAndAccessibilityFixes(result: AnalysisResult, language: Language): FixSuggestion[] {
  const fixes: FixSuggestion[] = [];
  const scores = result?.scores || {};
  const details = result?.details || {};
  const seoFailed = (details.seo || []).filter((item) => typeof item.score === "number" && item.score < 1);
  const a11yFailed = (details.accessibility || []).filter((item) => typeof item.score === "number" && item.score < 1);

  if ((scores.seo || 100) < 90 && seoFailed.length > 0) {
    fixes.push({
      id: "fix-seo-basics",
      title: language === "it" ? "Correggi i segnali SEO base" : "Fix basic SEO signals",
      category: "seo",
      priority: (scores.seo || 100) < 70 ? "high" : "medium",
      effort: "easy",
      impactScore: (scores.seo || 100) < 70 ? 76 : 58,
      confidence: 88,
      estimatedGain: { seo: (scores.seo || 100) < 70 ? 12 : 6, aeo: 3 },
      problem: language === "it"
        ? `${seoFailed.length} controlli SEO non sono pienamente superati.`
        : `${seoFailed.length} SEO checks are not fully passing.`,
      recommendation: language === "it"
        ? "Sistema title, meta description, canonical, link descrittivi e contenuti indicizzabili prima di passare a ottimizzazioni avanzate."
        : "Fix title, meta description, canonical, descriptive links, and indexable content before advanced optimization.",
      implementation: seoFailed.slice(0, 3).map((item) => item.title).filter(Boolean).join(" | "),
      source: "Lighthouse",
    });
  }

  if ((scores.accessibility || 100) < 90 && a11yFailed.length > 0) {
    fixes.push({
      id: "fix-accessibility-blockers",
      title: language === "it" ? "Risolvi i blocker di accessibilita" : "Fix accessibility blockers",
      category: "accessibility",
      priority: (scores.accessibility || 100) < 70 ? "high" : "medium",
      effort: "medium",
      impactScore: (scores.accessibility || 100) < 70 ? 80 : 62,
      confidence: 90,
      estimatedGain: { accessibility: (scores.accessibility || 100) < 70 ? 14 : 7, seo: 2 },
      problem: language === "it"
        ? `${a11yFailed.length} controlli accessibilita non sono pienamente superati.`
        : `${a11yFailed.length} accessibility checks are not fully passing.`,
      recommendation: language === "it"
        ? "Dai priorita a contrasto, label dei form, nomi accessibili dei pulsanti e alt text delle immagini informative."
        : "Prioritize contrast, form labels, accessible button names, and alt text for informative images.",
      implementation: a11yFailed.slice(0, 3).map((item) => item.title).filter(Boolean).join(" | "),
      source: "Lighthouse",
    });
  }

  return fixes;
}

export function buildFixSuggestions({
  result,
  aeoResult,
  privacyResult,
  language,
}: BuildFixSuggestionInput): FixSuggestion[] {
  return uniqueById([
    ...buildPerformanceFixes(result, language),
    ...buildAeoFixes(aeoResult, language),
    ...buildPrivacyFixes(privacyResult, language),
    ...buildSeoAndAccessibilityFixes(result, language),
  ])
    .sort((a, b) => rankSuggestion(b) - rankSuggestion(a))
    .slice(0, 8)
    .map((fix) => ({
      ...fix,
      priority: fix.priority || priorityFromScore(fix.impactScore),
    }));
}
