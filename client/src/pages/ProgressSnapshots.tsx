import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useStore, authFetch } from "@/lib/store";
import { useUpload } from "@/hooks/use-upload";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Trash2, Calendar, Scale, Images, ChevronDown, X, Maximize2, Loader2 } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/lib/capacitor";

interface ProgressPhoto {
  id: string;
  userId: string;
  imageUrl: string;
  category: string;
  weight: number | null;
  bodyFatPercent: number | null;
  note: string | null;
  takenAt: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysBetween(d1: string, d2: string) {
  return Math.round(Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / 86400000);
}

function CompareSlider({ leftPhoto, rightPhoto, onClose }: {
  leftPhoto: ProgressPhoto;
  rightPhoto: ProgressPhoto;
  onClose: () => void;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging.current) handleMove(e.clientX);
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  const days = daysBetween(leftPhoto.takenAt, rightPhoto.takenAt);
  const weightChange = leftPhoto.weight && rightPhoto.weight ? (rightPhoto.weight - leftPhoto.weight) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col"
    >
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center" data-testid="button-close-compare">
          <X size={20} className="text-white" />
        </button>
        <div className="text-center">
          <p className="text-white/60 text-xs font-body">{days} days apart</p>
          {weightChange !== null && (
            <p className={`text-sm font-semibold font-display ${weightChange < 0 ? "text-emerald-400" : weightChange > 0 ? "text-red-400" : "text-white"}`}>
              {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
            </p>
          )}
        </div>
        <div className="w-9" />
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden mx-4 rounded-2xl cursor-col-resize select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        data-testid="compare-slider"
      >
        <img
          src={rightPhoto.imageUrl}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={leftPhoto.imageUrl}
            alt="Before"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100vw" }}
          />
        </div>

        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-slate-400 rounded-full" />
              <div className="w-0.5 h-4 bg-slate-400 rounded-full" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <p className="text-white text-xs font-semibold font-body">{formatShortDate(leftPhoto.takenAt)}</p>
          {leftPhoto.weight && <p className="text-white/70 text-[10px] font-body">{leftPhoto.weight} kg</p>}
        </div>
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <p className="text-white text-xs font-semibold font-body">{formatShortDate(rightPhoto.takenAt)}</p>
          {rightPhoto.weight && <p className="text-white/70 text-[10px] font-body">{rightPhoto.weight} kg</p>}
        </div>
      </div>

      <div className="px-4 py-4 pb-8 flex gap-3">
        <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
          <p className="text-white/50 text-[10px] font-body uppercase">Before</p>
          <p className="text-white text-sm font-semibold font-display">{formatDate(leftPhoto.takenAt)}</p>
        </div>
        <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
          <p className="text-white/50 text-[10px] font-body uppercase">After</p>
          <p className="text-white text-sm font-semibold font-display">{formatDate(rightPhoto.takenAt)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function AddPhotoSheet({ onClose, onSave, userWeight }: {
  onClose: () => void;
  onSave: (data: { imageUrl: string; category: string; weight: string; bodyFatPercent: string; note: string; takenAt: string }) => void;
  userWeight?: number;
}) {
  const [category, setCategory] = useState("front");
  const [weight, setWeight] = useState(userWeight?.toString() || "");
  const [bodyFat, setBodyFat] = useState("");
  const [note, setNote] = useState("");
  const [takenAt, setTakenAt] = useState(new Date().toISOString().split("T")[0]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setUploadedPath(response.objectPath);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    await uploadFile(file);
    triggerHaptic("medium");
  };

  const handleSave = () => {
    if (!uploadedPath) return;
    onSave({
      imageUrl: uploadedPath,
      category,
      weight,
      bodyFatPercent: bodyFat,
      note,
      takenAt,
    });
    triggerHaptic("success");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-3xl p-5 pb-8 w-full max-w-md space-y-4 safe-pad-bottom max-h-[92vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 font-display">New Progress Photo</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div
          className="relative w-full aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-slate-200"
          onClick={() => fileInputRef.current?.click()}
          data-testid="button-select-photo"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <Camera size={40} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-body">Tap to add photo</p>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={24} className="text-white animate-spin mx-auto mb-2" />
                <p className="text-white text-sm font-body">{progress}%</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); triggerHaptic("light"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold font-body transition ${
                category === cat.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
              data-testid={`button-category-${cat.value}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block font-body">Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="75"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body"
              data-testid="input-weight"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block font-body">Body Fat %</label>
            <input
              type="number"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="20"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body"
              data-testid="input-bodyfat"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-body">Date</label>
          <input
            type="date"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body"
            data-testid="input-date"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-body">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Feeling great today!"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body"
            data-testid="input-note"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!uploadedPath || isUploading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-[0.98] transition font-display"
          data-testid="button-save-photo"
        >
          {isUploading ? "Uploading..." : "Save Progress Photo"}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function ProgressSnapshots() {
  const [, navigate] = useLocation();
  const store = useStore();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<ProgressPhoto[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null);

  const userId = store.user?.id;

  const loadPhotos = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/progress-photos/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (e) {
      console.error("Failed to load progress photos:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleSavePhoto = async (data: any) => {
    if (!userId) return;
    try {
      const res = await authFetch("/api/progress-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...data }),
      });
      if (res.ok) {
        setShowAddSheet(false);
        toast({ title: "Photo saved!", description: "Your progress photo has been added." });
        loadPhotos();
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to save photo", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await authFetch(`/api/progress-photos/${id}`, { method: "DELETE" });
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      setViewingPhoto(null);
      triggerHaptic("medium");
      toast({ title: "Photo deleted" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const togglePhotoSelect = (photo: ProgressPhoto) => {
    triggerHaptic("light");
    setSelectedPhotos((prev) => {
      const exists = prev.find((p) => p.id === photo.id);
      if (exists) return prev.filter((p) => p.id !== photo.id);
      if (prev.length >= 2) return [prev[1], photo];
      return [...prev, photo];
    });
  };

  const filteredPhotos = filterCategory === "all"
    ? photos
    : photos.filter((p) => p.category === filterCategory);

  const groupedByMonth = filteredPhotos.reduce<Record<string, ProgressPhoto[]>>((acc, photo) => {
    const key = new Date(photo.takenAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});

  const firstPhoto = photos.length > 0 ? photos[photos.length - 1] : null;
  const latestPhoto = photos.length > 0 ? photos[0] : null;
  const totalDays = firstPhoto && latestPhoto ? daysBetween(firstPhoto.takenAt, latestPhoto.takenAt) : 0;
  const weightChange = firstPhoto?.weight && latestPhoto?.weight ? (latestPhoto.weight - firstPhoto.weight) : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 pt-12 pb-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center" data-testid="button-back">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-bold text-white font-display">Progress Snapshots</h1>
          <button
            onClick={() => { setShowAddSheet(true); triggerHaptic("medium"); }}
            className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
            data-testid="button-add-photo"
          >
            <Camera size={18} className="text-white" />
          </button>
        </div>

        {photos.length >= 2 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-white/50 text-[10px] font-body uppercase">Photos</p>
              <p className="text-white text-lg font-bold font-display">{photos.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-white/50 text-[10px] font-body uppercase">Journey</p>
              <p className="text-white text-lg font-bold font-display">{totalDays}d</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-white/50 text-[10px] font-body uppercase">Change</p>
              <p className={`text-lg font-bold font-display ${weightChange !== null && weightChange < 0 ? "text-emerald-400" : weightChange !== null && weightChange > 0 ? "text-red-400" : "text-white"}`}>
                {weightChange !== null ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)}kg` : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 -mt-2">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
          {[{ value: "all", label: "All" }, ...CATEGORIES].map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setFilterCategory(cat.value); triggerHaptic("light"); }}
              className={`px-4 py-2 rounded-full text-xs font-semibold font-body whitespace-nowrap transition ${
                filterCategory === cat.value
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-white text-slate-600 shadow-sm"
              }`}
              data-testid={`filter-${cat.value}`}
            >
              {cat.label}
            </button>
          ))}

          <div className="ml-auto" />
          {photos.length >= 2 && (
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedPhotos([]);
                triggerHaptic("medium");
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold font-body whitespace-nowrap transition ${
                compareMode
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "bg-white text-slate-600 shadow-sm"
              }`}
              data-testid="button-compare-toggle"
            >
              <Images size={14} className="inline mr-1" />
              {compareMode ? "Cancel" : "Compare"}
            </button>
          )}
        </div>

        {compareMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4"
          >
            <p className="text-orange-800 text-xs font-body">
              Select 2 photos to compare side by side ({selectedPhotos.length}/2 selected)
            </p>
            {selectedPhotos.length === 2 && (
              <button
                onClick={() => { setShowCompare(true); triggerHaptic("success"); }}
                className="mt-2 w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold font-display"
                data-testid="button-start-compare"
              >
                Compare Now
              </button>
            )}
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-blue-600 animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Camera size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-display mb-2">Start Your Journey</h3>
            <p className="text-sm text-slate-500 font-body mb-6 max-w-xs mx-auto">
              Take your first progress photo to start tracking your transformation over time
            </p>
            <button
              onClick={() => { setShowAddSheet(true); triggerHaptic("medium"); }}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold font-display shadow-lg shadow-blue-600/20"
              data-testid="button-first-photo"
            >
              Take First Photo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByMonth).map(([month, monthPhotos]) => (
              <div key={month}>
                <h3 className="text-sm font-semibold text-slate-500 font-body mb-3 uppercase tracking-wider">{month}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {monthPhotos.map((photo) => {
                    const isSelected = selectedPhotos.some((p) => p.id === photo.id);
                    return (
                      <motion.div
                        key={photo.id}
                        whileTap={{ scale: 0.95 }}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm cursor-pointer ${
                          isSelected ? "ring-3 ring-orange-500 ring-offset-2" : ""
                        }`}
                        onClick={() => {
                          if (compareMode) {
                            togglePhotoSelect(photo);
                          } else {
                            setViewingPhoto(photo);
                            triggerHaptic("light");
                          }
                        }}
                        data-testid={`photo-card-${photo.id}`}
                      >
                        <img
                          src={photo.imageUrl}
                          alt={`Progress ${photo.category}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                          <p className="text-white text-[10px] font-body font-medium">{formatShortDate(photo.takenAt)}</p>
                          {photo.weight && (
                            <p className="text-white/70 text-[9px] font-body">{photo.weight}kg</p>
                          )}
                        </div>
                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                          <p className="text-white text-[9px] font-body capitalize">{photo.category}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                            <p className="text-white text-xs font-bold">{selectedPhotos.findIndex((p) => p.id === photo.id) + 1}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddSheet && (
          <AddPhotoSheet
            onClose={() => setShowAddSheet(false)}
            onSave={handleSavePhoto}
            userWeight={store.user?.weight || undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between px-4 pt-12 pb-3">
              <button onClick={() => setViewingPhoto(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center" data-testid="button-close-view">
                <X size={20} className="text-white" />
              </button>
              <div className="text-center">
                <p className="text-white text-sm font-semibold font-display">{formatDate(viewingPhoto.takenAt)}</p>
                <p className="text-white/60 text-xs font-body capitalize">{viewingPhoto.category} view</p>
              </div>
              <button
                onClick={() => handleDelete(viewingPhoto.id)}
                className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center"
                data-testid="button-delete-photo"
              >
                <Trash2 size={18} className="text-red-400" />
              </button>
            </div>

            <div className="flex-1 px-4 flex items-center">
              <img
                src={viewingPhoto.imageUrl}
                alt="Progress"
                className="w-full max-h-[70vh] object-contain rounded-2xl"
              />
            </div>

            <div className="px-4 py-4 pb-8 space-y-3">
              <div className="flex gap-3">
                {viewingPhoto.weight && (
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <Scale size={16} className="text-blue-400 mx-auto mb-1" />
                    <p className="text-white text-sm font-bold font-display">{viewingPhoto.weight} kg</p>
                  </div>
                )}
                {viewingPhoto.bodyFatPercent && (
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-orange-400 text-lg mb-0.5">%</p>
                    <p className="text-white text-sm font-bold font-display">{viewingPhoto.bodyFatPercent}%</p>
                  </div>
                )}
              </div>
              {viewingPhoto.note && (
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/80 text-sm font-body">{viewingPhoto.note}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompare && selectedPhotos.length === 2 && (
          <CompareSlider
            leftPhoto={selectedPhotos[0].takenAt < selectedPhotos[1].takenAt ? selectedPhotos[0] : selectedPhotos[1]}
            rightPhoto={selectedPhotos[0].takenAt < selectedPhotos[1].takenAt ? selectedPhotos[1] : selectedPhotos[0]}
            onClose={() => setShowCompare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
