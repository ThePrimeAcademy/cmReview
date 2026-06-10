import { useEffect, useRef } from 'react';
import { PRESENT_CHANNEL, MSG, channelSupported } from '../components/present/channel';
import { collectRegions, normalizeStrokes, subscribeStrokes } from '../components/annotation/mirror';

// Teacher side. Broadcasts the question currently on screen — plus the
// work-space state and live pen strokes — to the projector window, and
// answers a freshly-opened projector's HELLO with the latest of everything.
// `payload` should be a stable object ({ id, number, question, options }) or
// null; `workOpen` drives the projector's blank work panel.
export function usePresenter(payload, workOpen = false) {
  const channelRef = useRef(null);
  const latest = useRef({ payload, workOpen });
  latest.current = { payload, workOpen };
  // Raw document-space strokes from AnnotationLayer, kept to re-send on
  // HELLO and to re-measure against the layout when the window resizes.
  const rawStrokes = useRef([]);

  const sendShow = () => {
    const { payload: q, workOpen: open } = latest.current;
    if (q && channelRef.current) channelRef.current.postMessage({ kind: MSG.SHOW, q, workOpen: open });
  };

  const sendStrokes = () => {
    const q = latest.current.payload;
    if (!q || !channelRef.current) return;
    channelRef.current.postMessage({
      kind: MSG.STROKES,
      qid: q.id,
      strokes: normalizeStrokes(rawStrokes.current, collectRegions()),
    });
  };

  useEffect(() => {
    if (!channelSupported) return undefined;
    const channel = new BroadcastChannel(PRESENT_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.kind === MSG.HELLO) {
        sendShow();
        sendStrokes();
      }
    };

    const unsubscribe = subscribeStrokes((strokes) => {
      rawStrokes.current = strokes;
      sendStrokes();
    });
    // Resizing reflows the page under the document-space strokes, so their
    // landmark-relative positions change — re-measure and re-send.
    const onResize = () => sendStrokes();
    window.addEventListener('resize', onResize);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', onResize);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // New question or work toggle: re-announce, then re-send the strokes the
  // pen already holds for this page (e.g. returning to an annotated question).
  useEffect(() => {
    if (!payload) return;
    sendShow();
    sendStrokes();
  }, [payload, workOpen]);
}
