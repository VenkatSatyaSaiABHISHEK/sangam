import { generateQRCodeDataUrl } from './qr-generator';

export interface WatermarkMetadata {
  photoId: string;
  eventName?: string;
  userName: string;
  teamName?: string;
  mentorName?: string;
  timestamp: string;
  locationName?: string;
  verificationUrl: string;
}

export async function createBrandedImageCanvas(
  imageSource: HTMLImageElement | ImageBitmap,
  meta: WatermarkMetadata
): Promise<string> {
  const qrDataUrl = await generateQRCodeDataUrl(meta.verificationUrl);

  return new Promise((resolve, reject) => {
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      const origWidth = imageSource.width;
      const origHeight = imageSource.height;

      // Bottom banner height scaled to image aspect ratio (min 120px)
      const bannerHeight = Math.max(120, Math.round(origHeight * 0.16));
      const totalHeight = origHeight + bannerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = origWidth;
      canvas.height = totalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not obtain canvas 2D context'));
        return;
      }

      // Draw original image on top
      ctx.drawImage(imageSource, 0, 0, origWidth, origHeight);

      // Draw clean monochrome bottom strip
      ctx.fillStyle = '#0a0a0a'; // Dark solid strip
      ctx.fillRect(0, origHeight, origWidth, bannerHeight);

      // Top dividing hairline
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = Math.max(1, Math.round(origWidth / 1000));
      ctx.beginPath();
      ctx.moveTo(0, origHeight);
      ctx.lineTo(origWidth, origHeight);
      ctx.stroke();

      // Sizing variables based on banner height
      const padding = Math.round(bannerHeight * 0.12);
      const qrSize = bannerHeight - padding * 2;
      const textX = padding * 1.5;
      const fontSizeLarge = Math.max(14, Math.round(bannerHeight * 0.20));
      const fontSizeMedium = Math.max(11, Math.round(bannerHeight * 0.15));
      const fontSizeSmall = Math.max(9, Math.round(bannerHeight * 0.12));

      // Draw QR Code on right side
      const qrX = origWidth - qrSize - padding * 1.5;
      const qrY = origHeight + padding;

      // White background tile for QR code
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Left Column - Text Details
      let currentY = origHeight + padding + fontSizeLarge;

      // Line 1: EVENT • TEAM • USER
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSizeLarge}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const titleParts = [
        meta.eventName || 'SUMMIT 2027',
        meta.teamName ? meta.teamName.toUpperCase() : null,
        meta.userName.toUpperCase(),
      ].filter(Boolean);
      ctx.fillText(titleParts.join('  •  '), textX, currentY);

      // Line 2: Mentor & Location
      currentY += fontSizeMedium * 1.5;
      ctx.fillStyle = '#a1a1aa';
      ctx.font = `normal ${fontSizeMedium}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const subtitleParts = [
        meta.mentorName ? `Mentor: ${meta.mentorName}` : null,
        meta.locationName ? `Venue: ${meta.locationName}` : 'Venue: Sangam Pavilion',
      ].filter(Boolean);
      ctx.fillText(subtitleParts.join('  |  '), textX, currentY);

      // Line 3: Timestamp • Photo ID • Verified Badge
      currentY += fontSizeSmall * 1.6;
      ctx.fillStyle = '#71717a';
      ctx.font = `500 ${fontSizeSmall}px monospace`;
      const metaParts = [
        meta.timestamp,
        meta.photoId,
        'VERIFIED SUMMIT ASSET [SCAN QR]',
      ];
      ctx.fillText(metaParts.join('  •  '), textX, currentY);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    qrImg.onerror = (err) => {
      reject(err);
    };

    qrImg.src = qrDataUrl;
  });
}
