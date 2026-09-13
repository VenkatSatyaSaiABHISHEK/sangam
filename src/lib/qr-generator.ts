import QRCode from 'qrcode';

export async function generateQRCodeDataUrl(urlOrText: string): Promise<string> {
  try {
    return await QRCode.toDataURL(urlOrText, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR data URL:', err);
    throw err;
  }
}

export async function generateQRCodeSvg(urlOrText: string): Promise<string> {
  try {
    return await QRCode.toString(urlOrText, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR SVG:', err);
    throw err;
  }
}
