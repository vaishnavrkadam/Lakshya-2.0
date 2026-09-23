import { getDocRef, getDoc, setDoc, onSnapshot } from '../lib/firebase';

export interface TextElementConfig {
  xPercent: number;
  yPercent: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
  fontColor: string;
  textAlign: 'center' | 'left' | 'right';
  maxWidthPercent: number;
  uppercase: boolean;
  letterSpacing?: number;
}

export interface CertificateConfig {
  name: TextElementConfig;
  usn: TextElementConfig;

  // Backward-compatibility legacy fields mirroring `name`
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
  { id: 'Pinyon Script', label: 'Pinyon Script (Canva Exact Match Script)', family: "'Pinyon Script', cursive" },
  { id: 'Alex Brush', label: 'Alex Brush (Calligraphic Script)', family: "'Alex Brush', cursive" },
  { id: 'Great Vibes', label: 'Great Vibes (Flowing Script)', family: "'Great Vibes', cursive" },
  { id: 'Playfair Display', label: 'Playfair Display (Official Certificate Serif)', family: "'Playfair Display', serif" },
  { id: 'Cinzel', label: 'Cinzel (Roman Imperial Serif)', family: "'Cinzel', serif" },
  { id: 'Georgia', label: 'Georgia (Standard Serif)', family: "Georgia, serif" },
  { id: 'JetBrains Mono', label: 'JetBrains Mono (Technical Monospace)', family: "'JetBrains Mono', monospace" },
  { id: 'Helvetica', label: 'Helvetica / Sans-Serif (Modern)', family: "Helvetica, Arial, sans-serif" },
];

export const AVAILABLE_USN_FONTS = [
  { id: 'Playfair Display', label: 'Playfair Display (Certificate Serif Match)', family: "'Playfair Display', serif" },
  { id: 'Cinzel', label: 'Cinzel (Roman Imperial Serif)', family: "'Cinzel', serif" },
  { id: 'Georgia', label: 'Georgia (Standard Serif)', family: "Georgia, serif" },
  { id: 'JetBrains Mono', label: 'JetBrains Mono (Technical Monospace)', family: "'JetBrains Mono', monospace" },
  { id: 'Helvetica', label: 'Helvetica / Sans-Serif', family: "Helvetica, Arial, sans-serif" },
];

export const DEFAULT_CERTIFICATE_CONFIG: CertificateConfig = {
  name: {
    xPercent: 50.0,
    yPercent: 47.4,
    fontFamily: "'Pinyon Script', cursive",
    fontSize: 54,
    fontWeight: 'normal',
    fontColor: '#A47038',
    textAlign: 'center',
    maxWidthPercent: 68,
    uppercase: false,
    letterSpacing: 0,
  },
  usn: {
    xPercent: 29.1,
    yPercent: 53.5,
    fontFamily: "'Playfair Display', serif",
    fontSize: 16,
    fontWeight: 'bold',
    fontColor: '#0C3C68',
    textAlign: 'center',
    maxWidthPercent: 18,
    uppercase: true,
    letterSpacing: 0.5,
  },
  // Legacy top-level fields
  xPercent: 50.0,
  yPercent: 47.4,
  fontFamily: "'Pinyon Script', cursive",
  fontSize: 54,
  fontWeight: 'normal',
  fontColor: '#A47038',
  textAlign: 'center',
  maxWidthPercent: 68,
  uppercase: false,
};

const STORAGE_KEY = 'lakshya_certificate_config_v3';
const FIRESTORE_COLLECTION = 'system_settings';
const FIRESTORE_DOC = 'certificate_config';

/**
 * Normalizes any loaded or legacy config to guarantee valid name and usn objects
 */
