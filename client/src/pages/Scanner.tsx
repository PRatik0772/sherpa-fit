import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Drawer } from "vaul";
import { Camera, X, Check, RotateCcw, Loader2, ImageIcon, Edit3 } from "lucide-react";
import { useStore, authFetch } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/lib/capacitor";

async function uploadImageToStorage(dataUrl: string): Promise<string | null> {
  try {
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:(.*?);/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: contentType });
    const ext = contentType.split('/')[1] || 'jpg';
    const name = `food_${Date.now()}.${ext}`;

    const urlRes = await authFetch('/api/uploads/request-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, size: blob.size, contentType }),
    });
    if (!urlRes.ok) throw new Error('Failed to get upload URL');
    const { uploadURL, objectPath } = await urlRes.json();

    const putRes = await fetch(uploadURL, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': contentType },
    });
    if (!putRes.ok) throw new Error('Failed to upload to storage');

    return objectPath;
  } catch (err) {
    console.error('Image upload failed:', err);
    return null;
  }
}

type FoodAnalysis = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  serving: string;
  confidence: number;
  ingredients?: string;
  brand?: string;
  barcode?: string;
  dbMatch?: {
    food: string;
    caloriesPer100g?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    nutritionDensity?: number;
    brand?: string;
    nutriScore?: string;
  };
  dataSource?: string;
};

type ScanTab = "food" | "barcode" | "label";

