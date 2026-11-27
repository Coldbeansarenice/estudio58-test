// VIDEO ADAPTER (Mux now proposed; Bunny Stream could be swapped in here)
// Phase 1 (now): demo. There are no video files; the player shows a labelled stand-in.
// Phase 6: replace `demoVideo` with a Mux version:
//   - getPlayback asks a server function for a short-lived SIGNED playback token,
//     after the server checks the member's webhook-confirmed subscription.
//   - Raw video URLs are never stored in, or returned from, the database.
//   - upload uses Mux direct uploads from /admin.
import type { Lang } from '../types';

export type Playback =
  | { kind: 'demo' }
  | { kind: 'signed'; src: string; expiresAt: string };

export interface VideoAdapter {
  readonly mode: 'demo' | 'mux' | 'bunny';
  getPlayback(videoId: string, lang: Lang): Promise<Playback>;
  /** Admin upload. Returns the service's asset id, never a URL. */
  upload(file: File): Promise<{ assetId: string | null; demo: boolean }>;
}

const demoVideo: VideoAdapter = {
  mode: 'demo',
  async getPlayback() { return { kind: 'demo' }; },
  async upload() { return { assetId: null, demo: true }; },
};

export const video: VideoAdapter = demoVideo;
