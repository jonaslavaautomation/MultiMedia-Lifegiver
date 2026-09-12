import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { SongSectionType } from '@/types';

interface AddSectionModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: SongSectionType) => void;
}

const SECTION_TYPES: SongSectionType[] = ['intro', 'verse', 'pre-chorus', 'chorus', 'refrain', 'bridge', 'tag', 'outro'];

export function AddSectionModal({ open, onClose, onAdd }: AddSectionModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add Section">
      <div className="grid grid-cols-2 gap-2">
        {SECTION_TYPES.map((type) => (
          <Button
            key={type}
            variant="outline"
            onClick={() => {
              onAdd(type);
              onClose();
            }}
            className="capitalize justify-center"
          >
            {type}
          </Button>
        ))}
      </div>
    </Modal>
  );
}
