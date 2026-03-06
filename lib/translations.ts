export const translations = {
    it: {
        // Navbar
        portfolio: "Portfolio",

        // Hero
        heroTitle: "UXABILITY",
        heroSubtitle: "Analizza il tuo sito web con un crawl intelligente. Ricevi report PDF completi su velocità, SEO e come migliorare.",
        inputPlaceholder: "Inserisci l'URL (es. google.com)",
        analyzeButton: "Analizza Sito",
        crawlingText: "Crawl intelligente in corso: Analizzando 5 pagine...",

        // Results
        homePage: "Home Page",
        exportPdf: "Esporta PDF",
        analyzed: "Analizzato",
        pageSelector: "Selettore Pagina",
        globalScores: "Punteggi Globali",
        performance: "Performance",
        accessibility: "Accessibilità",
        bestPractices: "Best Practices",
        seo: "SEO",
        criticalities: "Criticità e Migliorie",
        noCriticalities: "Nessuna criticità rilevante trovata per questa pagina. Ottimo lavoro!",

        // PDF Report
        reportTitle: "UXABILITY ANALYSIS REPORT",
        generatedOn: "Generato il:",
        analyzedUrl: "URL Analizzato:",
        category: "Categoria",
        score: "Punteggio",
        realUserExperience: "Esperienza Utenti Reali (Core Web Vitals)",
        metric: "Metrica",
        value: "Valore",
        status: "Stato",
        pageWeight: "Composizione Pesantezza Pagina",
        resourceType: "Tipo Risorsa",
        requests: "Richieste",
        size: "Dimensione",
        interventionPriority: "Priorità di Intervento e Migliorie",
        detectedProblem: "Problema Rilevato",
        severity: "Gravità",
        estimatedImpact: "Impatto Stimato",
        technicalConclusion: "Conclusione Tecnica:",
        conclusionText: (score: number) => `Il sito web analizzato presenta un punteggio di performance di ${score}/100. Si consiglia di focalizzarsi prioritariamente sulle criticità contrassegnate come 'High' per migliorare l'esperienza utente e l'indicizzazione sui motori di ricerca.`,

        // Errors
        invalidUrl: "Inserisci un URL valido (es. google.com)",
        analysisError: "Errore durante l'analisi. Riprova.",
        connectionError: "Impossibile connettersi al server.",

        // Components labels
        visualInsights: "Insight Visivi",
        resourceBreakdown: "Distribuzione Risorse",
        mainThreadWork: "Lavoro Main Thread",
        labMetrics: "Analisi di Laboratorio",
        aiRecommendation: "Suggerimenti Strategici AI",

        // Lab Metrics
        labMetricsTitle: "Analisi di Laboratorio",
        labMetricsSubtitle: "Test di simulazione eseguiti su una rete mobile 4G controllata. Mostra le prestazioni del sito in condizioni di rete standard non ottimali.",
        labMetricsFooter: "I test di laboratorio sono riproducibili e ideali per il debug.",

        lcp_title: "Largest Contentful Paint",
        lcp_label: "Tempo di Carico",
        lcp_desc: "Misura quanto tempo occorre per caricare l'elemento principale (es. immagine banner). È il momento in cui l'utente sente che la pagina è 'pronta'.",

        tbt_title: "Total Blocking Time",
        tbt_label: "Tempo di Blocco",
        tbt_desc: "Somma di tutti i momenti in cui il browser è stato bloccato. Se alto, l'interfaccia non risponde subito ai click o agli scroll.",

        cls_title: "Cumulative Layout Shift",
        cls_label: "Stabilità Visiva",
        cls_desc: "Valuta se gli elementi 'ballano' durante il caricamento. Più è basso, maggiore è la stabilità e la qualità percepita.",

        si_title: "Speed Index",
        si_label: "Indice di Velocità",
        si_desc: "Esprime in un numero quanto velocemente sono stati visualizzati i contenuti. Più è basso, più la pagina è scattante.",

        tti_title: "Time to Interactive",
        tti_label: "Tempo di Interattività",
        tti_desc: "Il lasso di tempo necessario affinché la pagina sia completamente utilizzabile e risponda ai comandi senza rallentamenti.",

        fcp_title: "First Contentful Paint",
        fcp_label: "Prima Apparizione",
        fcp_desc: "È il momento preciso in cui compare la prima porzione di contenuto (testo o immagine) sullo schermo.",

        // Field Data Badges
        fieldDataTitle: "Esperienza Utenti Reali",
        fieldDataSubtitle: "Questi dati riflettono l'esperienza attuale dei tuoi navigatori reali (Chrome UX Report). Google li utilizza per il posizionamento SEO.",
        fieldDataNotAvailable: "Dati Utenti Reali non disponibili",
        fieldDataNotAvailableDesc: "Google Chrome User Experience Report (CrUX) non dispone ancora di sufficiente traffico per questo URL negli ultimi 28 giorni per generare un report statistico affidabile.",
        statusExcellent: "Eccellente",
        statusNeedsImprovement: "Migliorabile",
        statusCritical: "Critico",
        fast: "Veloce",
        normal: "Normale",
        slow: "Lento",
        verdictTitle: "Verdetto Esperienza Utente",
        verdictPassed: (passed: boolean) => `Basandosi sugli utenti reali, il tuo sito ${passed ? "supera" : "non supera"} i parametri di qualità imposti da Google per una navigazione eccellente.`,

        LCP_field: "Visualizz. Contenuto (LCP)",
        LCP_field_desc: "L'istante in cui l'utente vede l'elemento principale (hero image, titolo). È fondamentale per la percezione di velocità.",
        FID_field: "Reattività al Click (FID)",
        FID_field_desc: "Il tempo che intercorre tra l'interazione (es. click) e la risposta del browser. Influenza quanto il sito sembra 'scattante'.",
        CLS_field: "Stabilità Visiva (CLS)",
        CLS_field_desc: "Misura se gli elementi si muovono mentre la pagina carica. Evita che l'utente clicchi il pulsante sbagliato per errore.",
        INP_field: "Fluidità Interazione (INP)",
        INP_field_desc: "Valuta quanto il sito risponde prontamente ad ogni azione compiuta dall'utente durante l'intera permanenza.",
        FCP_field: "Prima Apparizione (FCP)",
        FCP_field_desc: "Misura il tempo impiegato per visualizzare il primo bit di contenuto (testo o immagine) sullo schermo.",
        TTFB_field: "Risposta Server (TTFB)",
        TTFB_field_desc: "Il tempo che il server impiega per inviare il primo byte di dati in risposta a una richiesta.",

        // Resource Breakdown
        resourceTitle: "Composizione Pesantezza",
        resourceSubtitle: "Un'analisi dettagliata di ogni byte trasferito. Siti più leggeri si caricano istantaneamente anche su dispositivi mobili limitati.",
        totalWeight: "Peso Totale Pagina",
        totalRequests: "Richieste Totali",

        // Search Preview
        searchPreviewTitle: "Anteprima Search Engine",
        metaTagOptimization: "Ottimizzazione Meta-Tag",
        metaTagOptimizationDesc: "Il titolo e la descrizione sono i primi elementi che l'utente vede su Google. Assicurati che siano coerenti con il contenuto della pagina.",
        // Main Thread Breakdown
        mainThreadTitle: "Lavoro Main Thread",
        mainThreadSubtitle: "Misura quanto tempo il browser impiega per processare il caricamento. Se il processore è occupato, l'interfaccia si blocca.",
        scriptEvaluation: "Valutazione Script",
        otherRendering: "Altro",
        styleLayout: "Stile e Layout",
        rendering: "Rendering",
        parseHtml: "Parsing HTML/CSS",
        scriptParse: "Parsing Script",
        layout: "Struttura",
        paintCompositeRender: "Disegno e Rendering",

        // AI Recommendation
        aiAdviceTitle: "Consiglio dello Strategist",
        aiSmartAnalysis: "Analisi Intelligente",
        bestStartingPoint: "Miglior Punto di Partenza",
        impactEstimated: "Impatto Stimato",
        difficulty: "Difficoltà",
        focusSeo: "Focus SEO",
        priority: "Priorità",
        immediate: "Immediata",
        high_label: "Alto",
        medium_label: "Media",
        low_label: "Bassa",
        aiAdvice_good: "Il tuo sito è in ottima forma! Concentrati solo su micro-ottimizzazioni per mantenere il primato.",
        aiAdvice_medium: "Sei a metà strada. Con pochi interventi mirati sulle immagini e sugli script puoi entrare nella fascia verde.",
        aiAdvice_poor: "Attenzione: le prestazioni attuali potrebbero penalizzare il tuo SEO e far scappare gli utenti. Inizia subito dalle criticità 'High'.",
        aiRecommendationDesc: (fix: string) => `Il nostro motore di analisi ha identificato che intervenire su ${fix} è l'azione con il miglior rapporto sforzo/risultato per il tuo sito.`,

        // Opportunity Card
        savingPotential: "Risparmio Stimato",
        high: "Alta",
        medium: "Media",
        low: "Bassa",
        savingsLabel: (val: string) => `Risparmio di ${val}`,
        testFailed: "Test Falliti",
        testPassed: "Test Superati",
        details: "Dettagli",
        points: "Punti",
        info: "Info",

        // Resource Types
        document: "Documento",
        script: "Script",
        stylesheet: "CSS",
        image: "Immagine",
        media: "Media",
        font: "Font",
        xhr: "XHR/Fetch"
    },
    en: {
        // Navbar
        portfolio: "Portfolio",

        // Hero
        heroTitle: "UXABILITY",
        heroSubtitle: "Analyze your website with an intelligent crawl. Get complete PDF reports on speed, SEO and how to improve.",
        inputPlaceholder: "Enter URL (e.g., vercel.com)",
        analyzeButton: "Analyze Site",
        crawlingText: "Intelligent crawl in progress: Analyzing 5 pages...",

        // Results
        homePage: "Home Page",
        exportPdf: "Export PDF",
        analyzed: "Analyzed",
        pageSelector: "Page Selector",
        globalScores: "Global Scores",
        performance: "Performance",
        accessibility: "Accessibility",
        bestPractices: "Best Practices",
        seo: "SEO",
        criticalities: "Criticalities & Improvements",
        noCriticalities: "No relevant criticalities found for this page. Great work!",

        // PDF Report
        reportTitle: "UXABILITY ANALYSIS REPORT",
        generatedOn: "Generated on:",
        analyzedUrl: "Analyzed URL:",
        category: "Category",
        score: "Score",
        realUserExperience: "Real User Experience (Core Web Vitals)",
        metric: "Metric",
        value: "Value",
        status: "Status",
        pageWeight: "Page Weight Composition",
        resourceType: "Resource Type",
        requests: "Requests",
        size: "Size",
        interventionPriority: "Intervention Priority & Improvements",
        detectedProblem: "Detected Problem",
        severity: "Severity",
        estimatedImpact: "Estimated Impact",
        technicalConclusion: "Technical Conclusion:",
        conclusionText: (score: number) => `The analyzed website has a performance score of ${score}/100. It is recommended to prioritize critical issues marked as 'High' to improve user experience and search engine indexing.`,

        // Errors
        invalidUrl: "Enter a valid URL (e.g., google.com)",
        analysisError: "Error during analysis. Please try again.",
        connectionError: "Unable to connect to the server.",

        // Components labels
        visualInsights: "Visual Insights",
        resourceBreakdown: "Resource Distribution",
        mainThreadWork: "Main Thread Work",
        labMetrics: "Lab Analysis",
        aiRecommendation: "AI Strategic Insights",

        // Lab Metrics
        labMetricsTitle: "Lab Analysis",
        labMetricsSubtitle: "Simulation tests performed on a controlled 4G mobile network. Shows site performance under standard suboptimal network conditions.",
        labMetricsFooter: "Lab tests are reproducible and ideal for debugging.",

        lcp_title: "Largest Contentful Paint",
        lcp_label: "Loading Time",
        lcp_desc: "Measures how long it takes to load the main element (e.g., banner image). It is the moment when the user feels the page is 'ready'.",

        tbt_title: "Total Blocking Time",
        tbt_label: "Blocking Time",
        tbt_desc: "Sum of all times when the browser was blocked. If high, the interface does not respond immediately to clicks or scrolls.",

        cls_title: "Cumulative Layout Shift",
        cls_label: "Visual Stability",
        cls_desc: "Evaluates if elements 'jump' during loading. The lower it is, the greater the stability and perceived quality.",

        si_title: "Speed Index",
        si_label: "Speed Index",
        si_desc: "Expresses in a number how quickly content was displayed. The lower it is, the more snappy the page is.",

        tti_title: "Time to Interactive",
        tti_label: "Interactive Time",
        tti_desc: "The amount of time required for the page to be fully usable and respond to commands without slowdowns.",

        fcp_title: "First Contentful Paint",
        fcp_label: "First Appearance",
        fcp_desc: "It is the precise moment when the first piece of content (text or image) appears on the screen.",

        // Field Data Badges
        fieldDataTitle: "Real User Experience",
        fieldDataSubtitle: "These data reflect the current experience of your real navigators (Chrome UX Report). Google uses them for SEO ranking.",
        fieldDataNotAvailable: "Real User Data not available",
        fieldDataNotAvailableDesc: "Google Chrome User Experience Report (CrUX) does not yet have enough traffic for this URL in the last 28 days to generate a reliable statistical report.",
        statusExcellent: "Excellent",
        statusNeedsImprovement: "Needs Improvement",
        statusCritical: "Critical",
        fast: "Fast",
        normal: "Average",
        slow: "Slow",
        verdictTitle: "User Experience Verdict",
        verdictPassed: (passed: boolean) => `Based on real users, your site ${passed ? "passes" : "does not pass"} the quality parameters set by Google for an excellent navigation.`,

        LCP_field: "Content Visualization (LCP)",
        LCP_field_desc: "The instant when the user sees the main element (hero image, title). It is vital for perceived speed.",
        FID_field: "Click Responsiveness (FID)",
        FID_field_desc: "The time between interaction (e.g., click) and the browser's response. Influences how 'snappy' the site feels.",
        CLS_field: "Visual Stability (CLS)",
        CLS_field_desc: "Measures if elements move while the page is loading. Prevents the user from accidentally clicking the wrong button.",
        INP_field: "Interaction Fluidity (INP)",
        INP_field_desc: "Evaluates how promptly the site responds to every action performed by the user during their entire stay.",
        FCP_field: "First Appearance (FCP)",
        FCP_field_desc: "Measures the time taken to display the first bit of content (text or image) on the screen.",
        TTFB_field: "Server Response (TTFB)",
        TTFB_field_desc: "The time the server takes to send the first byte of data in response to a request.",

        // Resource Breakdown
        resourceTitle: "Weight Composition",
        resourceSubtitle: "A detailed analysis of every byte transferred. Lighter sites load instantly even on limited mobile devices.",
        totalWeight: "Total Page Weight",
        totalRequests: "Total Requests",

        // Search Preview
        searchPreviewTitle: "Search Engine Preview",
        metaTagOptimization: "Meta-Tag Optimization",
        metaTagOptimizationDesc: "The title and description are the first elements the user sees on Google. Make sure they are consistent with the page content.",
        // Main Thread Breakdown
        mainThreadTitle: "Main Thread Work",
        mainThreadSubtitle: "Measures how long the browser takes to process loading. If the processor is busy, the interface freezes.",
        scriptEvaluation: "Script Evaluation",
        otherRendering: "Other",
        styleLayout: "Style & Layout",
        rendering: "Rendering",
        parseHtml: "HTML/CSS Parsing",
        scriptParse: "Script Parsing",
        layout: "Structure",
        paintCompositeRender: "Painting & Rendering",

        // AI Recommendation
        aiAdviceTitle: "Strategist Advice",
        aiSmartAnalysis: "Smart Analysis",
        bestStartingPoint: "Best Starting Point",
        impactEstimated: "Estimated Impact",
        difficulty: "Difficulty",
        focusSeo: "SEO Focus",
        priority: "Priority",
        immediate: "Immediate",
        high_label: "High",
        medium_label: "Medium",
        low_label: "Low",
        aiAdvice_good: "Your site is in great shape! Focus only on micro-optimizations to stay on top.",
        aiAdvice_medium: "You're halfway there. With a few targeted interventions on images and scripts you can enter the green zone.",
        aiAdvice_poor: "Attention: current performance could penalize your SEO and scare away users. Start immediately with 'High' criticalities.",
        aiRecommendationDesc: (fix: string) => `Our analysis engine has identified that intervening on ${fix} is the action with the best effort/result ratio for your site.`,

        // Opportunity Card
        savingPotential: "Estimated Savings",
        high: "High",
        medium: "Medium",
        low: "Low",
        savingsLabel: (val: string) => `${val} savings`,
        testFailed: "Failed Tests",
        testPassed: "Passed Tests",
        details: "Details",
        points: "Points",
        info: "Info",

        // Resource Types
        document: "Document",
        script: "Script",
        stylesheet: "CSS",
        image: "Image",
        media: "Media",
        font: "Font",
        xhr: "XHR/Fetch"
    }
};

export type Language = 'it' | 'en';
export type TranslationKey = keyof typeof translations.it;
