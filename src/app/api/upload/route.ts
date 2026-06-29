import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { imageBase64, mimeType, name } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    const ext = mimeType?.split('/')[1] || 'png';
    const sanitizedName = (name || 'image').replace(/\.[^.]+$/, '');

    const filename = `uploads/${Date.now()}-${sanitizedName}.${ext}`;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(process.cwd(), 'public', filename);

    const buffer = Buffer.from(imageBase64, 'base64');

    fs.writeFileSync(filepath, buffer);

    const project = await db.project.create({
      data: {
        name: name || 'Untitled Project',
        imageUrl: filename,
        status: 'uploaded',
      },
    });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        imageUrl: project.imageUrl,
        status: project.status,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        error: 'Failed to upload image',
      },
      {
        status: 500,
      }
    );
  }
}