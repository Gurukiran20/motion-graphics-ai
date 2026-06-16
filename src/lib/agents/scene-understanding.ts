import ZAI from 'z-ai-web-dev-sdk';
import type { SceneGraph, SceneAnalysisResult, LayerInfo } from '@/lib/types';

let zaiInstance: InstanceType<typeof ZAI> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

const SCENE_ANALYSIS_PROMPT = `You are an expert motion graphics designer and visual analyst. Analyze the provided design image and extract a complete structured scene representation.

Your analysis must identify and describe:

1. **Headline**: Main headline text, its position (as percentage of image: x, y, width, height), font characteristics, color
2. **Subheadline**: Secondary text, position, style
3. **CTA (Call to Action)**: Button or CTA text, position, style including background color and border radius
4. **Logo**: Position and description of any logo
5. **Layers**: All visual layers in the design, from background to foreground, each with:
   - Type (headline, subheadline, cta, logo, image, icon, background, foreground, decorative, text)
   - Position as percentages (x, y, width, height where x,y is top-left corner)
   - z-index order
   - Color, font size, font weight where applicable
   - Content (text for text layers)
6. **Visual Hierarchy**: Reading order and importance levels
7. **Brand Colors**: Primary, secondary, accent, background, text colors (as hex)
8. **Typography**: Font families, weights, sizes used
9. **Layout Structure**: Layout type (centered, left-aligned, hero, split, etc.), direction, spacing, alignment

Position coordinates should be percentages (0-100) relative to the image dimensions.

Respond with a valid JSON object matching this exact structure:
{
  "headline": {
    "text": "string",
    "position": { "x": 0, "y": 0, "width": 0, "height": 0 },
    "style": { "fontSize": 0, "fontWeight": "string", "color": "hex", "fontFamily": "string" }
  },
  "subheadline": {
    "text": "string",
    "position": { "x": 0, "y": 0, "width": 0, "height": 0 },
    "style": { "fontSize": 0, "fontWeight": "string", "color": "hex", "fontFamily": "string" }
  } or null,
  "cta": {
    "text": "string",
    "position": { "x": 0, "y": 0, "width": 0, "height": 0 },
    "style": { "fontSize": 0, "fontWeight": "string", "color": "hex", "backgroundColor": "hex", "borderRadius": 0 }
  } or null,
  "logo": {
    "position": { "x": 0, "y": 0, "width": 0, "height": 0 }
  } or null,
  "layers": [
    {
      "id": "layer_N",
      "type": "background|foreground|headline|subheadline|cta|logo|image|icon|decorative|text",
      "label": "descriptive label",
      "content": "text content if any",
      "position": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "zIndex": 0,
      "color": "hex",
      "fontSize": 0,
      "fontWeight": "string",
      "fontFamily": "string",
      "opacity": 1,
      "borderRadius": 0
    }
  ],
  "hierarchy": {
    "order": ["layer_id_1", "layer_id_2", "..."],
    "levels": [
      { "level": 1, "layerIds": ["id"], "description": "Primary focal point" }
    ]
  },
  "brandColors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex",
    "additional": ["#hex"]
  },
  "typography": {
    "headlineFont": "string",
    "headlineWeight": "string",
    "headlineSize": "string",
    "bodyFont": "string",
    "bodyWeight": "string",
    "bodySize": "string",
    "ctaFont": "string",
    "ctaWeight": "string",
    "ctaSize": "string"
  },
  "layout": {
    "type": "centered|left-aligned|right-aligned|split|grid|asymmetric|hero|minimal",
    "direction": "horizontal|vertical|mixed",
    "spacing": "tight|normal|loose",
    "alignment": "left|center|right",
    "sections": [
      { "id": "section_1", "type": "string", "position": { "x": 0, "y": 0, "width": 0, "height": 0 } }
    ]
  },
  "sceneGraph": {
    "width": 1920,
    "height": 1080,
    "aspectRatio": "16:9",
    "backgroundColor": "#hex",
    "globalOpacity": 1
  }
}

IMPORTANT: Output ONLY valid JSON. No markdown code blocks, no explanation text outside the JSON.
Be thorough and precise. Every visual element must be captured. Positions must be realistic percentages.`;

