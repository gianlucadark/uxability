# Uxability

Piattaforma di web auditing che analizza siti web su performance, accessibilità, SEO e una metrica proprietaria chiamata **AEO (Answer Engine Optimization)** — quanto bene AI come ChatGPT, Perplexity e Google AI riescono a leggere e citare i tuoi contenuti.

---

## Cosa fa

L'utente inserisce un URL. Il sistema esegue automaticamente il crawl di fino a 5 pagine del dominio e restituisce un report completo con metriche tecniche, raccomandazioni prioritizzate e un piano di azioni concrete.

### Flusso di analisi

1. Validazione URL → crawl automatico (fino a 5 pagine)
2. 3 API chiamate in parallelo (`Promise.allSettled`):
   - `/api/analyze` — Lighthouse + PageSpeed + Chrome UX Report
   - `/api/aeo` — calcolo AEO deterministico + raffinamento via Gemini AI
   - `/api/privacy` — detection tracker di terze parti
3. Dashboard interattiva con tab per pagina analizzata
4. Export PDF + generatore `llms.txt`

---

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript 5 |
| Stile | Tailwind CSS 4 |
| Animazioni | Framer Motion 12 |
| Icone | Lucide React |
| Scroll | Lenis |
| PDF | jsPDF + jspdf-autotable |
| HTML parsing | Cheerio |
| API Esterne | Google PageSpeed Insights, Google Gemini (Flash Lite), Chrome UX Report |
| Font | Geist (Vercel) |

### Variabili d'ambiente richieste

```env
PAGESPEED_API_KEY=       # Google PageSpeed Insights
GEMINI_API_KEY=          # Google Gemini (per AEO AI-enhanced)
GEMINI_MODEL=gemini-3.1-flash-lite   # opzionale
```

---

## Output mostrati all'utente

### Punteggi globali (4 card con anello animato)
- **Performance** 0–100
- **Accessibility** 0–100
- **Best Practices** 0–100
- **SEO** 0–100

### AEO Score
Punteggio 0–100 che misura la leggibilità da parte di AI engine. Calcolato su **13 segnali** in 3 pilastri:
- **Structure (35%)** — JSON-LD Schema.org, gerarchia heading, HTML semantico, meta description
- **Content (40%)** — Q&A density, paragrafi estraibili (40–80 parole), definizioni, answer-first
- **Authority (25%)** — autore/byline, data pubblicazione, citazioni esterne, llms.txt, FAQPage schema

Quando Gemini è disponibile: 35% peso AI, 65% pilastri tecnici.

### Carbon Footprint
- CO₂ per visita (grammi)
- Grado A+ → F
- Emissioni annuali stimate (base: 10.000 visitatori/mese)
- Giorni-albero necessari per compensare

### Privacy & Tracker Score
- Grado lettera A–F
- Conteggio tracker per categoria (advertising, analytics, functional, consent)
- Database di 100+ domini tracker (Google, Meta, LinkedIn, Hotjar…)
- Detection consent manager

### Core Web Vitals (dati utenti reali)
Badge Good / Needs Improvement / Poor per: LCP, FID, INP, CLS, TTFB (da Chrome UX Report)

### User Frustration Index
Traduzione visiva di CLS e TBT in emozioni utente: Happy → Impatient → Frustrated → Rage

### Resource Breakdown
Peso totale pagina con breakdown per tipo: JS, CSS, immagini, font, media, XHR

### Main Thread Work
Distribuzione del lavoro sul thread principale del browser

### Social Preview
Anteprima della card come appare su social media (title, description, OG image)

### AI Strategic Recommendation
Consiglio in linguaggio naturale sul punto di partenza più efficace per migliorare il sito

### Fix Plan
Fino a 8 fix ranked per impatto/sforzo, con categoria, priorità, effort e descrizione

### Criticalities
Lista completa degli audit Lighthouse falliti con badge severità (High / Medium / Low)

### PDF Export
Report scaricabile con tutti i dati, tabelle colorate per soglia (verde ≥90, arancio ≥50, rosso <50), raccomandazioni ordinate per severità

### llms.txt Generator
- Verifica presenza del file `/llms.txt` sul dominio
- Genera automaticamente il file con le pagine analizzate
- Download diretto + istruzioni di deploy

---

## Struttura API

| Route | Scopo |
|-------|-------|
| `POST /api/analyze` | Crawl + Lighthouse + PageSpeed + CrUX |
| `POST /api/aeo` | Calcolo AEO con 13 segnali + Gemini |
| `POST /api/privacy` | Detection tracker + privacy grade |

---

## Note design

Palette cromatica earthy (graphite, champagne, stone) con accent verde/arancio/rosso. Glassmorphism, Framer Motion su tutte le card, sfondo animato con beam drift, scroll smooth Lenis. Interfaccia bilingue italiano/inglese con 640+ chiavi di traduzione.
