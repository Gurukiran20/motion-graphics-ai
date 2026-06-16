'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useProjectStore } from '@/lib/store';
import { safeParseJSON } from '@/lib/safe-fetch';
import { ImageUploader } from '@/components/studio/ImageUploader';
import { SceneGraphViewer } from '@/components/studio/SceneGraphViewer';
import { MotionPlanViewer } from '@/components/studio/MotionPlanViewer';
import { AnimationPreview } from '@/components/studio/AnimationPreview';
import { EvaluationViewer } from '@/components/studio/EvaluationViewer';
import { FeedbackPanel } from '@/components/studio/FeedbackPanel';
import { QualityGateViewer } from '@/components/studio/QualityGateViewer';
import { PipelineStatus } from '@/components/studio/PipelineStatus';
import { HeroSection } from '@/components/studio/HeroSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Film, Eye, Clapperboard, 
  MessageSquare, ShieldCheck, Loader2, AlertCircle, RotateCcw,
  Zap, Briefcase
} from 'lucide-react';

export default function Home() {
  const store = useProjectStore();
  const {
    pipelineState,
    projectId,
    imageUrl,
    sceneGraph,
    motionVariants,
    selectedVariant,
    renderConfig,
    evaluation,
    qualityReport,
    isProcessing,
    error,
    // Actions
    setSelectedVariant,
    setSceneGraph,
    setRawAnalysis,
    setMotionVariants,
    setRenderConfig,
    setEvaluation,
    setQualityReport,
    setPipelineState,
    setIsProcessing,
    setError,
  } = store;

  // Stage 1: Analyze the uploaded image
  const handleAnalyze = useCallback(async () => {
    if (!projectId) return;
    setIsProcessing(true);
    setError(null);
    setPipelineState({ currentStage: 'analyzing', stageStatus: { ...pipelineState.stageStatus, analyzing: 'in_progress' }, progress: 25 });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Analysis failed');
      }

      const sg = (data as { sceneAnalysis?: { sceneGraph?: unknown }; sceneGraph?: unknown }).sceneAnalysis?.sceneGraph || (data as { sceneGraph?: unknown }).sceneGraph;
      setSceneGraph(sg as Parameters<typeof setSceneGraph>[0]);
      setRawAnalysis((data as { sceneAnalysis?: { rawAnalysis?: string }; rawAnalysis?: string }).sceneAnalysis?.rawAnalysis || (data as { rawAnalysis?: string }).rawAnalysis || null);
      setPipelineState({
        currentStage: 'planning',
        stageStatus: { ...pipelineState.stageStatus, analyzing: 'completed', planning: 'in_progress' },
        progress: 35,
      });

      // Auto-advance to motion planning
      await handlePlanMotion(sg as Parameters<typeof setSceneGraph>[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setPipelineState({ stageStatus: { ...pipelineState.stageStatus, analyzing: 'failed' } });
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, pipelineState.stageStatus]);

  // Stage 2: Plan motion
  const handlePlanMotion = useCallback(async (sg?: typeof sceneGraph) => {
    const sceneGraphToUse = sg || sceneGraph;
    if (!projectId || !sceneGraphToUse) return;
    setIsProcessing(true);
    setError(null);
    setPipelineState({ currentStage: 'planning', stageStatus: { ...pipelineState.stageStatus, planning: 'in_progress' }, progress: 40 });

    try {
      const response = await fetch('/api/plan-motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Motion planning failed');
      }

      const variants = (data as { variants?: Array<{ id: string; variantType: string; motionPlan: unknown }> }).variants?.map((v) => v.motionPlan || v) || [];
      setMotionVariants(variants as Parameters<typeof setMotionVariants>[0]);
      setPipelineState({
        currentStage: 'rendering',
        stageStatus: { ...pipelineState.stageStatus, planning: 'completed', rendering: 'in_progress' },
        progress: 55,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Motion planning failed');
      setPipelineState({ stageStatus: { ...pipelineState.stageStatus, planning: 'failed' } });
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, sceneGraph, pipelineState.stageStatus]);

  // Stage 3: Render animation
  const handleRender = useCallback(async (variantType: 'professional' | 'energetic') => {
    if (!projectId) return;
    setIsProcessing(true);
    setError(null);
    setPipelineState({ currentStage: 'rendering', stageStatus: { ...pipelineState.stageStatus, rendering: 'in_progress' }, progress: 60 });

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, variantType }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Rendering failed');
      }

      const rc = (data as { renderConfig?: unknown; renderJob?: { renderConfig?: unknown } }).renderConfig || (data as { renderJob?: { renderConfig?: unknown } }).renderJob?.renderConfig;
      setRenderConfig(rc as Parameters<typeof setRenderConfig>[0]);
      setPipelineState({
        currentStage: 'evaluating',
        stageStatus: { ...pipelineState.stageStatus, rendering: 'completed', evaluating: 'in_progress' },
        progress: 75,
      });

      // Auto-advance to evaluation
      await handleEvaluate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering failed');
      setPipelineState({ stageStatus: { ...pipelineState.stageStatus, rendering: 'failed' } });
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, pipelineState.stageStatus]);

  // Stage 4: Evaluate
  const handleEvaluate = useCallback(async () => {
    if (!projectId) return;
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, variantType: selectedVariant }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Evaluation failed');
      }

      setEvaluation((data as { evaluation: unknown }).evaluation as Parameters<typeof setEvaluation>[0]);
      setPipelineState({
        currentStage: 'feedback',
        stageStatus: { ...pipelineState.stageStatus, evaluating: 'completed', feedback: 'in_progress' },
        progress: 85,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
      setPipelineState({ stageStatus: { ...pipelineState.stageStatus, evaluating: 'failed' } });
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, selectedVariant, pipelineState.stageStatus]);

  // Stage 5: Feedback
  const handleFeedback = useCallback(async (feedback: string) => {
    if (!projectId) return;
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, feedback, variantType: selectedVariant }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Feedback processing failed');
      }

      const typedData = data as { updatedSceneGraph?: unknown; updatedMotionVariant?: { variantType?: string } };
      if (typedData.updatedSceneGraph) setSceneGraph(typedData.updatedSceneGraph as Parameters<typeof setSceneGraph>[0]);
      if (typedData.updatedMotionVariant) {
        setMotionVariants(prev => 
          prev.map(v => v.variantType === typedData.updatedMotionVariant?.variantType ? typedData.updatedMotionVariant as typeof v : v)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback failed');
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, selectedVariant]);

  // Stage 6: Voice edit
  const handleVoiceEdit = useCallback(async (audioBlob: Blob) => {
    if (!projectId) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('projectId', projectId);
      formData.append('variantType', selectedVariant);

      const response = await fetch('/api/voice-edit', {
        method: 'POST',
        body: formData,
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Voice editing failed');
      }

      const typedData = data as { updatedSceneGraph?: unknown; updatedMotionVariant?: { variantType?: string } };
      if (typedData.updatedSceneGraph) setSceneGraph(typedData.updatedSceneGraph as Parameters<typeof setSceneGraph>[0]);
      if (typedData.updatedMotionVariant) {
        setMotionVariants(prev => 
          prev.map(v => v.variantType === typedData.updatedMotionVariant?.variantType ? typedData.updatedMotionVariant as typeof v : v)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice editing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, selectedVariant]);

  // Stage 7: Quality gate
  const handleQualityGate = useCallback(async () => {
    if (!projectId) return;
    setIsProcessing(true);
    setError(null);
    setPipelineState({ currentStage: 'quality_gate', stageStatus: { ...pipelineState.stageStatus, quality_gate: 'in_progress' }, progress: 95 });

    try {
      const response = await fetch('/api/quality-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, variantType: selectedVariant }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Quality gate failed');
      }

      setQualityReport((data as { report: unknown }).report as Parameters<typeof setQualityReport>[0]);
      setPipelineState({
        currentStage: 'complete',
        stageStatus: { ...pipelineState.stageStatus, quality_gate: 'completed', complete: 'completed' },
        progress: 100,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quality gate failed');
      setPipelineState({ stageStatus: { ...pipelineState.stageStatus, quality_gate: 'failed' } });
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, selectedVariant, pipelineState.stageStatus]);

  const handleReset = useCallback(() => {
    store.resetPipeline();
    store.setProjectId(null);
    store.setImageUrl(null);
    store.setImageName(null);
    store.setSceneGraph(null);
    store.setRawAnalysis(null);
    store.setMotionVariants([]);
    store.setRenderConfig(null);
    store.setEvaluation(null);
    store.setQualityReport(null);
    store.setError(null);
  }, [store]);

  const currentStage = pipelineState.currentStage;
  const isUploaded = currentStage !== 'idle';
  const isAnalyzed = sceneGraph !== null;
  const isPlanned = motionVariants.length > 0;
  const isRendered = renderConfig !== null;
  const isEvaluated = evaluation !== null;
  const isComplete = currentStage === 'complete';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Film className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Motion Graphics Studio</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">AI-Powered Motion Design</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isUploaded && (
              <Badge variant="outline" className="hidden sm:flex gap-1">
                <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : isComplete ? 'bg-emerald-500' : 'bg-primary'}`} />
                {isProcessing ? 'Processing...' : isComplete ? 'Complete' : 'Active'}
              </Badge>
            )}
            {isUploaded && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Hero section - only shown when no project is active */}
        {!isUploaded && (
          <div className="mb-8">
            <HeroSection />
          </div>
        )}

        {/* Pipeline Status */}
        {isUploaded && (
          <div className="mb-6">
            <PipelineStatus currentStage={currentStage} stageStatus={pipelineState.stageStatus} />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">Dismiss</Button>
          </motion.div>
        )}

        {/* Upload Section */}
        {!isUploaded && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <ImageUploader />
          </motion.div>
        )}

        {/* Workspace - shown after upload */}
        {isUploaded && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Panel - Main workspace */}
            <div className="lg:col-span-3 space-y-6">
              {/* Analysis Trigger */}
              {!isAnalyzed && !isProcessing && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {imageUrl && (
                    <Card className="p-3 mb-4">
                      <img src={imageUrl} alt="Uploaded design" className="w-full max-h-64 object-contain rounded-lg" />
                    </Card>
                  )}
                  <Button size="lg" className="w-full gap-2" onClick={handleAnalyze}>
                    <Eye className="h-4 w-4" />
                    Analyze Design
                  </Button>
                </motion.div>
              )}

              {/* Animation Preview */}
              {isRendered && renderConfig && sceneGraph && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <AnimationPreview
                    renderConfig={renderConfig}
                    sceneGraph={sceneGraph}
                    imageUrl={imageUrl}
                  />
                </motion.div>
              )}

              {/* Image preview when not yet rendered */}
              {isUploaded && !isRendered && imageUrl && isAnalyzed && (
                <Card className="p-3">
                  <div className="relative">
                    <img src={imageUrl} alt="Uploaded design" className="w-full max-h-64 object-contain rounded-lg" />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                          <span className="text-white font-medium">
                            {currentStage === 'analyzing' ? 'Analyzing design...' : 
                             currentStage === 'planning' ? 'Planning motion...' :
                             'Processing...'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Panel - Details & Controls */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs defaultValue="scene" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="scene" className="text-xs gap-1">
                    <Eye className="h-3 w-3 hidden sm:block" />
                    Scene
                  </TabsTrigger>
                  <TabsTrigger value="motion" className="text-xs gap-1">
                    <Clapperboard className="h-3 w-3 hidden sm:block" />
                    Motion
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="text-xs gap-1">
                    <MessageSquare className="h-3 w-3 hidden sm:block" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="quality" className="text-xs gap-1">
                    <ShieldCheck className="h-3 w-3 hidden sm:block" />
                    Quality
                  </TabsTrigger>
                </TabsList>

                {/* Scene Tab */}
                <TabsContent value="scene">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Scene Analysis</h3>
                    {sceneGraph ? (
                      <SceneGraphViewer sceneGraph={sceneGraph} rawAnalysis={null} />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {isProcessing ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p className="text-sm">Analyzing your design...</p>
                          </div>
                        ) : (
                          <p className="text-sm">Upload an image to start scene analysis</p>
                        )}
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* Motion Tab */}
                <TabsContent value="motion">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Motion Planning</h3>
                    {isPlanned ? (
                      <MotionPlanViewer
                        variants={motionVariants}
                        selectedVariant={selectedVariant}
                        onSelectVariant={(v) => {
                          setSelectedVariant(v);
                          if (!isProcessing) handleRender(v);
                        }}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {isProcessing ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p className="text-sm">Planning animations...</p>
                          </div>
                        ) : (
                          <p className="text-sm">Complete scene analysis first</p>
                        )}
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* Feedback Tab */}
                <TabsContent value="feedback">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Feedback & Editing</h3>
                    {isRendered ? (
                      <FeedbackPanel
                        onSubmitFeedback={handleFeedback}
                        onSubmitVoice={handleVoiceEdit}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Render an animation first to provide feedback</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* Quality Tab */}
                <TabsContent value="quality">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Quality Assessment</h3>
                    {isEvaluated ? (
                      <div className="space-y-4">
                        <EvaluationViewer evaluation={evaluation!} />
                        {!qualityReport && (
                          <Button
                            className="w-full gap-2"
                            onClick={handleQualityGate}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                            Run Final Quality Gate
                          </Button>
                        )}
                        {qualityReport && (
                          <QualityGateViewer report={qualityReport} />
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {isProcessing ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p className="text-sm">Evaluating animation quality...</p>
                          </div>
                        ) : (
                          <p className="text-sm">Render an animation first to evaluate quality</p>
                        )}
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            AI Motion Graphics Studio • 7-Stage Pipeline
          </p>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              VLM + LLM Powered
            </Badge>
            <Badge variant="outline" className="text-xs hidden sm:flex">
              <Briefcase className="h-3 w-3 mr-1" />
              Framer Motion
            </Badge>
          </div>
        </div>
      </footer>
    </div>
  );
}
