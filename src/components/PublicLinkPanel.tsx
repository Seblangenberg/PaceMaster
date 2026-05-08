'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { Copy, ExternalLink, Globe, Download, Printer } from 'lucide-react';

interface PublicLinkPanelProps {
  eventId: string;
  publicSlug?: string;
  onSlugChange: (slug: string | undefined) => void;
  eventName?: string;
}

const slugify = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

export default function PublicLinkPanel({ eventId, publicSlug, onSlugChange, eventName }: PublicLinkPanelProps) {
  const { toast } = useToast();
  const { claimPublicSlug, releasePublicSlug } = useCloudStorage();
  const [enabled, setEnabled] = useState<boolean>(!!publicSlug);
  const [draft, setDraft] = useState<string>(publicSlug ?? '');
  const [busy, setBusy] = useState(false);
  const hiResQrRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setEnabled(!!publicSlug);
    setDraft(publicSlug ?? '');
  }, [publicSlug]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const liveUrl = publicSlug ? `${origin}/live/?e=${publicSlug}` : null;

  const handleEnableToggle = async (next: boolean) => {
    if (next === enabled) return;
    setEnabled(next);
    if (!next && publicSlug) {
      setBusy(true);
      try {
        await releasePublicSlug(publicSlug);
        onSlugChange(undefined);
        toast({ title: 'Public link disabled' });
      } finally {
        setBusy(false);
      }
    }
  };

  const handleSave = async () => {
    const normalized = slugify(draft);
    if (!normalized) {
      toast({
        title: 'Invalid link',
        description: 'Use lowercase letters, numbers, and hyphens.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      // If changing slug, release the old one after the new one is claimed
      // so the link is never broken in between.
      await claimPublicSlug(normalized, eventId);
      if (publicSlug && publicSlug !== normalized) {
        await releasePublicSlug(publicSlug);
      }
      onSlugChange(normalized);
      toast({ title: 'Public link saved', description: `Live results: /live/?e=${normalized}` });
    } catch (err) {
      toast({
        title: 'Could not save link',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!liveUrl) return;
    try {
      await navigator.clipboard.writeText(liveUrl);
      toast({ title: 'Link copied', description: liveUrl });
    } catch {
      toast({ title: 'Copy failed', description: 'Select and copy the link manually.', variant: 'destructive' });
    }
  };

  const handleDownloadQr = () => {
    if (!liveUrl) return;
    const canvas = hiResQrRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `pacemaster-${publicSlug ?? 'event'}-qr.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export QR PNG:', err);
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  };

  const handlePrintQr = () => {
    if (!liveUrl) return;
    const canvas = hiResQrRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
    if (!win) {
      toast({
        title: 'Pop-up blocked',
        description: 'Allow pop-ups to print, or use Download instead.',
        variant: 'destructive',
      });
      return;
    }
    const safeName = (eventName ?? 'Live Results').replace(/[<>&"']/g, ' ');
    const safeUrl = liveUrl.replace(/[<>&"']/g, '');
    win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeName} — Live Results QR</title>
<style>
  @page { size: auto; margin: 12mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #154734; text-align: center; padding: 24px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 14px; font-weight: normal; color: #555; margin: 0 0 24px; letter-spacing: 0.12em; text-transform: uppercase; }
  img { width: 480px; height: 480px; image-rendering: pixelated; }
  .url { margin-top: 16px; font-family: ui-monospace, monospace; font-size: 14px; color: #333; word-break: break-all; }
  .hint { margin-top: 24px; font-size: 12px; color: #666; }
</style>
</head>
<body>
  <h1>${safeName}</h1>
  <h2>Scan for live results</h2>
  <img src="${dataUrl}" alt="Live results QR code" />
  <div class="url">${safeUrl}</div>
  <div class="hint">Powered by PaceMaster</div>
  <script>window.onload = () => { window.focus(); window.print(); };</script>
</body>
</html>`);
    win.document.close();
  };

  const dirty = enabled && slugify(draft) !== (publicSlug ?? '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Public Live Link
        </CardTitle>
        <CardDescription>
          Share live results with riders, friends, and spectators. Updates in real time as teams finish.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div>
            <Label className="font-medium">Enable public link</Label>
            <p className="text-sm text-muted-foreground">Anyone with the link can view results — no login required.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleEnableToggle} disabled={busy} />
        </div>

        {enabled && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="public-slug">Custom URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{origin}/live/?e=</span>
                <Input
                  id="public-slug"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="spring-hunter-pace-2026"
                  className="flex-1"
                  disabled={busy}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens (e.g., <code>moc-spring-2026</code>).
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={busy || !dirty || !slugify(draft)}>
                {publicSlug ? 'Update link' : 'Create link'}
              </Button>
              {liveUrl && (
                <>
                  <Button type="button" variant="outline" onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" /> Copy URL
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => window.open(liveUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> Open
                  </Button>
                </>
              )}
            </div>

            {liveUrl && (
              <div className="rounded-md bg-muted/50 p-3 text-sm font-mono break-all">{liveUrl}</div>
            )}

            {liveUrl && (
              <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-start rounded-md border p-4">
                <div className="flex justify-center">
                  <div className="rounded-md bg-white p-3 shadow-sm">
                    <QRCodeCanvas
                      value={liveUrl}
                      size={176}
                      level="M"
                      marginSize={2}
                      bgColor="#ffffff"
                      fgColor="#154734"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Scan to open the live results</p>
                  <p className="text-sm text-muted-foreground">
                    Print this QR for posting at the start, finish, parking, or food tent.
                    Anyone who scans gets the live page — no app, no login.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={handleDownloadQr}>
                      <Download className="mr-2 h-4 w-4" /> Download PNG
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handlePrintQr}>
                      <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                  </div>
                </div>

                {/* Hidden high-res canvas used as the source for download/print. */}
                <div className="hidden" aria-hidden="true">
                  <QRCodeCanvas
                    ref={hiResQrRef}
                    value={liveUrl}
                    size={1024}
                    level="H"
                    marginSize={4}
                    bgColor="#ffffff"
                    fgColor="#154734"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
