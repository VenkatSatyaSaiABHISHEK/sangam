import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const apkPath = path.join(process.cwd(), 'public', 'downloads', 'sangamconnect.apk');

    if (fs.existsSync(apkPath)) {
      const fileBuffer = fs.readFileSync(apkPath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="sangamconnect.apk"',
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    // If pre-compiled APK is not placed in public/downloads yet, do NOT redirect to HTML which creates corrupt APK
    return NextResponse.json(
      {
        success: false,
        error: 'APK package not pre-compiled on server. Please use the 1-Tap Home Screen installation which works immediately on all Android & iOS devices.',
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('Error serving APK:', err);
    return NextResponse.json(
      {
        error: 'APK package unavailable. Use the 1-Tap Home Screen installation.',
      },
      { status: 500 }
    );
  }
}
