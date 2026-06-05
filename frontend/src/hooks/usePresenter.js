import { useEffect, useRef } from 'react';
import { PRESENT_CHANNEL, MSG, channelSupported } from '../components/present/channel';

// Teacher side. Broadcasts the question currently on screen to the projector
// window and answers a freshly-opened projector's HELLO with the latest one.
// `payload` should be a stable object ({ number, question, options }) or null.
export function usePresenter(payload) {
  const channelRef = useRef(null);
  const latest = useRef(payload);
  latest.current = payload;

  useEffect(() => {
    if (!channelSupported) return undefined;
    const channel = new BroadcastChannel(PRESENT_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.kind === MSG.HELLO && latest.current) {
        channel.postMessage({ kind: MSG.SHOW, q: latest.current });
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (payload && channelRef.current) {
      channelRef.current.postMessage({ kind: MSG.SHOW, q: payload });
    }
  }, [payload]);
}
