import { Drawer } from "vaul";
import { triggerHaptic } from "@/lib/capacitor";
import { useEffect } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}

export function BottomSheet({ open, onClose, children, maxHeight = "90vh" }: BottomSheetProps) {
  useEffect(() => {
    if (open) triggerHaptic("light");
  }, [open]);

  return (
    <Drawer.Root open={open} onOpenChange={v => { if (!v) { triggerHaptic("light"); onClose(); } }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col bg-white rounded-t-[28px] shadow-2xl"
          style={{ maxHeight }}
        >
          <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
