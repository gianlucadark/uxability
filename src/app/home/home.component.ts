import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { AxeService } from '../service/axe.service';
import { TranslationService } from '../service/translation.service';
import { ViolationNode, Violation, ViolationGroup} from '../model/home.models';
import { GeminiService } from '../service/gemini.service';
import { HttpClient } from '@angular/common/http';
import { RustScanResult, RustWasmService } from '../service/rust-wasm.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  @ViewChild('siteIframe') siteIframe!: ElementRef;
  @ViewChild('previewImage') previewImage!: ElementRef;

  url: string = '';
  loading: boolean = false;
  scanResults: any = null;
  screenshotUrl: SafeUrl | null = null;
  iframeUrl: SafeResourceUrl | null = null;
  violationGroups: ViolationGroup[] = [];
  private highlightStyleId = 'violation-highlight-style';
  currentHighlight: string | null = null;
  previewScale: number = 1;
  isDragging: boolean = false;
  startX: number = 0;
  startY: number = 0;
  scrollLeft: number = 0;
  scrollTop: number = 0;
  previewError: boolean = false;
  pageWidth = 0;
  pageHeight = 0;
  imageNaturalWidth = 0;
  imageNaturalHeight = 0;
  imageClientWidth = 0;
  imageClientHeight = 0;
  tooltipIndex: number|null = null;
  lighthouseResults: any = null;
  selectedLighthouseCategory: string|null = null;
  showLighthouseModal: boolean = false;
  lighthouseDetails = {
    performance: false,
    accessibility: false,
    bestPractices: false,
    seo: false
  };
  criticalCount: number = 0;
  seriousCount: number = 0;
  moderateCount: number = 0;
  minorCount: number = 0;

  // Proprietà per il tooltip della heatmap
  activeHeatmapTooltip: number|null = null;
  tooltipPosition = { x: 0, y: 0 };

  summaryAI: string | null = null;
  rustResult: RustScanResult | null = null;
  rustScanTime: number | null = null;
  scanMode: 'light' | 'deep' = 'light';

  constructor(
    private axeService: AxeService,
    private sanitizer: DomSanitizer,
    public translationService: TranslationService,
    private geminiService: GeminiService,
    private http: HttpClient,
    private rustWasm: RustWasmService
  ) {}

  ngOnInit() {}

  async onSubmit() {
    if (!this.url) return;

    this.loading = true;
    this.scanResults = null;
    this.screenshotUrl = null;
    this.previewError = false;
    this.lighthouseResults = null;
    this.criticalCount = 0;
    this.seriousCount = 0;
    this.moderateCount = 0;
    this.minorCount = 0;
    this.summaryAI = null;
    this.rustResult = null;
    this.rustScanTime = null;

    try {
      // --- Analisi Rust: scarica HTML e verifica <title> ---
      const html = await this.http
        .post('http://localhost:3001/proxy-html', { url: this.url }, { responseType: 'text' })
        .toPromise();

      const rustStart = performance.now();
      const scanResult = await this.rustWasm.scanHtml(html || '');
      const rustEnd = performance.now();

      this.rustResult = scanResult;
      this.rustScanTime = ((rustEnd - rustStart) / 1000);
      // --- Fine analisi Rust ---

      if (this.scanMode === 'deep') {
        const results = await this.axeService.scanUrl(this.url);
        this.scanResults = results;
        this.lighthouseResults = results.lighthouse || null;
        if (!results.error) {
          this.organizeViolations(results.violations || []);
          this.updateViolationCounts(results.violations || []);
          if (results.screenshot) {
            this.screenshotUrl = this.sanitizer.bypassSecurityTrustUrl(results.screenshot);
          } else {
            this.previewError = true;
          }
          this.pageWidth = results.pageWidth || 0;
          this.pageHeight = results.pageHeight || 0;
        }
      }
    } catch (error) {
      this.scanResults = { error: 'Si è verificato un errore durante la scansione. Riprova più tardi.' };
      this.previewError = true;
    } finally {
      this.loading = false;
    }
  }

  onImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    this.imageNaturalWidth = img.naturalWidth;
    this.imageNaturalHeight = img.naturalHeight;
    this.imageClientWidth = img.clientWidth;
    this.imageClientHeight = img.clientHeight;
    this.previewError = false;
    this.loading = false;
  }

  toggleScanMode() {
    this.scanMode = this.scanMode === 'light' ? 'deep' : 'light';
    this.rustResult = null;
  // Il binding [(ngModel)] si aggiorna automaticamente!
}

  onImageError(event: Event) {
    this.previewError = true;
    this.loading = false;
  }


  highlightElement(selector: string, impact: string) {
    const iframe = this.siteIframe?.nativeElement;
    if (!iframe || !iframe.contentDocument) return;

    // Rimuovi l'evidenziazione precedente
    this.removeHighlight();

    try {
      // Trova l'elemento usando il selettore
      const element = iframe.contentDocument.querySelector(selector);
      if (element) {
        this.currentHighlight = selector;
        element.classList.add('violation-highlight', `violation-highlight-${impact.toLowerCase()}`);

        // Scorri l'elemento in vista
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      console.error('Errore durante l\'evidenziazione:', error);
    }
  }

  removeHighlight() {
    const iframe = this.siteIframe?.nativeElement;
    if (!iframe || !iframe.contentDocument || !this.currentHighlight) return;

    try {
      const element = iframe.contentDocument.querySelector(this.currentHighlight);
      if (element) {
        element.classList.remove(
          'violation-highlight',
          'violation-highlight-critical',
          'violation-highlight-serious',
          'violation-highlight-moderate',
          'violation-highlight-minor'
        );
      }
      this.currentHighlight = null;
    } catch (error) {
      console.error('Errore durante la rimozione dell\'evidenziazione:', error);
    }
  }

  zoomIn() {
    this.previewScale = Math.min(this.previewScale + 0.1, 2);
  }

  zoomOut() {
    this.previewScale = Math.max(this.previewScale - 0.1, 0.5);
  }

  resetZoom() {
    this.previewScale = 1;
  }

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.startX = event.pageX - (event.target as HTMLElement).offsetLeft;
    this.startY = event.pageY - (event.target as HTMLElement).offsetTop;
    this.scrollLeft = (event.target as HTMLElement).scrollLeft;
    this.scrollTop = (event.target as HTMLElement).scrollTop;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;

    event.preventDefault();
    const x = event.pageX - (event.target as HTMLElement).offsetLeft;
    const y = event.pageY - (event.target as HTMLElement).offsetTop;
    const walkX = (x - this.startX) * 2;
    const walkY = (y - this.startY) * 2;

    (event.target as HTMLElement).scrollLeft = this.scrollLeft - walkX;
    (event.target as HTMLElement).scrollTop = this.scrollTop - walkY;
  }

  onMouseUp() {
    this.isDragging = false;
  }

  organizeViolations(violations: Violation[]) {
    // Raggruppa per impatto
    const impacts = ['critical', 'serious', 'moderate', 'minor'];
    this.violationGroups = impacts.map(impact => {
      const groupViolations = violations.filter(v => v.impact === impact).map(v => {
        // Traduzione description e solution
        const translation = this.translationService.translateViolation(v.id, v.description);
        // Traduzione failureSummary (se presente)
        let failureSummaryTradotto = undefined;
        let failureSummaryTecnico = undefined;
        if (v.nodes && v.nodes[0]?.failureSummary) {
          const fs = this.translationService.translateFailureSummary(v.nodes[0].failureSummary);
          failureSummaryTradotto = fs.message;
          failureSummaryTecnico = fs.technical;
        }
        return {
          ...v,
          showDetails: false,
          wcag: this.translationService.getWcagReferences(v.id),
          translatedDescription: translation.description,
          translatedSolution: translation.solution,
          translatedFailureSummary: failureSummaryTradotto,
          technicalFailureSummary: failureSummaryTecnico
        };
      });
      return {
        impact,
        translatedImpact: this.translationService.translateImpact(impact),
        violations: groupViolations,
        isExpanded: false
      };
    }).filter(g => g.violations.length > 0);
    this.updateViolationCounts(violations);
  }

  getImpactWeight(impact: string): number {
    const weights: { [key: string]: number } = {
      'critical': 4,
      'serious': 3,
      'moderate': 2,
      'minor': 1
    };
    return weights[impact] || 0;
  }

  getImpactIcon(impact: string): string {
    const icons: { [key: string]: string } = {
      'critical': 'fa-exclamation-circle text-danger',
      'serious': 'fa-exclamation-triangle text-warning',
      'moderate': 'fa-info-circle text-info',
      'minor': 'fa-comment text-secondary'
    };
    return icons[impact] || 'fa-circle';
  }

  toggleGroup(group: ViolationGroup) {
    group.isExpanded = !group.isExpanded;
    // Rimuovo ogni chiamata automatica a Gemini dopo la scansione o nell'apertura degli accordion/modale.
    // Le uniche chiamate a Gemini devono essere nei metodi getAxeAIExplanation e getAuditAIExplanation, invocati solo dal click sui pulsanti.
  }

  getPassesCount(): number {
    return this.scanResults?.passes?.length || 0;
  }

  getIncompleteCount(): number {
    return this.scanResults?.incomplete?.length || 0;
  }

  getViolationExplanation(violationType: string): string {
    return this.translationService.getViolationExplanation(violationType);
  }

  formatElementPath(target: string): string {
    return this.translationService.formatElementPath(target);
  }

  getTranslatedFailureSummary(summary: string): { message: string, technical: string } {
    return this.translationService.translateFailureSummary(summary);
  }

  getScaledLeft(point: any): number {
    if (!this.imageNaturalWidth || !this.imageClientWidth) return 0;
    const scale = (this.imageClientWidth * this.previewScale) / this.imageNaturalWidth;
    return Math.round(point.left * scale);
  }
  getScaledTop(point: any): number {
    if (!this.imageNaturalHeight || !this.imageClientHeight) return 0;
    const scale = (this.imageClientHeight * this.previewScale) / this.imageNaturalHeight;
    return Math.round(point.top * scale);
  }
  getScaledWidth(point: any): number {
    if (!this.imageNaturalWidth || !this.imageClientWidth) return 0;
    const scale = (this.imageClientWidth * this.previewScale) / this.imageNaturalWidth;
    return Math.max(1, Math.round(point.width * scale));
  }
  getScaledHeight(point: any): number {
    if (!this.imageNaturalHeight || !this.imageClientHeight) return 0;
    const scale = (this.imageClientHeight * this.previewScale) / this.imageNaturalHeight;
    return Math.max(1, Math.round(point.height * scale));
  }
  showTooltip(idx: number) { this.tooltipIndex = idx; }
  hideTooltip() { this.tooltipIndex = null; }

  getGlobalIndex(group: any, idx: number): number {
    let index = 0;
    for (const g of this.violationGroups) {
      if (g === group) break;
      index += g.violations.length;
    }
    return index + idx;
  }

  // Restituisce il colore del bordo in base all'impatto
  getImpactColor(impact: string): string {
    switch ((impact || '').toLowerCase()) {
      case 'critical': return '#dc2626'; // rosso
      case 'serious': return '#f59e0b'; // arancione
      case 'moderate': return '#3498db'; // blu
      case 'minor': return '#64748b'; // grigio
      default: return '#888';
    }
  }

  getLighthouseAudits(category: string|null): any[] {
    if (!category || !this.lighthouseResults || !this.lighthouseResults.lhr) return [];
    const lhr = this.lighthouseResults.lhr;
    const cat = lhr.categories[category] || lhr.categories[category.replace(/-/g, '')];
    if (!cat || !cat.auditRefs) return [];

    return cat.auditRefs
      .map((ref: any) => lhr.audits[ref.id])
      .filter((audit: any) => {
        if (!audit) return false;

        // Filtra fuori audit non applicabili o privi di punteggio
        if (audit.score === null || audit.score === undefined) return false;

        // Mostra solo quelli problematici
        return audit.score < 1;
      });
  }

  openLighthouseModal(category: string) {
    this.selectedLighthouseCategory = category;
    this.showLighthouseModal = true;
    // RIMOSSA la chiamata automatica a interpretLighthouse
  }

  closeLighthouseModal() {
    this.showLighthouseModal = false;
    this.selectedLighthouseCategory = null;
  }

  updateViolationCounts(violations: Violation[]) {
    this.criticalCount = violations.filter(v => v.impact === 'critical').length;
    this.seriousCount = violations.filter(v => v.impact === 'serious').length;
    this.moderateCount = violations.filter(v => v.impact === 'moderate').length;
    this.minorCount = violations.filter(v => v.impact === 'minor').length;
  }

  // Metodi per la modale Lighthouse user-friendly
  getCategoryIcon(category: string|null): string {
    const icons: { [key: string]: string } = {
      'performance': 'fa-tachometer-alt',
      'accessibility': 'fa-universal-access',
      'best-practices': 'fa-star',
      'seo': 'fa-search'
    };
    return icons[category || ''] || 'fa-chart-bar';
  }

  getCategoryTitle(category: string|null): string {
    const titles: { [key: string]: string } = {
      'performance': 'Performance del Sito',
      'accessibility': 'Accessibilità',
      'best-practices': 'Best Practices',
      'seo': 'Ottimizzazione SEO'
    };
    return titles[category || ''] || 'Categoria';
  }

  getCategoryDescription(category: string|null): string {
    const descriptions: { [key: string]: string } = {
      'performance': 'Velocità di caricamento e reattività del sito',
      'accessibility': 'Quanto il sito è accessibile a tutti gli utenti',
      'best-practices': 'Aderenza alle migliori pratiche web',
      'seo': 'Ottimizzazione per i motori di ricerca'
    };
    return descriptions[category || ''] || 'Analisi della categoria';
  }

    getCategoryScore(category: string|null): number {
    if (!category || !this.lighthouseResults) return 0;

    let score = 0;

    // Usa la stessa logica del template HTML
    switch (category) {
      case 'performance':
        score = this.lighthouseResults.performance || 0;
        break;
      case 'accessibility':
        score = this.lighthouseResults.accessibility || 0;
        break;
      case 'best-practices':
        score = this.lighthouseResults.bestPractices || 0;
        break;
      case 'seo':
        score = this.lighthouseResults.seo || 0;
        break;
      default:
        return 0;
    }


    const audits = this.getLighthouseAudits(category);
    const hasFailed = audits.some(a => a.score !== null && a.score < 0.9); // o a.score !== 1

    // Penalizza 1 punto se ci sono errori anche se Lighthouse dà 100
    if (hasFailed && score >= 100) return 99;
    return Math.round(score);
  }

  getScoreClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  getScoreMessage(score: number): string {
    if (score >= 90) return 'Eccellente! 🎉';
    if (score >= 70) return 'Buono 👍';
    if (score >= 50) return 'Necessita miglioramenti ⚠️';
    return 'Richiede attenzione urgente 🔴';
  }

  getScoreDescription(score: number): string {
    if (score >= 90) return 'Il tuo sito ha ottime prestazioni in questa categoria.';
    if (score >= 70) return 'Il tuo sito ha buone prestazioni, ma ci sono alcuni aspetti da migliorare.';
    if (score >= 50) return 'Il tuo sito ha prestazioni nella media, ma ci sono diverse aree da ottimizzare.';
    return 'Il tuo sito ha prestazioni scarse in questa categoria e necessita di miglioramenti significativi.';
  }

  getDisplayScore(category: string): number {
    const rawScore = this.getCategoryScore(category);
    const audits = this.getLighthouseAudits(category);
    const hasFailed = audits.some(a => a.score !== null && a.score < 1);
    return rawScore === 100 && hasFailed ? 99 : rawScore;
  }

  getAuditTitle(audit: any): string {
    // Traduci i titoli tecnici in linguaggio semplice
    const titleTranslations: { [key: string]: string } = {
      'first-contentful-paint': 'Primo contenuto visibile',
      'largest-contentful-paint': 'Contenuto principale',
      'first-input-delay': 'Risposta al primo click',
      'cumulative-layout-shift': 'Stabilità del layout',
      'speed-index': 'Indice di velocità',
      'total-blocking-time': 'Tempo di blocco totale',
      'max-potential-fid': 'Interattività massima',
      'server-response-time': 'Tempo di risposta del server',
      'render-blocking-resources': 'Risorse che bloccano il rendering',
      'unused-css-rules': 'CSS non utilizzato',
      'unused-javascript': 'JavaScript non utilizzato',
      'modern-image-formats': 'Formati immagine moderni',
      'efficient-animated-content': 'Contenuti animati efficienti',
      'preload-lcp-image': 'Precaricamento immagini importanti',
      'font-display': 'Visualizzazione font',
      'unminified-css': 'CSS non compresso',
      'unminified-javascript': 'JavaScript non compresso',
      'uses-optimized-images': 'Immagini ottimizzate',
      'uses-text-compression': 'Compressione testo',
      'uses-responsive-images': 'Immagini responsive',
      'total-byte-weight': 'Peso totale della pagina',
      'uses-long-cache-ttl': 'Cache a lungo termine',
      'dom-size': 'Dimensione DOM',
      'critical-request-chains': 'Catene di richieste critiche',
      'user-timings': 'Metriche utente',
      'bootup-time': 'Tempo di avvio',
      'mainthread-work-breakdown': 'Lavoro del thread principale',
      'resource-summary': 'Riepilogo risorse',
      'third-party-summary': 'Riepilogo terze parti',
      'largest-contentful-paint-element': 'Elemento principale',
      'layout-shift-elements': 'Elementi che causano spostamenti',
      'long-tasks': 'Attività lunghe',
      'non-composited-animations': 'Animazioni non composte',
      'unsized-images': 'Immagini senza dimensioni',
      'uses-rel-preload': 'Precaricamento relativo',
      'uses-rel-preconnect': 'Preconnessione relativa',
      'uses-http2': 'Utilizzo HTTP/2',
      'uses-passive-event-listeners': 'Event listener passivi',
      'no-document-write': 'Nessun document.write',
      'external-anchors-use-rel-noopener': 'Link esterni sicuri',
      'geolocation-on-start': 'Geolocalizzazione all\'avvio',
      'no-vulnerable-libraries': 'Nessuna libreria vulnerabile',
      'js-libraries': 'Librerie JavaScript',
      'notification-on-start': 'Notifiche all\'avvio',
      'deprecations': 'Funzionalità deprecate',
      'errors-in-console': 'Errori nella console',
      'image-aspect-ratio': 'Proporzioni immagine',
      'image-size-responsive': 'Dimensioni immagine responsive',
      'maskable-icons': 'Icone adattabili',
      'apple-touch-icon': 'Icona Apple Touch',
      'content-width': 'Larghezza contenuto',
      'viewport': 'Viewport',
      'document-title': 'Titolo documento',
      'meta-description': 'Meta descrizione',
      'link-text': 'Testo dei link',
      'is-crawlable': 'Crawlabilità',
      'robots-txt': 'Robots.txt',
      'structured-data': 'Dati strutturati',
      'tap-targets': 'Target di tap',
      'aria-allowed-attr': 'Attributi ARIA consentiti',
      'aria-hidden-body': 'ARIA nascosto nel body',
      'aria-hidden-focus': 'ARIA nascosto nel focus',
      'aria-input-field-name': 'Nome campo input ARIA',
      'aria-required-attr': 'Attributi ARIA richiesti',
      'aria-required-children': 'Figli ARIA richiesti',
      'aria-required-parent': 'Genitore ARIA richiesto',
      'aria-roles': 'Ruoli ARIA',
      'aria-valid-attr': 'Attributi ARIA validi',
      'aria-valid-attr-value': 'Valori attributi ARIA validi',
      'button-name': 'Nome pulsante',
      'bypass': 'Bypass',
      'color-contrast': 'Contrasto colori',
      'duplicate-id': 'ID duplicati',
      'form-field-multiple-labels': 'Campi form con etichette multiple',
      'frame-title': 'Titolo frame',
      'heading-order': 'Ordine intestazioni',
      'html-has-lang': 'HTML con lingua',
      'html-lang-valid': 'Lingua HTML valida',
      'image-alt': 'Testo alternativo immagine',
      'input-image-alt': 'Testo alternativo immagine input',
      'label': 'Etichetta',
      'link-name': 'Nome link',
      'list': 'Lista',
      'listitem': 'Elemento lista',
      'meta-refresh': 'Meta refresh',
      'meta-viewport': 'Meta viewport',
      'object-alt': 'Testo alternativo oggetto',
      'tabindex': 'Indice tabulazione',
      'td-headers-attr': 'Attributo headers TD',
      'th-has-data-cells': 'TH con celle dati',
      'valid-lang': 'Lingua valida',
      'video-caption': 'Didascalia video',
      'video-description': 'Descrizione video'
    };

    return titleTranslations[audit.id] || audit.title || 'Miglioramento';
  }

  getAuditDescription(audit: any): string {
    // Traduci le descrizioni tecniche in linguaggio semplice
    const descriptionTranslations: { [key: string]: string } = {
      'first-contentful-paint': 'Il tempo necessario per visualizzare il primo contenuto della pagina.',
      'largest-contentful-paint': 'Il tempo necessario per caricare l\'elemento più grande visibile.',
      'first-input-delay': 'Il tempo di risposta quando l\'utente interagisce per la prima volta.',
      'cumulative-layout-shift': 'Quanto il layout della pagina si sposta durante il caricamento.',
      'speed-index': 'La velocità con cui il contenuto viene visualizzato.',
      'total-blocking-time': 'Il tempo totale in cui la pagina è bloccata e non risponde.',
      'max-potential-fid': 'Il tempo massimo che potrebbe essere necessario per rispondere a un input.',
      'server-response-time': 'Il tempo necessario al server per rispondere alle richieste.',
      'render-blocking-resources': 'Risorse che impediscono la visualizzazione rapida della pagina.',
      'unused-css-rules': 'Codice CSS che non viene utilizzato e può essere rimosso.',
      'unused-javascript': 'Codice JavaScript che non viene utilizzato e può essere rimosso.',
      'modern-image-formats': 'Utilizzo di formati immagine moderni per ridurre le dimensioni.',
      'efficient-animated-content': 'Animazioni che non rallentano la pagina.',
      'preload-lcp-image': 'Precaricamento dell\'immagine principale per velocizzare il caricamento.',
      'font-display': 'Configurazione corretta per il caricamento dei font.',
      'unminified-css': 'Compressione del codice CSS per ridurre le dimensioni.',
      'unminified-javascript': 'Compressione del codice JavaScript per ridurre le dimensioni.',
      'uses-optimized-images': 'Immagini ottimizzate per ridurre le dimensioni.',
      'uses-text-compression': 'Compressione del testo per velocizzare il caricamento.',
      'uses-responsive-images': 'Immagini che si adattano a diverse dimensioni dello schermo.',
      'total-byte-weight': 'Il peso totale di tutti i file della pagina.',
      'uses-long-cache-ttl': 'Cache configurata per mantenere i file più a lungo.',
      'dom-size': 'Il numero di elementi nella struttura della pagina.',
      'critical-request-chains': 'Le richieste più importanti per il caricamento della pagina.',
      'user-timings': 'Metriche personalizzate per misurare le prestazioni.',
      'bootup-time': 'Il tempo necessario per avviare il JavaScript della pagina.',
      'mainthread-work-breakdown': 'Come viene utilizzato il thread principale del browser.',
      'resource-summary': 'Riepilogo di tutte le risorse caricate.',
      'third-party-summary': 'Riepilogo delle risorse di terze parti.',
      'largest-contentful-paint-element': 'L\'elemento più grande che viene visualizzato.',
      'layout-shift-elements': 'Elementi che causano spostamenti del layout.',
      'long-tasks': 'Attività che bloccano la pagina per troppo tempo.',
      'non-composited-animations': 'Animazioni che potrebbero causare rallentamenti.',
      'unsized-images': 'Immagini senza dimensioni specificate.',
      'uses-rel-preload': 'Precaricamento di risorse importanti.',
      'uses-rel-preconnect': 'Preconnessione a domini esterni.',
      'uses-http2': 'Utilizzo del protocollo HTTP/2 per velocizzare le richieste.',
      'uses-passive-event-listeners': 'Event listener configurati per non bloccare la pagina.',
      'no-document-write': 'Evitare l\'uso di document.write che rallenta la pagina.',
      'external-anchors-use-rel-noopener': 'Link esterni configurati per la sicurezza.',
      'geolocation-on-start': 'Richiesta di geolocalizzazione all\'avvio della pagina.',
      'no-vulnerable-libraries': 'Librerie JavaScript senza vulnerabilità note.',
      'js-libraries': 'Librerie JavaScript utilizzate nella pagina.',
      'notification-on-start': 'Richiesta di notifiche all\'avvio della pagina.',
      'deprecations': 'Funzionalità deprecate che potrebbero non funzionare in futuro.',
      'errors-in-console': 'Errori JavaScript che potrebbero causare problemi.',
      'image-aspect-ratio': 'Proporzioni delle immagini configurate correttamente.',
      'image-size-responsive': 'Dimensioni delle immagini adattate ai dispositivi.',
      'maskable-icons': 'Icone che si adattano a diverse forme.',
      'apple-touch-icon': 'Icona per dispositivi Apple configurata.',
      'content-width': 'Larghezza del contenuto adattata ai dispositivi.',
      'viewport': 'Configurazione del viewport per dispositivi mobili.',
      'document-title': 'Titolo della pagina descrittivo e unico.',
      'meta-description': 'Descrizione della pagina per i motori di ricerca.',
      'link-text': 'Testo dei link descrittivo e comprensibile.',
      'is-crawlable': 'La pagina può essere indicizzata dai motori di ricerca.',
      'robots-txt': 'File robots.txt configurato correttamente.',
      'structured-data': 'Dati strutturati per migliorare la comprensione da parte dei motori di ricerca.',
      'tap-targets': 'Elementi interattivi abbastanza grandi per essere cliccati facilmente.',
      'aria-allowed-attr': 'Attributi ARIA utilizzati correttamente.',
      'aria-hidden-body': 'Elementi nascosti configurati correttamente.',
      'aria-hidden-focus': 'Focus su elementi nascosti gestito correttamente.',
      'aria-input-field-name': 'Campi input con nomi accessibili.',
      'aria-required-attr': 'Attributi ARIA richiesti presenti.',
      'aria-required-children': 'Elementi figli ARIA richiesti presenti.',
      'aria-required-parent': 'Elementi genitori ARIA richiesti presenti.',
      'aria-roles': 'Ruoli ARIA utilizzati correttamente.',
      'aria-valid-attr': 'Attributi ARIA validi.',
      'aria-valid-attr-value': 'Valori degli attributi ARIA validi.',
      'button-name': 'Pulsanti con nomi accessibili.',
      'bypass': 'Meccanismi per saltare contenuti ripetuti.',
      'color-contrast': 'Contrasto sufficiente tra testo e sfondo.',
      'duplicate-id': 'Nessun ID duplicato nella pagina.',
      'form-field-multiple-labels': 'Campi form con etichette appropriate.',
      'frame-title': 'Frame con titoli descrittivi.',
      'heading-order': 'Ordine logico delle intestazioni.',
      'html-has-lang': 'Lingua della pagina specificata.',
      'html-lang-valid': 'Lingua della pagina valida.',
      'image-alt': 'Immagini con testo alternativo descrittivo.',
      'input-image-alt': 'Immagini nei pulsanti con testo alternativo.',
      'label': 'Campi form con etichette appropriate.',
      'link-name': 'Link con testo descrittivo.',
      'list': 'Liste strutturate correttamente.',
      'listitem': 'Elementi di lista utilizzati correttamente.',
      'meta-refresh': 'Meta refresh configurato correttamente.',
      'meta-viewport': 'Meta viewport configurato per dispositivi mobili.',
      'object-alt': 'Oggetti con testo alternativo.',
      'tabindex': 'Indice di tabulazione configurato correttamente.',
      'td-headers-attr': 'Celle tabella con attributi headers.',
      'th-has-data-cells': 'Intestazioni tabella associate a celle dati.',
      'valid-lang': 'Lingua valida specificata.',
      'video-caption': 'Video con didascalie.',
      'video-description': 'Video con descrizioni.'
    };

    return descriptionTranslations[audit.id] || audit.description || 'Miglioramento per ottimizzare le prestazioni del sito.';
  }

  getAuditImpact(audit: any): string {
    if (!audit.score) return '';

    if (audit.score >= 0.9) return 'Basso - Il sito funziona bene in questo aspetto.';
    if (audit.score >= 0.5) return 'Medio - Miglioramenti consigliati per ottimizzare le prestazioni.';
    return 'Alto - Questo aspetto richiede attenzione per migliorare significativamente le prestazioni.';
  }

  getCategoryTips(category: string|null): string {
    const tips: { [key: string]: string } = {
      'performance': 'Per migliorare le prestazioni: ottimizza le immagini, riduci il JavaScript non utilizzato, utilizza la compressione e implementa il caching. Considera l\'uso di CDN per velocizzare il caricamento.',
      'accessibility': 'Per migliorare l\'accessibilità: assicurati che tutti gli elementi abbiano etichette appropriate, usa contrasti sufficienti, fornisci testo alternativo per le immagini e rendi la navigazione accessibile da tastiera.',
      'best-practices': 'Per seguire le best practices: mantieni aggiornate le librerie, usa HTTPS, evita funzionalità deprecate, configura correttamente la sicurezza e ottimizza il codice.',
      'seo': 'Per migliorare il SEO: usa titoli e descrizioni unici, struttura correttamente i contenuti, ottimizza le immagini, migliora la velocità e assicurati che il sito sia mobile-friendly.'
    };
    return tips[category || ''] || 'Continua a monitorare e migliorare regolarmente il tuo sito web.';
  }

  getAuditStatusClass(audit: any): string {
    if (audit.score === 1) return 'audit-passed';
    if (audit.score >= 0.5) return 'audit-improvable';
    return 'audit-failed';
  }

  getAuditStatusIcon(audit: any): string {
    if (audit.score === 1) return 'fa-check-circle text-success';
    if (audit.score >= 0.5) return 'fa-exclamation-triangle text-warning';
    return 'fa-times-circle text-danger';
  }

  getAuditStatusLabel(audit: any): string {
    if (audit.score === 1) return 'Superato';
    if (audit.score >= 0.5) return 'Migliorabile';
    return 'Non superato';
  }

  // Metodi per il tooltip della heatmap
  showHeatmapTooltip(idx: number, event: MouseEvent) {
    // Usa direttamente l'indice del riquadro su cui è passato il mouse
    // Questo è più affidabile perché ogni riquadro ha il proprio evento
    this.activeHeatmapTooltip = idx;

    // Calcola la posizione del tooltip
    const tooltipWidth = 320; // Larghezza del tooltip
    const tooltipHeight = 120; // Altezza approssimativa del tooltip

    let x = event.clientX + 10;
    let y = event.clientY - tooltipHeight - 10;

    // Assicurati che il tooltip non esca dalla finestra
    if (x + tooltipWidth > window.innerWidth) {
      x = event.clientX - tooltipWidth - 10;
    }
    if (y < 0) {
      y = event.clientY + 10;
    }

    this.tooltipPosition = { x, y };
  }

  hideHeatmapTooltip() {
    this.activeHeatmapTooltip = null;
  }

  getActiveTooltipImpact(): string {
    if (this.activeHeatmapTooltip === null || !this.scanResults?.heatmapData) {
      return '';
    }
    const point = this.scanResults.heatmapData[this.activeHeatmapTooltip];
    return point?.impact || '';
  }

  getActiveTooltipDescription(): string {
    if (this.activeHeatmapTooltip === null || !this.scanResults?.heatmapData) {
      return '';
    }
    const point = this.scanResults.heatmapData[this.activeHeatmapTooltip];
    return point?.description || 'Errore di accessibilità';
  }

  getActiveTooltipElement(): string {
    if (this.activeHeatmapTooltip === null || !this.scanResults?.heatmapData) {
      return '';
    }
    const point = this.scanResults.heatmapData[this.activeHeatmapTooltip];
    if (point?.target) {
      return this.formatElementPath(point.target);
    }
    return '';
  }

  // Metodo helper per ottenere le coordinate scalate di un punto
  private getScaledRect(point: any) {
    return {
      left: this.getScaledLeft(point),
      top: this.getScaledTop(point),
      width: this.getScaledWidth(point),
      height: this.getScaledHeight(point)
    };
  }

  // Calcola z-index basato sull'area del riquadro (più piccolo = z-index più alto)
  getHeatmapZIndex(point: any): number {
    if (!point) return 1;
    const area = point.width * point.height;
    // Inverti l'area per avere z-index più alti per aree più piccole
    // Usa una formula che mantiene valori positivi
    return Math.max(1, 1000 - Math.floor(area / 100));
  }

  getAxeAIExplanation(v: Violation) {
    if (!v.aiExplanation || v.aiExplanation === 'Caricamento spiegazione...') {
      v.aiExplanation = 'Caricamento spiegazione...';
      const testo = v.translatedDescription || v.description || v.id;
      this.geminiService.interpretAxe(testo).subscribe({
        next: (res: { summary: string }) => v.aiExplanation = res.summary || 'Spiegazione non disponibile.',
        error: (err: any) => v.aiExplanation = 'Errore nella spiegazione AI.'
      });
    }
  }

  getAuditAIExplanation(audit: any) {
    if (!audit.aiExplanation || audit.aiExplanation === 'Caricamento spiegazione...') {
      audit.aiExplanation = 'Caricamento spiegazione...';
      const testo = this.getAuditDescription(audit) || audit.description || audit.id;
      this.geminiService.interpretAxe(testo).subscribe({
        next: (res: { summary: string }) => audit.aiExplanation = res.summary || 'Spiegazione non disponibile.',
        error: (err: any) => audit.aiExplanation = 'Errore nella spiegazione AI.'
      });
    }
  }

  downloadPdfReport() {
    if (!this.scanResults) return;
    this.http.post('http://localhost:3001/download-report/pdf', { results: this.scanResults }, { responseType: 'blob' })
      .subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'report.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  downloadCsvReport() {
    if (!this.scanResults) return;
    this.http.post('http://localhost:3001/download-report/csv', { results: this.scanResults }, { responseType: 'blob' })
      .subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'report.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }
}
