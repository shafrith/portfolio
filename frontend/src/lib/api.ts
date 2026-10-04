import { useQuery } from '@tanstack/react-query';
import type {
  ChatMeta,
  ChatQuota,
  ChatTurn,
  Company,
  ContactPayload,
  ContactResponse,
  Profile,
  Project,
  SkillGroup,
} from './types';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message =
    res.status === 429 ? 'Too many requests — please try again a little later.' : `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as { detail?: unknown };
    // Prefer the server's own wording (e.g. the friendly "Ask my AI" question-limit message).
    if (typeof body.detail === 'string') message = body.detail;
    else if (Array.isArray(body.detail)) message = 'Please check the highlighted fields.';
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(message, res.status);
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as T;
}

const STALE = 5 * 60 * 1000;

export const useProfile = () =>
  useQuery({ queryKey: ['profile'], queryFn: ({ signal }) => getJson<Profile>('/profile', signal), staleTime: STALE });

export const useExperience = () =>
  useQuery({
    queryKey: ['experience'],
    queryFn: ({ signal }) => getJson<Company[]>('/experience', signal),
    staleTime: STALE,
  });

export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: ({ signal }) => getJson<Project[]>('/projects', signal), staleTime: STALE });

export const useSkills = () =>
  useQuery({ queryKey: ['skills'], queryFn: ({ signal }) => getJson<SkillGroup[]>('/skills', signal), staleTime: STALE });

/** Questions this visitor has left for Ask my AI (doesn't use one up). */
export const getChatQuota = (signal?: AbortSignal) => getJson<ChatQuota>('/chat/quota', signal);

export async function sendContact(payload: ContactPayload): Promise<ContactResponse> {
  const res = await fetch(`${API_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as ContactResponse;
}

export interface ChatHandlers {
  onMeta: (meta: ChatMeta) => void;
  onToken: (text: string) => void;
  onError: (message: string) => void;
}

/** POSTs a question and consumes the Server-Sent Events stream returned by /api/chat. */
export async function streamChat(
  message: string,
  history: ChatTurn[],
  handlers: ChatHandlers,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message, history }),
    signal,
  });
  if (!res.ok || !res.body) throw await errorFrom(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value.replace(/\r\n/g, '\n');
    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      const payload = JSON.parse(data) as Record<string, unknown>;
      if (event === 'meta') handlers.onMeta(payload as unknown as ChatMeta);
      else if (event === 'token') handlers.onToken(String(payload.text ?? ''));
      else if (event === 'error') handlers.onError(String(payload.message ?? 'Something went wrong.'));
    }
  }
}
