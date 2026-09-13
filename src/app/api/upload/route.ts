import { NextRequest, NextResponse } from 'next/server';
import { uploadDocumentFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Size limit: 100MB
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 100MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadDocumentFile(buffer, file.name, file.type);

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: file.name,
      sizeBytes: result.sizeBytes,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
