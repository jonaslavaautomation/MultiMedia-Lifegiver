import { useRef, useState } from 'react';
import { AlignVerticalSpaceAround } from 'lucide-react';
import { PortalDropdown } from '@/components/ui/PortalDropdown';
import { Tooltip } from '@/components/ui/Tooltip';

interface TextSpacingPopoverProps {
  lineHeight: number;
  charSpacing: number;
  onLineHeightChange: (value: number) => void;
  onCharSpacingChange: (value: number) => void;
}

/** Toolbar popover for line-height and letter-spacing — tucked away rather than two more always-visible controls, matching how Canva itself groups spacing behind one button instead of crowding the main bar. */
export function TextSpacingPopover({ lineHeight, charSpacing, onLineHeightChange, onCharSpacingChange }: TextSpacingPopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <Tooltip label="Line height & letter spacing">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center p-1.5 rounded-lg transition-all ${open ? 'bg-brand-100 text-brand-600' : 'text-zinc-700 hover:bg-zinc-100'}`}
        >
          <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
        </button>
      </Tooltip>

      <PortalDropdown open={open} onClose={() => setOpen(false)} anchorRef={triggerRef}>
        <div className="w-56 bg-white border border-zinc-200 rounded-xl shadow-xl p-3 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Line height</label>
              <span className="text-[10px] text-zinc-500 tabular-nums">{lineHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={lineHeight}
              onChange={(e) => onLineHeightChange(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Letter spacing</label>
              <span className="text-[10px] text-zinc-500 tabular-nums">{charSpacing}</span>
            </div>
            <input
              type="range"
              min={-200}
              max={800}
              step={10}
              value={charSpacing}
              onChange={(e) => onCharSpacingChange(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}
