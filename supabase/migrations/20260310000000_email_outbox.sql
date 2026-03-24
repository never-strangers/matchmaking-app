-- Email log table for idempotent fire-and-forget email sending
create table if not exists email_log (
  id               uuid primary key default gen_random_uuid(),
  idempotency_key  text unique not null,
  template         text not null,
  to_email         text not null,
  subject          text not null,
  status           text not null default 'sent', -- 'sent' | 'mock' | 'error'
  provider_id      text,          -- Resend message ID when available
  error_message    text,
  created_at       timestamptz not null default now()
);

create index if not exists email_log_created_at_idx on email_log (created_at desc);
create index if not exists email_log_to_email_idx   on email_log (to_email);
create index if not exists email_log_template_idx   on email_log (template);
