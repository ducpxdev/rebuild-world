/**
 * Per-story reading progress, stored in localStorage.
 *
 * `rw_progress_<storyId>` — the last chapter opened. StoryPage reads
 *   `chapterNumber` / `title` from it for the "Continue" button; the optional
 *   `chapterId` / `scrollPct` fields let the reader resume mid-chapter.
 * `rw_read_<storyId>` — ids of chapters the reader has finished. Chapter ids
 *   are used rather than numbers so the record survives chapter reordering.
 */

export interface StoredProgress {
  chapterNumber: number;
  title: string;
  updatedAt: number;
  chapterId?: string;
  scrollPct?: number; // 0..1 within the chapter
  // Display-only extras so the home page can list "continue reading" without extra requests
  storyTitle?: string;
  coverUrl?: string;
  totalChapters?: number;
}

export interface RecentProgress extends StoredProgress { storyId: string; }

const PROGRESS_PREFIX = 'rw_progress_';
const progressKey = (storyId: string) => `${PROGRESS_PREFIX}${storyId}`;
const readKey = (storyId: string) => `rw_read_${storyId}`;

export function getProgress(storyId: string): StoredProgress | null {
  try {
    const saved = localStorage.getItem(progressKey(storyId));
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed?.chapterNumber ? parsed : null;
  } catch {
    return null;
  }
}

export function saveProgress(storyId: string, progress: StoredProgress) {
  try {
    localStorage.setItem(progressKey(storyId), JSON.stringify(progress));
  } catch {
    // localStorage may be unavailable in private-browsing edge cases
  }
}

export function getReadChapters(storyId: string): Set<string> {
  try {
    const saved = localStorage.getItem(readKey(storyId));
    const parsed = saved ? JSON.parse(saved) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function markChapterRead(storyId: string, chapterId: string): Set<string> {
  const read = getReadChapters(storyId);
  if (!read.has(chapterId)) {
    read.add(chapterId);
    try {
      localStorage.setItem(readKey(storyId), JSON.stringify([...read]));
    } catch {
      // Ignore
    }
  }
  return read;
}

/** Every story with saved progress, most recently read first. */
export function getRecentProgress(limit = 6): RecentProgress[] {
  const items: RecentProgress[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PROGRESS_PREFIX)) continue;
      const storyId = key.slice(PROGRESS_PREFIX.length);
      const progress = getProgress(storyId);
      if (progress) items.push({ ...progress, storyId });
    }
  } catch {
    return [];
  }
  return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, limit);
}
