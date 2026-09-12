import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutTemplate,
  Plus,
  Copy,
  Trash2,
  Search,
  MoreVertical,
  Pencil,
  Calendar,
  User,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { MediaPicker } from '@/components/media/MediaPicker';
import { useSignedUrl } from '@/components/media/useSignedUrl';
import { PageHeaderIcon } from '@/components/ui/PageHeaderIcon';
import type { TemplateWithCreator } from '@/types';

/**
 * Fixed category list per the Phase 2 spec — unlike Songs (free-text
 * category), Templates use a curated set so the library stays organized.
 */
const TEMPLATE_CATEGORIES = [
  'Worship',
  'Sermon',
  'Bible',
  'Announcement',
  'Offering',
  'Welcome',
  'Christmas',
  'Easter',
  'Prayer',
  'General',
];

/**
 * Seed shape for `template_data` (stored in the `config` column). Phase 2
 * only manages template *metadata* — the actual visual editor that reads
 * and writes into this structure belongs to Phase 3's slide editor.
 */
function defaultTemplateData(): Record<string, unknown> {
  return {
    canvas: { width: 1920, height: 1080 },
    background: {},
    objects: [],
  };
}

interface TemplateFormState {
  name: string;
  category: string;
  description: string;
  thumbnailPath: string;
}

const EMPTY_FORM: TemplateFormState = { name: '', category: '', description: '', thumbnailPath: '' };

