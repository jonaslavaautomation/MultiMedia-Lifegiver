import { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, Shield, Church, Info, Palette, Plus, X, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBrandSettings } from '@/hooks/useBrandSettings';
import { supabase } from '@/lib/supabase';
import { EDITOR_FONTS } from '@/lib/editorConstants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { MediaPicker } from '@/components/media/MediaPicker';
import { useSignedUrl } from '@/components/media/useSignedUrl';
import { PageHeaderIcon } from '@/components/ui/PageHeaderIcon';
import { SystemHealthCard } from '@/components/settings/SystemHealthCard';
import type { MediaItem } from '@/types';

const MAX_BRAND_COLORS = 12;

export function SettingsPage() {
  const { profile, user } = useAuth();
  const { colors, logoUrl, fontFamily, settings, loading: brandLoading, refresh: refreshBrand } = useBrandSettings();

  // Local editable copy — seeded once from the loaded settings, not kept in
  // lockstep afterward (this page owns the form while it's open; refresh()
  // after a successful save just confirms the same values we already have).
  const initializedRef = useRef(false);
  const [editColors, setEditColors] = useState<string[]>([]);
  const [editFont, setEditFont] = useState('Poppins');
  const [pickedLogo, setPickedLogo] = useState<MediaItem | null>(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initializedRef.current || brandLoading) return;
    initializedRef.current = true;
    setEditColors(colors);
    setEditFont(fontFamily);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandLoading]);

  const pickedLogoPreview = useSignedUrl(pickedLogo?.url ?? null);
  const logoPreviewUrl = logoCleared ? null : (pickedLogoPreview ?? logoUrl);

  function updateColor(index: number, hex: string) {
    setEditColors((prev) => prev.map((c, i) => (i === index ? hex : c)));
  }

  function removeColor(index: number) {
    setEditColors((prev) => prev.filter((_, i) => i !== index));
  }

  function addColor() {
    setEditColors((prev) => [...prev, '#2f8271']);
  }

  async function handleSaveBrandKit() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const { error } = await supabase
      .from('brand_settings')
      .update({
        colors: editColors,
        font_family: editFont,
        logo_media_id: logoCleared ? null : (pickedLogo?.id ?? settings?.logo_media_id ?? null),
        updated_by: user?.id ?? null,
      })
      .eq('id', 1);

    setSaving(false);
    if (error) {
      console.error('Error saving brand settings:', error.message);
      setSaveError('Failed to save your Brand Kit. Please try again.');
      return;
    }

    setPickedLogo(null);
    setLogoCleared(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refreshBrand();
  }

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3.5 mb-6">
        <PageHeaderIcon icon={SettingsIcon} />
        <div>
          <h1 className="text-2xl font-bold font-display text-zinc-900">Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Application configuration and preferences.</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <SystemHealthCard />

        {/* Brand Kit */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Brand Kit</h2>
              <p className="text-xs text-zinc-500">Colors, font, and logo used across the Slide Editor's Brand panel.</p>
            </div>
          </div>

          {brandLoading ? (
            <div className="h-32 rounded-xl bg-zinc-100 animate-pulse" />
          ) : (
            <div className="flex flex-col gap-5">
              {saveError && <Alert message={saveError} />}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Brand colors</label>
                <div className="flex flex-wrap gap-3">
                  {editColors.map((hex, i) => (
                    <div key={i} className="relative group">
                      <input
                        type="color"
                        value={hex}
                        onChange={(e) => updateColor(i, e.target.value)}
                        className="w-11 h-11 rounded-full border-2 border-zinc-200 cursor-pointer overflow-hidden"
                        title={hex}
                      />
                      {editColors.length > 1 && (
                        <button
                          onClick={() => removeColor(i)}
                          title="Remove color"
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editColors.length < MAX_BRAND_COLORS && (
                    <button
                      onClick={addColor}
                      title="Add a color"
                      className="w-11 h-11 rounded-full border-2 border-dashed border-zinc-300 text-zinc-400 hover:border-brand-500 hover:text-brand-600 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Primary font</label>
                <select
                  value={editFont}
                  onChange={(e) => setEditFont(e.target.value)}
                  className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
                >
                  {EDITOR_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Logo</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="" className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLogoCleared(false);
                        setLogoPickerOpen(true);
                      }}
                    >
                      Choose from Media
                    </Button>
                    {logoPreviewUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPickedLogo(null);
                          setLogoCleared(true);
                        }}
                      >
                        Use default logo instead
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Button variant="primary" onClick={() => void handleSaveBrandKit()} disabled={saving}>
                  {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Brand Kit'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Logo picker */}
        <Modal open={logoPickerOpen} onClose={() => setLogoPickerOpen(false)} title="Choose Logo">
          <MediaPicker
            accept={['image']}
            multiple={false}
            onSelect={(items) => {
              if (items[0]) {
                setPickedLogo(items[0]);
                setLogoCleared(false);
                setLogoPickerOpen(false);
              }
            }}
            onCancel={() => setLogoPickerOpen(false)}
          />
        </Modal>

        {/* Application info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
              <Church className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Application</h2>
              <p className="text-xs text-zinc-500">LifeGiver Media Studio</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/40 border border-zinc-200/50 p-4">
              <p className="text-xs text-zinc-500 mb-1">Version</p>
              <p className="text-sm font-medium text-zinc-800">Phase 3 — Live Presentation</p>
            </div>
            <div className="rounded-xl bg-white/40 border border-zinc-200/50 p-4">
              <p className="text-xs text-zinc-500 mb-1">Current Phase</p>
              <p className="text-sm font-medium text-zinc-800">3 of 3</p>
            </div>
          </div>
        </Card>

        {/* Your account */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-zinc-600" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900">Your Account</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-zinc-600">Display Name</span>
              <span className="text-sm font-medium text-zinc-800">{profile?.full_name ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-zinc-200/60">
              <span className="text-sm text-zinc-600">Role</span>
              <Badge variant={profile?.role === 'admin' ? 'danger' : 'info'}>
                <Shield className="w-3 h-3" />
                {profile?.role ?? 'media'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-zinc-200/60">
              <span className="text-sm text-zinc-600">Account Created</span>
              <span className="text-sm font-medium text-zinc-800">
                {profile ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </Card>

        {/* Phase info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-zinc-600" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900">Feature Phases</h2>
          </div>
          <div className="space-y-3">
            {[
              { phase: 'Phase 1', label: 'Foundation — Auth, Dashboard, Presentations', done: true },
              { phase: 'Phase 2', label: 'Songs, Bible, Media, Templates', done: true },
              { phase: 'Phase 3', label: 'Slide Editor & Live Presentation Mode', done: true },
            ].map((item) => (
              <div key={item.phase} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-600 w-16">{item.phase}</span>
                  <span className="text-sm text-zinc-700">{item.label}</span>
                </div>
                {item.done ? (
                  <Badge variant="success">Complete</Badge>
                ) : (
                  <Badge variant="default">Upcoming</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
