import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeScene } from '@/lib/agents/scene-understanding';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  let projectId: string | undefined;
  try {
    const body = await request.json();
    projectId = body.projectId;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Read the project
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update status to analyzing
    await db.project.update({
      where: { id: projectId },
      data: { status: 'analyzing' },
    });

    // Read the image file and convert to base64 data URL
    const imagePath = path.join(process.cwd(), 'public', project.imageUrl);
    
    if (!fs.existsSync(imagePath)) {
      await db.project.update({ where: { id: projectId }, data: { status: 'uploaded' } });
      return NextResponse.json(
        { error: 'Image file not found on server. Please re-upload.' },
        { status: 400 }
      );
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Determine MIME type from file extension
    const ext = path.extname(project.imageUrl).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const mimeType = mimeMap[ext] || 'image/png';
    const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

    // Call the scene analysis agent
    const analysisResult = await analyzeScene(imageDataUrl);

    // Save the analysis to the database
    const sceneAnalysis = await db.sceneAnalysis.create({
      data: {
        projectId,
        headline: analysisResult.sceneGraph.headline?.text || null,
        subheadline: analysisResult.sceneGraph.subheadline?.text || null,
        cta: analysisResult.sceneGraph.cta?.text || null,
        logo: analysisResult.sceneGraph.logo ? JSON.stringify(analysisResult.sceneGraph.logo) : null,
        layers: JSON.stringify(analysisResult.sceneGraph.layers),
        hierarchy: JSON.stringify(analysisResult.sceneGraph.hierarchy),
        sceneGraph: JSON.stringify(analysisResult.sceneGraph),
        brandColors: JSON.stringify(analysisResult.sceneGraph.brandColors),
        typography: JSON.stringify(analysisResult.sceneGraph.typography),
        layout: JSON.stringify(analysisResult.sceneGraph.layout),
        rawAnalysis: analysisResult.rawAnalysis,
      },
    });

    // Update project status to analyzed
    await db.project.update({
      where: { id: projectId },
      data: { status: 'analyzed' },
    });

    return NextResponse.json({
      sceneAnalysis: {
        id: sceneAnalysis.id,
        sceneGraph: analysisResult.sceneGraph,
        rawAnalysis: analysisResult.rawAnalysis,
      },
    });
  } catch (error) {
    console.error('Analyze error:', error);
    
    // Try to update status back on failure - use the projectId we already extracted
    if (projectId) {
      try {
        await db.project.update({
          where: { id: projectId },
          data: { status: 'uploaded' },
        });
      } catch (dbError) {
        console.error('Failed to reset project status:', dbError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze scene';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
