-- Second agent: the weekly summary for Administración. Mirrored in src/team-panel.tsx.
alter table public.agent_runs drop constraint if exists agent_runs_agent_check;
alter table public.agent_runs add constraint agent_runs_agent_check check (agent in ('events','weekly-summary'));
