import jsPDF from 'jspdf';
import { CertificateConfig, DEFAULT_CERTIFICATE_CONFIG, getSavedCertificateConfig } from '../config/certificateConfig';

const TEMPLATE_URL = '/assets/certificates/certificate_template_2x.png';
const FALLBACK_TEMPLATE_URL = '/assets/certificates/certificate_template.png';

// In-memory cache for the loaded HTMLImageElement
let cachedTemplateImage: HTMLImageElement | null = null;

/**
 * Sanitizes participant name for clean, safe PDF filename
 * Output format: Certificate_<Participant_Name>.pdf
 */
export function sanitizeCertificateFilename(name: string): string {
  const cleanName = (name || 'Participant')
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special symbols that are invalid in filenames
    .trim()
    .replace(/\s+/g, '_');    // convert spaces to underscores

  return `Certificate_${cleanName || 'Participant'}.pdf`;
}

/**
 * Loads and caches the certificate template image
 */
export async function loadTemplateImage(): Promise<HTMLImageElement> {
  if (cachedTemplateImage && cachedTemplateImage.complete && cachedTemplateImage.naturalWidth > 0) {
    return cachedTemplateImage;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      cachedTemplateImage = img;
      resolve(img);
    };

    img.onerror = () => {
      // Fallback to standard 1x template if 2x fails
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => {
        cachedTemplateImage = fallbackImg;
        resolve(fallbackImg);
      };
      fallbackImg.onerror = (e) => reject(new Error('Failed to load certificate template image: ' + e));
      fallbackImg.src = FALLBACK_TEMPLATE_URL;
    };

    img.src = TEMPLATE_URL;
  });
}

/**
 * Ensures web fonts are fully loaded before rendering to canvas
 */
export async function ensureFontLoaded(fontFamily: string): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
      // Also specifically check the family
      const cleanFontName = fontFamily.replace(/['",]/g, ' ').trim().split(' ')[0];
      if (cleanFontName) {
        await document.fonts.load(`48px "${cleanFontName}"`);
      }
    } catch (_) {
      // Font loading failure fallback to system fonts gracefully
    }
  }
}

/**
 * Renders the certificate with dynamic participant name onto the provided HTMLCanvasElement
 */
export async function renderCertificateToCanvas(
  participantName: string,
  config: CertificateConfig = getSavedCertificateConfig(),
  targetCanvas: HTMLCanvasElement
): Promise<void> {
  const img = await loadTemplateImage();
  await ensureFontLoaded(config.fontFamily);

  // Set internal resolution to match high-resolution template
  const width = img.naturalWidth || 2048;
  const height = img.naturalHeight || 1446;

  targetCanvas.width = width;
  targetCanvas.height = height;

  const ctx = targetCanvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not obtain 2D canvas context');

  // 1. Draw base certificate artwork (preserves exact logos, borders, text, background)
  ctx.drawImage(img, 0, 0, width, height);

  // 2. Prepare dynamic participant name
  let name = (participantName || 'Participant Name').trim();
  if (config.uppercase) {
    name = name.toUpperCase();
  }

  // Scale font metrics from 1024-base coordinate space to actual canvas width
  const scale = width / 1024;
  let targetFontSize = config.fontSize * scale;
  const maxAllowedWidth = width * (config.maxWidthPercent / 100);

  // Setup initial font style
  ctx.save();
  ctx.textAlign = config.textAlign;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = config.fontColor;

  ctx.font = `${config.fontWeight} ${targetFontSize}px ${config.fontFamily}`;

  // 3. Dynamic Auto-scaling for long names
  let textWidth = ctx.measureText(name).width;

  if (textWidth > maxAllowedWidth) {
    // Proportional downscale
    const downscaleRatio = maxAllowedWidth / textWidth;
    targetFontSize = Math.max(targetFontSize * downscaleRatio, 28 * scale);
    ctx.font = `${config.fontWeight} ${targetFontSize}px ${config.fontFamily}`;
    textWidth = ctx.measureText(name).width;
  }

  // 4. Calculate exact position
  const xPos = (config.xPercent / 100) * width;
  const yPos = (config.yPercent / 100) * height;

  // 5. Render name
  // If name still exceeds max allowed width after maximum reasonable downscaling, split into 2 lines
  if (textWidth > maxAllowedWidth && name.includes(' ')) {
    const words = name.split(' ');
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');

    const lineGap = targetFontSize * 0.9;
    ctx.fillText(line1, xPos, yPos - lineGap * 0.45);
    ctx.fillText(line2, xPos, yPos + lineGap * 0.55);
  } else {
    ctx.fillText(name, xPos, yPos);
  }

  ctx.restore();
}

/**
 * Generates an A4 Landscape jsPDF document for a single participant
 */
export async function generateCertificatePdf(
  participantName: string,
  config: CertificateConfig = getSavedCertificateConfig()
): Promise<jsPDF> {
  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  await renderCertificateToCanvas(participantName, config, canvas);

  // Generate A4 Landscape PDF (297 mm x 210 mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const imgData = canvas.toDataURL('image/png', 0.98);
  doc.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');

  return doc;
}

/**
 * Downloads a single personalized certificate PDF directly
 */
export async function downloadCertificatePdf(
  participantName: string,
  config: CertificateConfig = getSavedCertificateConfig()
): Promise<void> {
  const doc = await generateCertificatePdf(participantName, config);
  const filename = sanitizeCertificateFilename(participantName);
  doc.save(filename);
}

/**
 * Generates a consolidated multi-page A4 Landscape PDF for all selected participants
 */
export async function generateBulkCertificatesPdf(
  participants: { name: string; email?: string }[],
  config: CertificateConfig = getSavedCertificateConfig(),
  onProgress?: (current: number, total: number, currentName: string) => void
): Promise<void> {
  if (participants.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const canvas = document.createElement('canvas');

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const name = p.name || 'Participant';

    if (onProgress) {
      onProgress(i + 1, participants.length, name);
    }

    // Re-render canvas for participant
    await renderCertificateToCanvas(name, config, canvas);
    const imgData = canvas.toDataURL('image/png', 0.95);

    if (i > 0) {
      doc.addPage('a4', 'landscape');
    }

    doc.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');

    // Give browser event loop a breath for UI responsiveness
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`Lakshya_2.0_Participation_Certificates_Batch_${timestamp}.pdf`);
}