export function normalizeCertificateConfig(raw: any): CertificateConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CERTIFICATE_CONFIG };
  }

  // Check if name is nested or flat
  const nameConfig: TextElementConfig = {
    xPercent: typeof raw.name?.xPercent === 'number' ? raw.name.xPercent : (typeof raw.xPercent === 'number' ? raw.xPercent : DEFAULT_CERTIFICATE_CONFIG.name.xPercent),
    yPercent: typeof raw.name?.yPercent === 'number' ? raw.name.yPercent : (typeof raw.yPercent === 'number' ? raw.yPercent : DEFAULT_CERTIFICATE_CONFIG.name.yPercent),
    fontFamily: raw.name?.fontFamily || raw.fontFamily || DEFAULT_CERTIFICATE_CONFIG.name.fontFamily,
    fontSize: typeof raw.name?.fontSize === 'number' ? raw.name.fontSize : (typeof raw.fontSize === 'number' ? raw.fontSize : DEFAULT_CERTIFICATE_CONFIG.name.fontSize),
    fontWeight: raw.name?.fontWeight || raw.fontWeight || DEFAULT_CERTIFICATE_CONFIG.name.fontWeight,
    fontColor: raw.name?.fontColor || (raw.fontColor && raw.fontColor !== '#113459' ? raw.fontColor : DEFAULT_CERTIFICATE_CONFIG.name.fontColor),
    textAlign: raw.name?.textAlign || raw.textAlign || DEFAULT_CERTIFICATE_CONFIG.name.textAlign,
    maxWidthPercent: typeof raw.name?.maxWidthPercent === 'number' ? raw.name.maxWidthPercent : (typeof raw.maxWidthPercent === 'number' ? raw.maxWidthPercent : DEFAULT_CERTIFICATE_CONFIG.name.maxWidthPercent),
    uppercase: typeof raw.name?.uppercase === 'boolean' ? raw.name.uppercase : (typeof raw.uppercase === 'boolean' ? raw.uppercase : DEFAULT_CERTIFICATE_CONFIG.name.uppercase),
    letterSpacing: typeof raw.name?.letterSpacing === 'number' ? raw.name.letterSpacing : 0,
  };

  const usnConfig: TextElementConfig = {
    xPercent: typeof raw.usn?.xPercent === 'number' ? raw.usn.xPercent : DEFAULT_CERTIFICATE_CONFIG.usn.xPercent,
    yPercent: typeof raw.usn?.yPercent === 'number' ? raw.usn.yPercent : DEFAULT_CERTIFICATE_CONFIG.usn.yPercent,
    fontFamily: raw.usn?.fontFamily || DEFAULT_CERTIFICATE_CONFIG.usn.fontFamily,
    fontSize: typeof raw.usn?.fontSize === 'number' ? raw.usn.fontSize : DEFAULT_CERTIFICATE_CONFIG.usn.fontSize,
    fontWeight: raw.usn?.fontWeight || DEFAULT_CERTIFICATE_CONFIG.usn.fontWeight,
    fontColor: raw.usn?.fontColor || DEFAULT_CERTIFICATE_CONFIG.usn.fontColor,
    textAlign: raw.usn?.textAlign || DEFAULT_CERTIFICATE_CONFIG.usn.textAlign,
    maxWidthPercent: typeof raw.usn?.maxWidthPercent === 'number' ? raw.usn.maxWidthPercent : DEFAULT_CERTIFICATE_CONFIG.usn.maxWidthPercent,
    uppercase: typeof raw.usn?.uppercase === 'boolean' ? raw.usn.uppercase : DEFAULT_CERTIFICATE_CONFIG.usn.uppercase,
    letterSpacing: typeof raw.usn?.letterSpacing === 'number' ? raw.usn.letterSpacing : DEFAULT_CERTIFICATE_CONFIG.usn.letterSpacing,
  };

  return {
    name: nameConfig,
    usn: usnConfig,
    // Mirror name fields at root
    xPercent: nameConfig.xPercent,
    yPercent: nameConfig.yPercent,
    fontFamily: nameConfig.fontFamily,
    fontSize: nameConfig.fontSize,
    fontWeight: nameConfig.fontWeight,
    fontColor: nameConfig.fontColor,
    textAlign: nameConfig.textAlign,
    maxWidthPercent: nameConfig.maxWidthPercent,
    uppercase: nameConfig.uppercase,
  };
}

let inMemoryConfig: CertificateConfig | null = null;

export function getSavedCertificateConfig(): CertificateConfig {
  if (inMemoryConfig) return inMemoryConfig;

  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      inMemoryConfig = normalizeCertificateConfig(parsed);
      return inMemoryConfig;
    }
  } catch (_) {}

  inMemoryConfig = { ...DEFAULT_CERTIFICATE_CONFIG };
  return inMemoryConfig;
}

export function saveCertificateConfig(config: CertificateConfig): void {
  const normalized = normalizeCertificateConfig(config);
  inMemoryConfig = normalized;

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch (_) {}

  // Also sync asynchronously to Firestore system_settings
  saveCertificateConfigToRemote(normalized).catch((err) => {
    console.warn('Failed to sync certificate config to Firestore:', err);
  });
}

export async function saveCertificateConfigToRemote(config: CertificateConfig): Promise<void> {
  const docRef = getDocRef(FIRESTORE_COLLECTION, FIRESTORE_DOC);
  await setDoc(docRef, {
    name: config.name,
    usn: config.usn,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function loadRemoteCertificateConfig(): Promise<CertificateConfig> {
  try {
    const docRef = getDocRef(FIRESTORE_COLLECTION, FIRESTORE_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const normalized = normalizeCertificateConfig(data);
      inMemoryConfig = normalized;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    }
  } catch (err) {
    console.warn('Failed to load certificate config from Firestore:', err);
  }
  return getSavedCertificateConfig();
}

export function subscribeCertificateConfig(onUpdate: (config: CertificateConfig) => void): () => void {
  try {
    const docRef = getDocRef(FIRESTORE_COLLECTION, FIRESTORE_DOC);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const normalized = normalizeCertificateConfig(data);
        inMemoryConfig = normalized;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        }
        onUpdate(normalized);
      }
    }, (err) => {
      console.warn('Error subscribing to certificate config:', err);
    });
  } catch (e) {
    console.warn('Could not set up subscription to certificate config:', e);
    return () => {};
  }
}

export function resetCertificateConfig(): CertificateConfig {
  inMemoryConfig = { ...DEFAULT_CERTIFICATE_CONFIG };
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) {}
  return { ...DEFAULT_CERTIFICATE_CONFIG };
}