export default function Scanner() {
  const [, setLocation] = useLocation();
  const { addMeal } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const streamRef = useRef<MediaStream | null>(null);
  const [activeTab, setActiveTab] = useState<ScanTab>("food");
  const [logged, setLogged] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [editingIngredients, setEditingIngredients] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState("");
  const [editedName, setEditedName] = useState("");
  const [editedCalories, setEditedCalories] = useState("");
  const [editedProtein, setEditedProtein] = useState("");
  const [editedCarbs, setEditedCarbs] = useState("");
  const [editedFat, setEditedFat] = useState("");
  const [editedFiber, setEditedFiber] = useState("");
  const [editedSugar, setEditedSugar] = useState("");
  const [editedSodium, setEditedSodium] = useState("");
  const [editMode, setEditMode] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setCameraError(null);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError("Camera access denied. You can upload a photo instead.");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    triggerHaptic('medium');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setLogged(false);
    setAnalysis(null);
    setEditMode(false);
    setCapturedImage(dataUrl);
    setOpen(true);
    analyzeFood(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogged(false);
      setAnalysis(null);
      setEditMode(false);
      setCapturedImage(dataUrl);
      setOpen(true);
      analyzeFood(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const analyzeFood = async (imageData: string) => {
    setAnalyzing(true);
    setScanError(null);
    setAnalyzeError(null);
    setOpen(true);
    try {
      const res = await authFetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, scanType: activeTab }),
      });
      if (res.status === 503) {
        const errData = await res.json().catch(() => ({}));
        setAnalyzeError(errData.message || "AI analysis is temporarily unavailable. Please try again.");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setAnalyzeError(errData.message || "Could not analyze the image. Try a clearer photo.");
        return;
      }
      const data = await res.json();
      setAnalysis(data);
      setEditedName(data.name || "");
      setEditedCalories(String(data.calories || 0));
      setEditedProtein(String(data.protein || 0));
      setEditedCarbs(String(data.carbs || 0));
      setEditedFat(String(data.fat || 0));
      setEditedFiber(String(data.fiber || 0));
      setEditedSugar(String(data.sugar || 0));
      setEditedSodium(String(data.sodium || 0));
      setEditedIngredients(data.ingredients || "");
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalyzeError("Network error — check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogFood = async () => {
    if (!analysis || logged) return;
    const finalName = editMode ? editedName.trim() : analysis.name;
    const finalCalories = editMode ? Math.round(Number(editedCalories)) : Math.round(analysis.calories);
    if (!finalName || isNaN(finalCalories) || finalCalories <= 0) return;
    triggerHaptic('success');
    setLogged(true);
    try {
      let imageUrl: string | undefined;
      if (capturedImage) {
        const objectPath = await uploadImageToStorage(capturedImage);
        if (objectPath) {
          imageUrl = objectPath;
        }
      }
      await addMeal({
        name: finalName,
        calories: finalCalories,
        protein: Math.round((editMode ? (Number(editedProtein) || 0) : analysis.protein) * 10) / 10,
        carbs: Math.round((editMode ? (Number(editedCarbs) || 0) : analysis.carbs) * 10) / 10,
        fat: Math.round((editMode ? (Number(editedFat) || 0) : analysis.fat) * 10) / 10,
        fiber: Math.round((editMode ? (Number(editedFiber) || 0) : (analysis.fiber || 0)) * 10) / 10,
        sugar: Math.round((editMode ? (Number(editedSugar) || 0) : (analysis.sugar || 0)) * 10) / 10,
        sodium: Math.round((editMode ? (Number(editedSodium) || 0) : (analysis.sodium || 0)) * 10) / 10,
        ingredients: editedIngredients || analysis.ingredients || '',
        ...(imageUrl ? { image: imageUrl } : {}),
      });
      setOpen(false);
      setLocation("/");
    } catch (err) {
      console.error('Failed to log food:', err);
      setLogged(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setLogged(false);
    setEditMode(false);
    setOpen(false);
  };

  const handleDrawerChange = (isOpen: boolean) => {
    if (!isOpen) {
      if (!logged) {
        setCapturedImage(null);
        setAnalysis(null);
      }
      setLogged(false);
      setEditMode(false);
    }
    setOpen(isOpen);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  const scanTabs: { id: ScanTab; label: string; hint: string }[] = [
    { id: "food", label: "Scan Food", hint: "Point at your food" },
    { id: "barcode", label: "Barcode", hint: "Point at the barcode" },
    { id: "label", label: "Food Label", hint: "Point at the nutrition label" },
  ];

  const activeHint = scanTabs.find(t => t.id === activeTab)?.hint || "";

  // Normalize confidence to a guaranteed integer 0–100 (safe even when analysis is null)
  const conf: number = analysis && Number.isFinite(Number(analysis.confidence))
    ? Math.round(Number(analysis.confidence))
    : 0;
  const confLabel: "High confidence" | "Medium confidence" | "Low confidence" =
    conf >= 70 ? "High confidence" : conf >= 40 ? "Medium confidence" : "Low confidence";
  const isLowConf = conf < 40;

  return (
    <div className="h-screen bg-black relative flex flex-col" data-testid="scanner-page">
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="p-5 flex justify-between items-center">
          <button onClick={() => setLocation("/")} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white" data-testid="button-close-scanner">
            <X size={22} />
          </button>
          <span className="font-semibold text-white tracking-wide text-[15px] font-display">Food Scanner</span>
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white" data-testid="button-upload-photo">
            <ImageIcon size={22} />
          </button>
        </div>

        <div className="flex gap-1 px-4 pb-3" data-testid="scan-tabs">
          {scanTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { if (!capturedImage) { triggerHaptic('selection'); setActiveTab(tab.id); } }}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-all font-body ${
                activeTab === tab.id
                  ? "bg-white text-black"
                  : capturedImage ? "bg-white/10 text-white/30" : "bg-white/15 text-white/70"
              }`}
              data-testid={`scan-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        data-testid="input-file-upload"
      />

      {scanError && (
        <div className="absolute top-24 left-4 right-4 z-50 bg-red-500/90 backdrop-blur-md text-white text-[13px] font-body px-4 py-3 rounded-2xl flex items-center justify-between gap-3" data-testid="scan-error-banner">
          <span>{scanError}</span>
          <button onClick={() => setScanError(null)} className="shrink-0 text-white/80 hover:text-white" data-testid="button-dismiss-scan-error">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden bg-zinc-900">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <Camera className="text-zinc-600" size={48} />
            <p className="text-zinc-400 text-center text-sm font-body">{cameraError}</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-black hover:bg-slate-100 font-display"
              data-testid="button-upload-fallback"
            >
              <ImageIcon className="mr-2" size={16} /> Upload Photo
            </Button>
          </div>
        ) : capturedImage ? (
          <img src={capturedImage} alt="Captured food" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {cameraReady && !capturedImage && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 rounded-3xl ${
                  activeTab === "barcode" ? "w-72 h-40 border-orange-400/60" :
                  activeTab === "label" ? "w-64 h-80 border-blue-400/60" :
                  "w-64 h-64 border-white/50"
                }`} />
                <div className="absolute bottom-24 left-0 right-0 text-center">
                  <p className="text-white/90 font-medium bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-md text-sm font-body">
                    {activeHint}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {!capturedImage && !cameraError && (
          <div className="absolute bottom-10 left-0 right-0 px-8 flex justify-between items-center z-20">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center"
              data-testid="button-gallery"
            >
              <ImageIcon size={20} className="text-white" />
            </button>
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
              data-testid="button-capture"
            >
              <div className="w-16 h-16 bg-white rounded-full" />
            </button>
            <button
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center"
              data-testid="button-flip-camera"
            >
              <RotateCcw size={20} className="text-white" />
            </button>
          </div>
        )}

        {capturedImage && !open && (
          <div className="absolute bottom-10 left-0 right-0 px-8 flex justify-center z-20">
            <Button onClick={retake} variant="outline" className="bg-black/60 border-white/20 text-white font-display" data-testid="button-retake">
              <RotateCcw className="mr-2" size={16} /> Retake
            </Button>
          </div>
        )}
      </div>

      <Drawer.Root open={open} onOpenChange={handleDrawerChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[24px] max-h-[80vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 shadow-2xl">
            <div className="p-5 bg-white rounded-t-[24px] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-6" />

              {analyzing ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <Loader2 className="animate-spin text-slate-600" size={40} />
                  <p className="text-slate-400 text-sm animate-pulse font-body">
                    {activeTab === "barcode" ? "Reading barcode..." : activeTab === "label" ? "Reading nutrition label..." : "Analyzing your food with AI..."}
                  </p>
                </div>
              ) : analyzeError ? (
                <div className="flex flex-col items-center gap-4 py-12" data-testid="analyze-error-card">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[16px] font-semibold text-slate-800 font-display mb-1">Analysis Failed</p>
                    <p className="text-[13px] text-slate-500 font-body leading-relaxed px-4">{analyzeError}</p>
                  </div>
                  <div className="flex gap-3 w-full px-4 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => { setAnalyzeError(null); setOpen(false); retake(); }}
                      className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 font-display text-[13px]"
                      data-testid="button-retake-after-error"
                    >
                      <RotateCcw className="mr-2" size={15} /> Retake
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 font-display text-[13px]"
                      data-testid="button-upload-after-error"
                    >
                      <ImageIcon className="mr-2" size={15} /> Upload photo
                    </Button>
                  </div>
                </div>
              ) : analysis ? (
                <>
                  {/* ── LOW CONFIDENCE — error-first: hide all AI details, show only failure card ── */}
                  {isLowConf && !editMode ? (
                    <div data-testid="low-confidence-view">
                      <div className="flex items-center gap-2 mb-5">
                        {capturedImage && (
                          <img src={capturedImage} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 opacity-40" alt="Scanned" />
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700" data-testid="text-confidence">
                          {confLabel} · {conf}%
                        </span>
                      </div>
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-4" data-testid="low-confidence-failure-card">
                        <div className="flex items-start gap-2.5 mb-4">
                          <span className="text-2xl leading-none mt-0.5">🫥</span>
                          <div>
                            <p className="text-[14px] font-bold text-red-800 font-display mb-1">Couldn't read this food clearly</p>
                            <p className="text-[12px] text-red-700 font-body leading-relaxed">
                              Try better lighting or scan the nutrition label instead. Confidence is only <strong>{conf}%</strong> — values are hidden to prevent logging incorrect data.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={retake}
                            className="flex-1 h-10 text-[13px] border-red-300 text-red-700 hover:bg-red-100 rounded-xl font-display"
                            data-testid="button-retake-low-conf">
                            Retake photo
                          </Button>
                          <Button onClick={() => { setEditMode(true); }}
                            className="flex-1 h-10 text-[13px] bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-display"
                            data-testid="button-edit-manual-low-conf">
                            Enter manually
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-4 mb-5">
                        {capturedImage && (
                          <img src={capturedImage} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" alt="Scanned" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              conf >= 70 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`} data-testid="text-confidence">
                              {confLabel} · {conf}%
                            </span>
                            {analysis.brand && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">{analysis.brand}</span>
                            )}
                          </div>
                          {editMode ? (
                            <input
                              type="text"
                              value={editedName}
                              onChange={e => setEditedName(e.target.value)}
                              className="text-xl font-bold text-slate-900 font-display w-full border-b-2 border-blue-500 focus:outline-none pb-0.5 bg-transparent"
                              data-testid="input-edit-name"
                            />
                          ) : (
                            <h2 className="text-xl font-bold text-slate-900 font-display" data-testid="text-food-name">{analysis.name}</h2>
                          )}
                          <p className="text-[13px] text-slate-400 font-body mt-0.5">{analysis.serving}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider font-body">Nutrition</p>
                        <button
                          onClick={() => { triggerHaptic('light'); setEditMode(!editMode); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                            editMode ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                          }`}
                          data-testid="button-toggle-edit"
                        >
                          <Edit3 size={12} />
                          {editMode ? "Editing" : "Edit"}
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-4" data-testid="macro-grid">
                        <MacroInput label="Calories" value={editMode ? editedCalories : String(analysis.calories)} unit="kcal" color="text-slate-900" editing={editMode} onChange={setEditedCalories} testId="calories" />
                        <MacroInput label="Protein" value={editMode ? editedProtein : String(analysis.protein)} unit="g" color="text-red-500" editing={editMode} onChange={setEditedProtein} testId="protein" />
                        <MacroInput label="Carbs" value={editMode ? editedCarbs : String(analysis.carbs)} unit="g" color="text-orange-500" editing={editMode} onChange={setEditedCarbs} testId="carbs" />
                        <MacroInput label="Fat" value={editMode ? editedFat : String(analysis.fat)} unit="g" color="text-blue-500" editing={editMode} onChange={setEditedFat} testId="fat" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-5" data-testid="micro-grid">
                        <MacroInput label="Fiber" value={editMode ? editedFiber : String(analysis.fiber || 0)} unit="g" color="text-green-600" editing={editMode} onChange={setEditedFiber} testId="fiber" />
                        <MacroInput label="Sugar" value={editMode ? editedSugar : String(analysis.sugar || 0)} unit="g" color="text-pink-500" editing={editMode} onChange={setEditedSugar} testId="sugar" />
                        <MacroInput label="Sodium" value={editMode ? editedSodium : String(analysis.sodium || 0)} unit="mg" color="text-purple-500" editing={editMode} onChange={setEditedSodium} testId="sodium" />
                      </div>

                      <div className="mb-5" data-testid="ingredients-section">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider font-body">Ingredients</p>
                          {!editMode && (
                            <button
                              onClick={() => { setEditingIngredients(!editingIngredients); setEditedIngredients(analysis.ingredients || ""); }}
                              className="flex items-center gap-1 text-[12px] text-blue-600 font-medium"
                              data-testid="button-edit-ingredients"
                            >
                              <Edit3 size={11} />
                              {editingIngredients ? "Done" : "Edit"}
                            </button>
                          )}
                        </div>
                        {editMode || editingIngredients ? (
                          <textarea
                            value={editedIngredients}
                            onChange={e => setEditedIngredients(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-body resize-none"
                            placeholder="List ingredients separated by commas"
                            data-testid="input-ingredients"
                          />
                        ) : (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[13px] text-slate-600 font-body leading-relaxed">{analysis.ingredients || "No ingredients detected"}</p>
                          </div>
                        )}
                      </div>

                      {/* Nutrition label strict-parse diff — shown when scanning a label and user has edited values */}
                      {activeTab === "label" && editMode && (() => {
                        const diffs: { label: string; ai: number; edited: number; unit: string }[] = [];
                        const check = (label: string, aiVal: number, editedStr: string, unit: string) => {
                          const editedVal = parseFloat(editedStr) || 0;
                          if (Math.abs(editedVal - aiVal) > 1) diffs.push({ label, ai: aiVal, edited: editedVal, unit });
                        };
                        check("Calories", analysis.calories, editedCalories, "kcal");
                        check("Protein", analysis.protein, editedProtein, "g");
                        check("Carbs", analysis.carbs, editedCarbs, "g");
                        check("Fat", analysis.fat, editedFat, "g");
                        if (diffs.length === 0) return (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2" data-testid="label-diff-match">
                            <span className="text-green-500">✓</span>
                            <p className="text-[12px] text-green-700 font-body">Label values match AI extraction — no corrections needed</p>
                          </div>
                        );
                        return (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl" data-testid="label-diff-card">
                            <p className="text-[10px] text-amber-700 uppercase tracking-wider mb-2 font-body font-semibold">Label vs AI — values corrected</p>
                            <div className="space-y-1.5">
                              {diffs.map(d => (
                                <div key={d.label} className="flex items-center gap-2 text-[12px]">
                                  <span className="text-slate-500 font-body w-14 flex-shrink-0">{d.label}</span>
                                  <span className="text-slate-400 line-through font-body">{d.ai}{d.unit}</span>
                                  <span className="text-amber-600">→</span>
                                  <span className="font-semibold text-amber-800 font-body">{d.edited}{d.unit}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[11px] text-amber-600 mt-2 font-body">Your corrected values will be logged.</p>
                          </div>
                        );
                      })()}

                      {activeTab === "label" && !editMode && (
                        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2" data-testid="label-edit-prompt">
                          <span className="text-slate-400 text-base">📋</span>
                          <p className="text-[12px] text-slate-600 font-body">Tap <strong>Edit</strong> above to correct any values that differ from the physical label — your edits are logged, not the AI extraction.</p>
                        </div>
                      )}

                      {analysis.dbMatch && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <p className="text-[10px] text-blue-600 uppercase tracking-wider mb-1 font-body">
                            {analysis.dataSource === "nutrition_db" ? "Matched in Nutrition Database" : "Database Match"}
                          </p>
                          <p className="text-[12px] text-slate-600 font-body">
                            {analysis.dbMatch.food}
                            {analysis.dbMatch.brand && ` by ${analysis.dbMatch.brand}`}
                            {analysis.dbMatch.nutriScore && ` · Nutri-Score ${analysis.dbMatch.nutriScore.toUpperCase()}`}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2.5 mt-2">
                        <Button onClick={handleLogFood} disabled={logged}
                          className="w-full h-12 text-[15px] font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-display disabled:opacity-40"
                          data-testid="button-log-food">
                          {logged ? (
                            <><Check className="mr-2" size={18} /> Logged!</>
                          ) : (
                            <><Check className="mr-2" size={18} /> Done · Log Food</>
                          )}
                        </Button>
                        <Button variant="ghost" onClick={retake}
                          className="w-full h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl text-[13px] font-body"
                          data-testid="button-retake-drawer">
                          This isn't right · Retake
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

function MacroInput({ label, value, unit, color, editing, onChange, testId }: {
  label: string; value: string; unit: string; color: string; editing: boolean; onChange: (v: string) => void; testId: string;
}) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100" data-testid={`macro-${testId}`}>
      <p className="text-[10px] text-slate-400 mb-1 font-body">{label}</p>
      {editing ? (
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`text-lg font-bold ${color} font-display w-full text-center bg-transparent border-b-2 border-blue-400 focus:outline-none`}
          data-testid={`input-${testId}`}
        />
      ) : (
        <p className={`text-lg font-bold ${color} font-display`}>{value}<span className="text-[10px] text-slate-400 font-normal ml-0.5">{unit}</span></p>
      )}
    </div>
  );
}
