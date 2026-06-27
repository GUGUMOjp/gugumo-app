-- 20260627_001_initial_tenant_schema.sql
-- Tenant base schema for GUGUMO.
--
-- This migration records the tenant base schema that has already been
-- manually applied in the development Supabase project.
--
-- Do not enable RLS in this migration.
-- Do not insert seed data in this migration.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null,
  plan text,
  created_at timestamptz default now(),
  constraint companies_status_check
    check (status in ('active', 'trial', 'suspended', 'cancelled'))
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  status text not null,
  created_at timestamptz default now(),
  constraint workspaces_status_check
    check (status in ('active', 'archived'))
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  workspace_id uuid not null references public.workspaces(id),
  email text,
  name text,
  role text not null,
  created_at timestamptz default now(),
  constraint profiles_role_check
    check (role in ('owner', 'admin', 'member', 'viewer'))
);

create index if not exists workspaces_company_id_idx
  on public.workspaces (company_id);

create index if not exists profiles_company_id_idx
  on public.profiles (company_id);

create index if not exists profiles_workspace_id_idx
  on public.profiles (workspace_id);

create index if not exists profiles_role_idx
  on public.profiles (role);
