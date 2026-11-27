// Language-aware views of the content. One rule above all (HANDOFF.md section 6):
// a language's library shows only that language's version, and a video without
// a version in that language is hidden there.
import { useRouter } from './router';
import type { Course, CourseVersion, Lang, Video, VideoVersion } from '../types';

export function useLang(): Lang {
  const { pathname } = useRouter();
  return pathname.startsWith('/es') ? 'es' : 'en';
}

/** Build a path in a language: lp('es', '/library') → '/es/library' */
export const lp = (lang: Lang, path = '') => `/${lang}${path}`;

export interface LocalVideo { video: Video; v: VideoVersion }

export function localVideo(video: Video | undefined, lang: Lang, includeDrafts = false): LocalVideo | null {
  if (!video) return null;
  const v = video.versions[lang];
  if (!v) return null;
  if (!includeDrafts && video.status !== 'published') return null;
  return { video, v };
}

export function localVideos(videos: Video[], lang: Lang): LocalVideo[] {
  return videos.map((x) => localVideo(x, lang)).filter((x): x is LocalVideo => !!x);
}

export interface LocalCourse { course: Course; c: CourseVersion; lessons: LocalVideo[] }

export function localCourse(course: Course | undefined, videos: Video[], lang: Lang): LocalCourse | null {
  if (!course || course.status !== 'published') return null;
  const c = course.versions[lang];
  if (!c) return null;
  const lessons = c.lessonIds.map((id) => localVideo(videos.find((v) => v.id === id), lang)).filter((x): x is LocalVideo => !!x);
  if (!lessons.length) return null;
  return { course, c, lessons };
}

export function localCourses(courses: Course[], videos: Video[], lang: Lang): LocalCourse[] {
  return courses.map((c) => localCourse(c, videos, lang)).filter((x): x is LocalCourse => !!x);
}
