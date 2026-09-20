-- Failed MCP tool calls, kept to improve tool descriptions and matching
-- (unknown vehicle names, missing fields...). Only failures are stored, and
-- rows go away with the user (on delete cascade). Users can write their own
-- rows but not read them back: analysis is done with the service role.
-- Retention is manual for now, e.g.:
--   delete from mcp_calls where created_at < now() - interval '90 days';
create table mcp_calls (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text,
  tool text not null,
  arguments jsonb,
  error text not null
);

create index mcp_calls_created_at_idx on mcp_calls (created_at);

alter table mcp_calls enable row level security;

create policy "users can log their own failed calls" on mcp_calls
  for insert to authenticated
  with check (user_id = auth.uid());

grant insert on mcp_calls to authenticated;
grant usage on sequence mcp_calls_id_seq to authenticated;
grant select, insert, delete on mcp_calls to service_role;
grant usage, select on sequence mcp_calls_id_seq to service_role;
