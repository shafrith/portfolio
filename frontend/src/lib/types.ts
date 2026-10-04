/** Mirrors the FastAPI response models in backend/app/schemas. */

export interface Links {
  email: string | null;
  linkedin: string | null;
  github: string | null;
  resume: string | null;
}

export interface Stat {
  value: number;
  suffix: string;
  label: string;
}

export interface Education {
  degree: string;
  institution: string;
  start: string;
  end: string;
}

export interface Profile {
  name: string;
  shortName: string;
  title: string;
  /** Compact role line, e.g. in the footer. */
  shortTitle: string;
  eyebrow: string;
  tagline: string;
  summary: string;
  location: string;
  photo: string;
  links: Links;
  stats: Stat[];
  education: Education[];
}

export interface ExperienceProject {
  name: string;
  role: string;
  start: string;
  end: string | null;
  /** 1-3 sentences shown on the site. */
  summary: string;
  /** Detailed points, used by the AI assistant. */
  highlights: string[];
}

export interface Role {
  title: string;
  start: string;
  end: string | null;
  /** 1-3 sentences shown on the site. */
  summary: string;
  /** Detailed points, used by the AI assistant. */
  highlights: string[];
  projects: ExperienceProject[];
}

export interface Company {
  company: string;
  roles: Role[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  tech: string[];
  github: string | null;
  demo: string | null;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  website: string; // honeypot
}

export interface ContactResponse {
  ok: boolean;
  message: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  title: string;
  section: string;
}

export interface ChatMeta {
  mode: 'llm' | 'keyword';
  sources: ChatSource[];
  /** Questions this visitor has left today (after this one). */
  remaining?: number;
  limit?: number;
}

export interface ChatQuota {
  limit: number;
  remaining: number;
}
