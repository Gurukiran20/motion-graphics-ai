'use client';

import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/lib/store';
import { safeParseJSON } from '@/lib/safe-fetch';

export function ImageUploader() {
  const { setImageUrl, setProjectId, setImageName, setPipelineState, pipelineState, isProcessing, setIsProcessing, setError } = useProjectStore();
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await safeParseJSON<{ projectId?: string; imageUrl?: string; name?: string; error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      setProjectId(data.projectId);
      setImageUrl(data.imageUrl);
      setImageName(file.name);
      setPipelineState({
        currentStage: 'analyzing',
        stageStatus: {
          ...pipelineState.stageStatus,
          uploading: 'completed',
          analyzing: 'in_progress',
        },
        progress: 15,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  }, [setProjectId, setImageUrl, setImageName, setPipelineState, pipelineState, setIsProcessing, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-4">
      <Card
        className={`relative border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        } ${preview ? 'p-2' : 'p-8'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Uploaded design"
              className="w-full h-auto max-h-[400px] object-contain rounded-lg"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100 rounded-lg">
              <p className="text-white text-sm font-medium">Drop a new image to replace</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="rounded-full bg-primary/10 p-4">
              {isProcessing ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <Upload className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {isProcessing ? 'Uploading...' : 'Drop your design here'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse • PNG, JPG, WebP supported
              </p>
            </div>
            <label htmlFor="image-upload">
              <Button variant="outline" asChild disabled={isProcessing}>
                <span>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Choose File
                </span>
              </Button>
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
              disabled={isProcessing}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
