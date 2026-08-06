import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  description?: string;
}

/**
 * Reusable share modal with copy-to-clipboard, QR code, and native share.
 * Always shares the published (non-preview) URL when possible.
 */
export function ShareModal({ open, onOpenChange, url, title = 'Share', description }: ShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied', description: 'Paste it anywhere to share.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Select the URL and copy manually.', variant: 'destructive' });
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title, text: description, url });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-lg bg-white p-4">
            <QRCodeSVG value={url} size={180} level="M" />
          </div>
          <p className="text-xs text-muted-foreground">Scan the QR code or copy the link below.</p>
        </div>

        <div className="flex gap-2">
          <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
          <Button onClick={copy} variant="outline" size="icon" aria-label="Copy link">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button onClick={nativeShare} className="w-full gap-2">
            <Share2 className="h-4 w-4" /> Share via…
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Build a shareable URL that always resolves to the published site, avoiding login-gated preview hosts. */
export function buildShareUrl(path: string): string {
  if (typeof window === 'undefined') return `https://the-night-club.lovable.app${path}`;
  const isPreview = window.location.hostname.startsWith('id-preview--') || window.location.hostname.endsWith('.lovableproject.com');
  const origin = isPreview ? 'https://the-night-club.lovable.app' : window.location.origin;
  return `${origin}${path}`;
}

/** The only public profile URL shape. Returns null until a username exists. */
export function buildProfilePath(username?: string | null): string | null {
  const normalized = username?.trim().replace(/^@+/, '').replace(/\/+$/, '');
  return normalized ? `/in/${encodeURIComponent(normalized)}/` : null;
}
