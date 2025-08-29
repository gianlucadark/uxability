import { Injectable } from '@angular/core';

export interface RustScanResult {
  has_title: boolean;
  has_meta_description: boolean;
  has_lang: boolean;
  h1_count: number;
  img_missing_alt: number;
  weak_links: number;
  inputs_without_label: number;
  has_main_or_nav: boolean;
  has_duplicate_title: boolean;
  images_without_lazy: number;
  low_contrast_count: number;
  inaccessible_form_fields: number;
  has_viewport: boolean;
  has_canonical: boolean;
  blocking_scripts: number;
  heavy_images: number;
}

@Injectable({ providedIn: 'root' })
export class RustWasmService {
  private wasmLoaded = false;
  private module: any;

  async initWasm() {
    if (!this.wasmLoaded) {
      const module = await import('../../assets/rust_audit/rust_audit.js');
      await module.default('/assets/rust_audit/rust_audit_bg.wasm');
      this.module = module;
      this.wasmLoaded = true;
    }
  }

  async scanHtml(html: string): Promise<RustScanResult | null> {
    if (!this.wasmLoaded) {
      await this.initWasm();
    }
    if (this.module?.scan_html) {
      return this.module.scan_html(html) as RustScanResult;
    }
    return null;
  }
}
