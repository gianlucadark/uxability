import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private impactTranslations: { [key: string]: string } = {
    'critical': 'Critico',
    'serious': 'Serio',
    'moderate': 'Moderato',
    'minor': 'Minore'
  };

  private commonViolationTranslations: { [key: string]: { description: string, solution: string } } = {
    'color-contrast': {
      description: 'Contrasto dei colori insufficiente',
      solution: 'Aumentare il contrasto tra il testo e lo sfondo per migliorare la leggibilità.'
    },
    'aria-required-children': {
      description: 'Elementi ARIA figlio mancanti',
      solution: 'Aggiungere gli elementi figlio richiesti per il ruolo ARIA specificato.'
    },
    'aria-required-parent': {
      description: 'Elemento ARIA padre mancante',
      solution: 'Aggiungere l\'elemento padre richiesto per il ruolo ARIA specificato.'
    },
    'button-name': {
      description: 'Pulsante senza nome accessibile',
      solution: 'Aggiungere un testo o un\'etichetta ARIA al pulsante.'
    },
    'image-alt': {
      description: 'Immagine senza testo alternativo',
      solution: 'Aggiungere un attributo alt descrittivo all\'immagine.'
    },
    'label': {
      description: 'Campo del modulo senza etichetta',
      solution: 'Aggiungere un\'etichetta associata al campo del modulo.'
    },
    'link-name': {
      description: 'Link senza testo',
      solution: 'Aggiungere un testo descrittivo al link.'
    }
  };

  // Mappa tra violationId e riferimenti WCAG
  private wcagReferences: { [key: string]: string[] } = {
    'color-contrast': ['1.4.3'],
    'button-name': ['4.1.2'],
    'image-alt': ['1.1.1'],
    'label': ['1.3.1'],
    'link-name': ['2.4.4', '4.1.2'],
    'aria-required-children': ['1.3.1'],
    'aria-required-parent': ['1.3.1']
  };

  translateImpact(impact: string): string {
    return this.impactTranslations[impact.toLowerCase()] || impact;
  }

  translateViolation(violationId: string, originalDescription: string): { description: string, solution: string } {
    const translation = this.commonViolationTranslations[violationId];
    if (translation) {
      return translation;
    }
    return {
      description: originalDescription,
      solution: 'Consultare le linee guida WCAG per maggiori dettagli.'
    };
  }

  formatElementPath(target: string): string {
    // Semplifica il selettore CSS per renderlo più leggibile
    return target
      .replace(/nth-child\((\d+)\)/g, 'elemento $1')
      .replace(/>/g, '→')
      .replace(/\./g, ' ')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  translateFailureSummary(summary: string): { message: string, technical: string } {
    let translatedMessage = '';
    let technicalDetails = '';

    // Gestione specifica per i problemi di contrasto
    if (summary.includes('color contrast')) {
      const contrastMatch = summary.match(/contrast of ([\d.]+)/);
      const colorMatch = summary.match(/foreground color: (#[A-Fa-f0-9]{6}), background color: (#[A-Fa-f0-9]{6})/);
      const fontMatch = summary.match(/font size: ([\d.]+)pt \(([\d.]+)px\)/);

      if (contrastMatch && colorMatch && fontMatch) {
        const contrast = parseFloat(contrastMatch[1]);
        const foreground = colorMatch[1];
        const background = colorMatch[2];
        const fontSizePx = fontMatch[2];

        translatedMessage = `Il testo non è sufficientemente leggibile a causa di un contrasto troppo basso (${contrast.toFixed(2)}:1 invece del minimo richiesto 4.5:1)`;
        technicalDetails = `Dettagli tecnici:
• Colore testo: ${foreground}
• Colore sfondo: ${background}
• Dimensione testo: ${fontSizePx}px
• Contrasto attuale: ${contrast.toFixed(2)}:1
• Contrasto minimo richiesto: 4.5:1`;
      }
    } else {
      // Traduzioni comuni per i messaggi di errore
      let translated = summary
        .replace('Fix any of the following:', 'Correggere uno dei seguenti problemi:')
        .replace('Fix all of the following:', 'Correggere tutti i seguenti problemi:')
        .replace('Element must have', 'L\'elemento deve avere')
        .replace('Element should have', 'L\'elemento dovrebbe avere')
        .replace('aria-label', 'un\'etichetta ARIA')
        .replace('text that is visible to screen readers', 'un testo visibile agli screen reader')
        .replace('visible text', 'un testo visibile')
        .replace('role', 'un ruolo')
        .replace('aria-labelledby', 'un riferimento aria-labelledby')
        .replace('unique id', 'un ID univoco')
        .replace('tabindex', 'un indice di tabulazione');

      translatedMessage = translated;
      technicalDetails = summary;
    }

    return { message: translatedMessage, technical: technicalDetails };
  }

  getViolationExplanation(violationType: string): string {
    const explanations: { [key: string]: string } = {
      'color-contrast': 'Un buon contrasto di colori è fondamentale per garantire che tutti gli utenti, inclusi quelli con problemi di vista, possano leggere facilmente il contenuto del sito.',
      'aria-required-children': 'Gli elementi ARIA aiutano gli screen reader a comprendere la struttura della pagina. Alcuni elementi ARIA richiedono specifici elementi figli per funzionare correttamente.',
      'button-name': 'I pulsanti devono avere un testo descrittivo per permettere agli utenti di screen reader di capire la loro funzione.',
      'image-alt': 'Le immagini devono avere un testo alternativo per essere accessibili agli utenti che utilizzano screen reader o che non possono visualizzarle.',
      'label': 'I campi dei moduli devono avere etichette chiare per aiutare gli utenti a capire quali informazioni inserire.',
      'link-name': 'I link devono avere un testo descrittivo per permettere agli utenti di capire dove li porterà il link.'
    };

    return explanations[violationType] || 'Questa violazione influisce sull\'accessibilità del sito web.';
  }

  getWcagReferences(violationId: string): string[] {
    return this.wcagReferences[violationId] || [];
  }
}