function buildFallbackSceneGraph(): SceneGraph {
  return {
    headline: {
      text: 'Design Headline',
      position: { x: 10, y: 20, width: 80, height: 15 },
      style: { fontSize: 48, fontWeight: 'bold', color: '#ffffff', fontFamily: 'sans-serif' },
    },
    subheadline: {
      text: 'Subtitle text',
      position: { x: 10, y: 40, width: 80, height: 10 },
      style: { fontSize: 24, fontWeight: 'normal', color: '#cccccc', fontFamily: 'sans-serif' },
    },
    cta: {
      text: 'Get Started',
      position: { x: 30, y: 60, width: 40, height: 8 },
      style: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#4F46E5', borderRadius: 8 },
    },
    logo: {
      position: { x: 5, y: 5, width: 15, height: 8 },
    },
    layers: [
      { id: 'layer_0', type: 'background', label: 'Background', position: { x: 0, y: 0, width: 100, height: 100 }, zIndex: 0, color: '#1a1a2e', opacity: 1, borderRadius: 0 },
      { id: 'layer_1', type: 'headline', label: 'Headline', content: 'Design Headline', position: { x: 10, y: 20, width: 80, height: 15 }, zIndex: 10, color: '#ffffff', fontSize: 48, fontWeight: 'bold', fontFamily: 'sans-serif', opacity: 1, borderRadius: 0 },
      { id: 'layer_2', type: 'subheadline', label: 'Subheadline', content: 'Subtitle text', position: { x: 10, y: 40, width: 80, height: 10 }, zIndex: 9, color: '#cccccc', fontSize: 24, fontWeight: 'normal', fontFamily: 'sans-serif', opacity: 1, borderRadius: 0 },
      { id: 'layer_3', type: 'cta', label: 'CTA Button', content: 'Get Started', position: { x: 30, y: 60, width: 40, height: 8 }, zIndex: 11, color: '#ffffff', fontSize: 18, fontWeight: 'bold', fontFamily: 'sans-serif', opacity: 1, borderRadius: 8 },
      { id: 'layer_4', type: 'logo', label: 'Logo', position: { x: 5, y: 5, width: 15, height: 8 }, zIndex: 12, opacity: 1, borderRadius: 0 },
    ],
    hierarchy: {
      order: ['layer_1', 'layer_2', 'layer_3', 'layer_4', 'layer_0'],
      levels: [
        { level: 1, layerIds: ['layer_1'], description: 'Primary headline' },
        { level: 2, layerIds: ['layer_3'], description: 'Call to action' },
        { level: 3, layerIds: ['layer_2'], description: 'Supporting text' },
        { level: 4, layerIds: ['layer_4'], description: 'Logo' },
      ],
    },
    brandColors: {
      primary: '#4F46E5',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      background: '#1A1A2E',
      text: '#FFFFFF',
      additional: [],
    },
    typography: {
      headlineFont: 'sans-serif',
      headlineWeight: 'bold',
      headlineSize: '48px',
      bodyFont: 'sans-serif',
      bodyWeight: 'normal',
      bodySize: '24px',
      ctaFont: 'sans-serif',
      ctaWeight: 'bold',
      ctaSize: '18px',
    },
    layout: {
      type: 'centered',
      direction: 'vertical',
      spacing: 'normal',
      alignment: 'center',
      sections: [
        { id: 'section_1', type: 'hero', position: { x: 0, y: 0, width: 100, height: 100 } },
      ],
    },
    sceneGraph: {
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      backgroundColor: '#1a1a2e',
      globalOpacity: 1,
    },
  };
}