export function TemplatesPage() {
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState<TemplateWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');

  // Arriving from the Command Palette with a search term already chosen.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearch(q);
  }, [searchParams]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<TemplateWithCreator | null>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TemplateWithCreator | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [previewTarget, setPreviewTarget] = useState<TemplateWithCreator | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('templates')
      .select('*, creator:profiles!templates_created_by_fkey(full_name, role)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching templates:', fetchError.message);
      setError('Failed to load templates. Please try again.');
      setLoading(false);
      return;
    }

    setTemplates((data as TemplateWithCreator[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function openCreate() {
    setFormMode('create');
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(template: TemplateWithCreator) {
    setMenuOpen(null);
    setFormMode('edit');
    setEditTarget(template);
    setForm({
      name: template.name,
      category: template.category ?? '',
      description: template.description ?? '',
      thumbnailPath: template.thumbnail_url ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      category: form.category || null,
      description: form.description.trim() || null,
      thumbnail_url: form.thumbnailPath.trim() || null,
    };

    if (formMode === 'create') {
      const { error: createErr } = await supabase.from('templates').insert({
        ...payload,
        config: defaultTemplateData(),
      });

      if (createErr) {
        console.error('Error creating template:', createErr.message);
        setFormError('Failed to create template. Please try again.');
        setSaving(false);
        return;
      }
    } else if (editTarget) {
      const { error: updateErr } = await supabase.from('templates').update(payload).eq('id', editTarget.id);

      if (updateErr) {
        console.error('Error updating template:', updateErr.message);
        setFormError('Failed to save changes. Please try again.');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setFormOpen(false);
    fetchTemplates();
  }

  async function handleDuplicate(template: TemplateWithCreator) {
    setMenuOpen(null);
    setError(null);

    const { error: dupError } = await supabase.from('templates').insert({
      name: `${template.name} (Copy)`,
      category: template.category,
      description: template.description,
      thumbnail_url: template.thumbnail_url,
      config: template.config,
    });

    if (dupError) {
      console.error('Error duplicating template:', dupError.message);
      setError('Failed to duplicate template. Please try again.');
      return;
    }

    fetchTemplates();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const { error: deleteErr } = await supabase.from('templates').delete().eq('id', deleteTarget.id);

    if (deleteErr) {
      console.error('Error deleting template:', deleteErr.message);
      setDeleteError('Failed to delete this template. Please try again.');
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setDeleteTarget(null);
    fetchTemplates();
  }

  const filtered = templates.filter((t) => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return t.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <PageHeaderIcon icon={LayoutTemplate} />
          <div>
            <h1 className="text-2xl font-bold font-display text-zinc-900">Templates</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Reusable slide designs, ready to load straight into the Slide Editor.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
        />
      </div>

      {/* Category filter */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <Button variant={categoryFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCategoryFilter('all')}>
          All
        </Button>
        {TEMPLATE_CATEGORIES.map((c) => (
          <Button key={c} variant={categoryFilter === c ? 'secondary' : 'ghost'} size="sm" onClick={() => setCategoryFilter(c)}>
            {c}
          </Button>
        ))}
      </div>

      {error && (
        <div className="mb-6">
          <Alert message={error} onRetry={fetchTemplates} />
        </div>
      )}

      {/* Content */}
      {error ? null : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-zinc-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={LayoutTemplate}
            title={search || categoryFilter !== 'all' ? 'No matching templates' : 'No templates yet'}
            description={
              search || categoryFilter !== 'all'
                ? 'Try a different search term or category.'
                : 'Create your first reusable slide template to get started.'
            }
            action={
              !search && categoryFilter === 'all' && (
                <Button variant="primary" onClick={openCreate}>
                  <Plus className="w-4 h-4" />
                  New Template
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              menuOpen={menuOpen === template.id}
              onToggleMenu={() => setMenuOpen(menuOpen === template.id ? null : template.id)}
              onCloseMenu={() => setMenuOpen(null)}
              onPreview={() => setPreviewTarget(template)}
              onEdit={() => openEdit(template)}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => {
                setMenuOpen(null);
                setDeleteError(null);
                setDeleteTarget(template);
              }}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === 'create' ? 'New Template' : 'Edit Template'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!form.name.trim() || saving}>
              {saving ? 'Saving…' : formMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <Alert message={formError} />}
          <Input
            label="Name"
            placeholder="e.g. Sunday Worship Title Slide"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
            >
              <option value="">No category</option>
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What this template is for…"
              rows={3}
              className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 px-4 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Thumbnail</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Paste an image URL, or choose from Media"
                value={form.thumbnailPath}
                onChange={(e) => setForm((f) => ({ ...f, thumbnailPath: e.target.value }))}
                className="flex-1"
              />
              <Button variant="outline" size="md" onClick={() => setThumbnailPickerOpen(true)}>
                <ImageIcon className="w-4 h-4" /> Choose
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Thumbnail picker (sibling overlay — stacks above the form modal since it renders later in the DOM) */}
      <Modal open={thumbnailPickerOpen} onClose={() => setThumbnailPickerOpen(false)} title="Choose Thumbnail">
        <MediaPicker
          accept={['image']}
          multiple={false}
          onSelect={(items) => {
            if (items[0]) {
              setForm((f) => ({ ...f, thumbnailPath: items[0].url }));
              setThumbnailPickerOpen(false);
            }
          }}
          onCancel={() => setThumbnailPickerOpen(false)}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        title="Delete Template"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : (<><Trash2 className="w-4 h-4" /> Delete</>)}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {deleteError && <Alert message={deleteError} />}
          <p className="text-sm text-zinc-600 leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-zinc-800">{deleteTarget?.name}</span>? This cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Preview */}
      <Modal open={!!previewTarget} onClose={() => setPreviewTarget(null)} title={previewTarget?.name ?? 'Preview'}>
        {previewTarget && <TemplatePreview template={previewTarget} />}
      </Modal>
    </div>
  );
}

function TemplatePreview({ template }: { template: TemplateWithCreator }) {
  return (
    <div className="flex flex-col gap-4">
      <TemplateThumbnail path={template.thumbnail_url} className="w-full aspect-video rounded-xl" iconSize="lg" />
      <div className="flex items-center gap-2 flex-wrap">
        {template.category && <Badge variant="info">{template.category}</Badge>}
        <Badge variant="default">
          {typeof (template.config as { canvas?: { width?: number; height?: number } })?.canvas?.width === 'number'
            ? `${(template.config as { canvas: { width: number; height: number } }).canvas.width}×${(template.config as { canvas: { width: number; height: number } }).canvas.height}`
            : '1920×1080'}
        </Badge>
      </div>
      {template.description && <p className="text-sm text-zinc-600 leading-relaxed">{template.description}</p>}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
          Template data (loaded directly by the Slide Editor)
        </p>
        <pre className="text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 overflow-x-auto max-h-40">
          {JSON.stringify(template.config, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function TemplateThumbnail({
  path,
  className = '',
  iconSize = 'sm',
}: {
  path: string | null;
  className?: string;
  iconSize?: 'sm' | 'lg';
}) {
  const isExternal = !!path && /^https?:\/\//.test(path);
  const resolvedInternal = useSignedUrl(isExternal ? null : path);
  const src = isExternal ? path : resolvedInternal;

  return (
    <div className={`bg-white/60 flex items-center justify-center overflow-hidden ${className}`}>
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <LayoutTemplate className={iconSize === 'lg' ? 'w-10 h-10 text-zinc-300' : 'w-8 h-8 text-zinc-300'} />
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: TemplateWithCreator;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, menuOpen, onToggleMenu, onCloseMenu, onPreview, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  return (
    <Card className="p-0 overflow-hidden relative group hover:border-brand-800/40 transition-all cursor-pointer" onClick={onPreview}>
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
          className="p-1.5 rounded-lg bg-black/50 text-zinc-100 hover:bg-black/70 transition-all"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-0" onClick={(e) => { e.stopPropagation(); onCloseMenu(); }} />
            <div className="absolute right-0 mt-1 w-36 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(); onCloseMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-zinc-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>

      <TemplateThumbnail path={template.thumbnail_url} className="aspect-video" />

      <div className="p-4">
        <h3 className="text-sm font-semibold text-zinc-900 mb-1 truncate">{template.name}</h3>
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {template.category && <Badge variant="info">{template.category}</Badge>}
        </div>
        {template.description && <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{template.description}</p>}
        <div className="flex items-center gap-3 pt-3 border-t border-zinc-200/60 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(template.created_at).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1 truncate">
            <User className="w-3 h-3" />
            {template.creator?.full_name ?? 'Unknown'}
          </span>
        </div>
      </div>
    </Card>
  );
}
