export interface CertificateConfig {
  xPercent: number;
  yPercent: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
  fontColor: string;
  textAlign: 'center' | 'left' | 'right';
  maxWidthPercent: number;
  uppercase: boolean;
}

export const AVAILABLE_FONTS = [
  { id: 'Alex Brush', label: 'Alex Brush (Calligraphic Script - Canva match)', family: "'Alex Brush', cursive" },
  { id: 'Great Vibes', label: 'Great Vibes (Flowing Script)', family: "'Great Vibes', cursive" },
  { id: 'Playfair Display', label: 'Playfair Display (Classic Serif)', family: "'Playfair Display', serif" },
  { id: 'Cinzel', label: 'Cinzel (Regal Roman Serif)', family: "'Cinzel', serif" },
  { id: 'Georgia', label: 'Georgia (Standard Serif)', family: "Georgia, serif" },
  { id: 'Helvetica', label: 'Helvetica / Sans-Serif (Modern)', family: "Helvetica, Arial, sans-serif" },
];

export const DEFAULT_CERTIFICATE_CONFIG: CertificateConfig = {
  xPercent: 50,
  yPercent: 51.5,
  fontFamily: "'Alex Brush', cursive",
  fontSize: 52,
  fontWeight: 'normal',
  fontColor: '#113459',
  textAlign: 'center',
  maxWidthPercent: 68,
  uppercase: false,
};

const STORAGE_KEY = 'lakshya_certificate_config_v2';

export function getSavedCertificateConfig(): CertificateConfig {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      return { ...DEFAULT_CERTIFICATE_CONFIG, ...JSON.parse(saved) };
    }
  } catch (_) {}
  return { ...DEFAULT_CERTIFICATE_CONFIG };
}

export function saveCertificateConfig(config: CertificateConfig): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  } catch (_) {}
}

export function resetCertificateConfig(): CertificateConfig {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) {}
  return { ...DEFAULT_CERTIFICATE_CONFIG };
}