function safeParseJSON(text: string): SceneGraph | null {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks or mixed content
    const patterns = [
      /```json\s*([\s\S]*?)```/,      // markdown code block
      /```\s*([\s\S]*?)```/,           // generic code block
      /(\{[\s\S]*\})/,                 // bare JSON object
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          continue;
        }
      }
    }
    return null;
  }
}

export async function analyzeScene(imageDataUrl: string): Promise<SceneAnalysisResult> {
  try {
    const zai = await getZAI();

    // First pass: VLM analysis of the image
    const vlmResponse = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SCENE_ANALYSIS_PROMPT },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });

    const rawAnalysis = vlmResponse.choices[0]?.message?.content || '';

    if (!rawAnalysis || rawAnalysis.trim().length === 0) {
      console.warn('VLM returned empty response, using fallback scene graph');
      return { sceneGraph: buildFallbackSceneGraph(), rawAnalysis: 'Fallback: VLM returned empty response' };
    }

    // Parse the JSON from the response
    let sceneGraph = safeParseJSON(rawAnalysis);

    if (!sceneGraph) {
      // Fallback: Use LLM to structure the raw analysis
      console.log('First pass JSON parsing failed, using LLM to structure...');
      try {
        const structuringResponse = await zai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content: 'You are a JSON structuring assistant. Convert the following analysis into valid JSON matching the scene graph schema. Output ONLY valid JSON, no markdown, no explanation.'
            },
            {
              role: 'user',
              content: `Convert this visual analysis into the scene graph JSON structure:\n\n${rawAnalysis}`
            }
          ],
          thinking: { type: 'disabled' }
        });

        const structuredText = structuringResponse.choices[0]?.message?.content || '';
        sceneGraph = safeParseJSON(structuredText);
      } catch (structError) {
        console.error('Structuring LLM call failed:', structError);
      }
    }

    if (!sceneGraph) {
      console.warn('All JSON parsing attempts failed, using fallback scene graph');
      return { sceneGraph: buildFallbackSceneGraph(), rawAnalysis };
    }

    // Ensure all layers have unique IDs
    if (sceneGraph.layers) {
      sceneGraph.layers = sceneGraph.layers.map((layer: LayerInfo, index: number) => ({
        id: layer.id || `layer_${index}`,
        ...layer,
      }));
    }

    // Ensure required fields exist with defaults
    if (!sceneGraph.hierarchy) {
      sceneGraph.hierarchy = { order: sceneGraph.layers?.map(l => l.id) || [], levels: [] };
    }
    if (!sceneGraph.brandColors) {
      sceneGraph.brandColors = { primary: '#4F46E5', secondary: '#7C3AED', accent: '#F59E0B', background: '#1A1A2E', text: '#FFFFFF', additional: [] };
    }
    if (!sceneGraph.typography) {
      sceneGraph.typography = { headlineFont: 'sans-serif', headlineWeight: 'bold', headlineSize: '48px', bodyFont: 'sans-serif', bodyWeight: 'normal', bodySize: '24px', ctaFont: 'sans-serif', ctaWeight: 'bold', ctaSize: '18px' };
    }
    if (!sceneGraph.layout) {
      sceneGraph.layout = { type: 'centered', direction: 'vertical', spacing: 'normal', alignment: 'center', sections: [] };
    }
    if (!sceneGraph.sceneGraph) {
      sceneGraph.sceneGraph = { width: 1920, height: 1080, aspectRatio: '16:9', backgroundColor: '#1a1a2e', globalOpacity: 1 };
    }

    return {
      sceneGraph,
      rawAnalysis,
    };
  } catch (error) {
    console.error('Scene analysis completely failed:', error);
    // Return a fallback scene graph instead of throwing
    return {
      sceneGraph: buildFallbackSceneGraph(),
      rawAnalysis: `Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}. Using default scene graph.`,
    };
  }
}
