import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import { MonacoBinding } from 'y-monaco';
import type * as Monaco from 'monaco-editor';
import { supabase } from '@/integrations/supabase/client';
import { fromBase64, getUserColor, toBase64 } from '@/lib/collab-encoding';

export type SyncStatus = 'connecting' | 'synced' | 'saving' | 'saved' | 'offline' | 'error';

interface Params {
  roomId?: string;
  fileId?: string;
  /** Content stored in the database; only used to seed an empty document. */
  initialContent: string;
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  userId?: string;
  userName: string;
  /** Set false for read-only participants. */
  canEdit?: boolean;
}

interface Peer {
  id: string;
  name: string;
  color: string;
}

const SEED_GRACE_MS = 700;
const PERSIST_DEBOUNCE_MS = 1200;

/**
 * Conflict-safe collaborative editing for a single file.
 *
 * A Yjs document is replicated over a Supabase broadcast channel, so concurrent
 * edits merge instead of overwriting each other (the previous implementation
 * pushed whole-file snapshots, which was last-write-wins). The database keeps a
 * debounced snapshot purely for durability/recovery.
 */
export const useYjsCollaboration = ({
  roomId,
  fileId,
  initialContent,
  editor,
  userId,
  userName,
  canEdit = true,
}: Params) => {
  const [status, setStatus] = useState<SyncStatus>('connecting');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);

  const docRef = useRef<Y.Doc | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTextRef = useRef<string>(initialContent);

  useEffect(() => {
    if (!roomId || !fileId || !editor || !userId) return;
    const model = editor.getModel();
    if (!model) return;

    let disposed = false;
    const doc = new Y.Doc();
    docRef.current = doc;
    const yText = doc.getText('monaco');
    const awareness = new Awareness(doc);
    awareness.setLocalStateField('user', {
      name: userName,
      color: getUserColor(userId),
      id: userId,
    });

    const channel = supabase.channel(`yjs:${roomId}:${fileId}`, {
      config: { broadcast: { self: false } },
    });

    const send = (event: string, payload: Record<string, unknown>) => {
      channel.send({ type: 'broadcast', event, payload }).catch(() => {
        setStatus('offline');
      });
    };

    // ── Document replication ───────────────────────────────
    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote') {
        send('doc-update', { update: toBase64(update) });
        setHasUnsyncedChanges(true);
        schedulePersist();
      }
    };
    doc.on('update', onDocUpdate);

    const onAwarenessUpdate = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      const changed = [...added, ...updated, ...removed];
      if (origin !== 'remote') {
        send('awareness', { update: toBase64(encodeAwarenessUpdate(awareness, changed)) });
      }
      const states = Array.from(awareness.getStates().entries())
        .filter(([clientId]) => clientId !== doc.clientID)
        .map(([clientId, state]) => {
          const user = (state as { user?: Peer }).user;
          return {
            id: user?.id ?? String(clientId),
            name: user?.name ?? 'Collaborator',
            color: user?.color ?? '#888888',
          };
        });
      setPeers(states);
    };
    awareness.on('update', onAwarenessUpdate);

    // ── Persistence (debounced snapshot for recovery) ──────
    const persistNow = async () => {
      const content = yText.toString();
      latestTextRef.current = content;
      setStatus('saving');
      const { error } = await supabase
        .from('collaboration_files')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', fileId);
      if (disposed) return;
      if (error) {
        setStatus('error');
        return;
      }
      setHasUnsyncedChanges(false);
      setStatus('saved');
    };

    function schedulePersist() {
      if (!canEdit) return;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        void persistNow();
      }, PERSIST_DEBOUNCE_MS);
    }

    // ── Channel wiring ─────────────────────────────────────
    let receivedPeerState = false;

    channel
      .on('broadcast', { event: 'doc-update' }, ({ payload }) => {
        const raw = (payload as { update?: string }).update;
        if (!raw) return;
        Y.applyUpdate(doc, fromBase64(raw), 'remote');
      })
      .on('broadcast', { event: 'awareness' }, ({ payload }) => {
        const raw = (payload as { update?: string }).update;
        if (!raw) return;
        applyAwarenessUpdate(awareness, fromBase64(raw), 'remote');
      })
      .on('broadcast', { event: 'sync-request' }, ({ payload }) => {
        const raw = (payload as { stateVector?: string }).stateVector;
        if (!raw) return;
        const diff = Y.encodeStateAsUpdate(doc, fromBase64(raw));
        send('sync-response', { update: toBase64(diff) });
      })
      .on('broadcast', { event: 'sync-response' }, ({ payload }) => {
        const raw = (payload as { update?: string }).update;
        if (!raw) return;
        receivedPeerState = true;
        Y.applyUpdate(doc, fromBase64(raw), 'remote');
        setStatus('synced');
      })
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          setStatus('synced');
          send('sync-request', { stateVector: toBase64(Y.encodeStateVector(doc)) });
          send('awareness', {
            update: toBase64(encodeAwarenessUpdate(awareness, [doc.clientID])),
          });
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          setStatus('offline');
        } else if (state === 'CLOSED') {
          setStatus('offline');
        }
      });

    // Seed the document from the stored snapshot only when nobody else has state.
    const seedTimer = setTimeout(() => {
      if (disposed) return;
      if (!receivedPeerState && yText.length === 0 && initialContent.length > 0) {
        yText.insert(0, initialContent);
      }
    }, SEED_GRACE_MS);

    const binding = new MonacoBinding(yText, model, new Set([editor]), awareness);
    editor.updateOptions({ readOnly: !canEdit });

    return () => {
      disposed = true;
      clearTimeout(seedTimer);
      if (persistTimer.current) clearTimeout(persistTimer.current);
      // Flush any pending edits before tearing the session down.
      if (canEdit && yText.toString() !== latestTextRef.current) {
        void supabase
          .from('collaboration_files')
          .update({ content: yText.toString(), updated_at: new Date().toISOString() })
          .eq('id', fileId);
      }
      awareness.off('update', onAwarenessUpdate);
      doc.off('update', onDocUpdate);
      removeAwarenessStates(awareness, [doc.clientID], 'unmount');
      binding.destroy();
      awareness.destroy();
      supabase.removeChannel(channel);
      doc.destroy();
      docRef.current = null;
      setPeers([]);
    };
    // `initialContent` intentionally excluded: it only seeds a brand-new document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, fileId, editor, userId, userName, canEdit]);

  return { status, peers, hasUnsyncedChanges };
};
