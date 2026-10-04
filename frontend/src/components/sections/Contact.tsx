import { CheckCircle2, Github, Linkedin, Loader2, Mail, Send } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useEmailLink } from '../../hooks/useEmailLink';
import { ApiError, sendContact, useProfile } from '../../lib/api';
import type { ContactPayload } from '../../lib/types';
import { Reveal, Section } from '../ui/primitives';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'success'; message: string } | { kind: 'error'; message: string };
type Field = 'name' | 'email' | 'message';

const EMPTY: ContactPayload = { name: '', email: '', message: '', website: '' };

function validate(values: ContactPayload): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (values.name.trim().length < 2) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Please enter a valid email.';
  if (values.message.trim().length < 10) errors.message = 'Please write at least 10 characters.';
  return errors;
}

export function Contact() {
  const { data: profile } = useProfile();
  const emailLink = useEmailLink(profile?.links.email);
  const [values, setValues] = useState<ContactPayload>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name as Field]) setErrors((errs) => ({ ...errs, [name]: undefined }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const firstInvalid = (['name', 'email', 'message'] as const).find((f) => found[f]);
    if (firstInvalid) {
      document.getElementById(`contact-${firstInvalid}`)?.focus();
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      const res = await sendContact({ ...values, name: values.name.trim(), email: values.email.trim() });
      setStatus({ kind: 'success', message: res.message });
      setValues(EMPTY);
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof ApiError
            ? err.message
            : "Couldn't send your message — please try again or email me directly.",
      });
    }
  };

  const links = profile?.links;

  return (
    <Section
      id="contact"
      eyebrow="Contact"
      title="Let's build something together."
      intro="Hiring for Angular or GenAI work? Send a message — I usually reply within a day or two."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <Reveal className="space-y-3">
          {links?.email && emailLink && (
            <a
              href={emailLink.href}
              className="card card-hover flex items-center gap-4 p-5"
              {...(emailLink.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={emailLink.onClick}
            >
              <Mail className="h-5 w-5 text-accent" aria-hidden="true" />
              <span>
                <span className="block text-xs text-muted">Email</span>
                <span className="break-all font-medium text-accent">{links.email}</span>
                {emailLink.external && <span className="sr-only"> (opens Gmail in a new window)</span>}
              </span>
            </a>
          )}
          {links?.linkedin && (
            <a
              href={links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover flex items-center gap-4 p-5"
            >
              <Linkedin className="h-5 w-5 text-accent" aria-hidden="true" />
              <span>
                <span className="block text-xs text-muted">LinkedIn</span>
                <span className="font-medium text-accent">Connect with me</span>
                <span className="sr-only"> (opens in new tab)</span>
              </span>
            </a>
          )}
          {links?.github && (
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover flex items-center gap-4 p-5"
            >
              <Github className="h-5 w-5 text-accent" aria-hidden="true" />
              <span>
                <span className="block text-xs text-muted">GitHub</span>
                <span className="font-medium text-accent">Explore my AI projects</span>
                <span className="sr-only"> (opens in new tab)</span>
              </span>
            </a>
          )}
        </Reveal>

        <Reveal delay={0.1}>
          {status.kind === 'success' ? (
            <div role="status" className="card flex flex-col items-center gap-4 p-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
              <p className="text-lg font-semibold">Message sent</p>
              <p className="text-sm text-muted">{status.message}</p>
              <button type="button" className="btn-secondary" onClick={() => setStatus({ kind: 'idle' })}>
                Send another message
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="card space-y-5 p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    autoComplete="name"
                    maxLength={100}
                    value={values.name}
                    onChange={onChange}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    className="input"
                  />
                  {errors.name && (
                    <p id="contact-name-error" className="mt-1.5 text-xs text-danger">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={values.email}
                    onChange={onChange}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    className="input"
                  />
                  {errors.email && (
                    <p id="contact-email-error" className="mt-1.5 text-xs text-danger">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  maxLength={5000}
                  value={values.message}
                  onChange={onChange}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  className="input resize-y"
                />
                {errors.message && (
                  <p id="contact-message-error" className="mt-1.5 text-xs text-danger">
                    {errors.message}
                  </p>
                )}
              </div>
              {/* Honeypot: invisible to people and assistive tech, tempting to bots. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={onChange}
                />
              </div>
              {status.kind === 'error' && (
                <p role="alert" className="rounded-xl border border-danger bg-surface-muted px-4 py-3 text-sm text-fg">
                  {status.message}
                </p>
              )}
              <button type="submit" disabled={status.kind === 'sending'} className="btn-primary w-full sm:w-auto">
                {status.kind === 'sending' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" /> Send message
                  </>
                )}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </Section>
  );
}
