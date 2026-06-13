-- =========================================================================
--  AGRESTE ACADEMY LMS — Schéma de base de données Supabase
--  À exécuter dans : Supabase Dashboard -> SQL Editor -> New query -> Run
-- =========================================================================

-- 1) PROFILS (lié à auth.users) ------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student','teacher','promoter')),
  created_at timestamptz not null default now()
);

-- 2) MODULES (créés par le promoteur) ------------------------------------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3) COURS (créés par l'enseignant, rattachés à un module) ---------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  module_id uuid references public.modules(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4) LEÇONS (PDF ou vidéo) -----------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  content_type text not null check (content_type in ('pdf','video')),
  content_url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- 5) ÉVALUATIONS (une par leçon) -----------------------------------------
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text,
  pass_score int not null default 60,
  created_at timestamptz not null default now()
);

-- 6) QUESTIONS (QCM) -----------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  question text not null,
  options jsonb not null,          -- tableau de réponses : ["A","B","C"]
  correct_index int not null default 0
);

-- 7) TENTATIVES (notes des étudiants) ------------------------------------
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  score int not null,              -- pourcentage 0..100
  passed boolean not null default false,
  created_at timestamptz not null default now()
);

-- 8) CERTIFICATS ----------------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  issued_at timestamptz not null default now(),
  unique (user_id, module_id)
);

-- =========================================================================
--  CRÉATION AUTOMATIQUE DU PROFIL À L'INSCRIPTION
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
--  ROW LEVEL SECURITY (RLS)
-- =========================================================================
alter table public.profiles     enable row level security;
alter table public.modules      enable row level security;
alter table public.courses      enable row level security;
alter table public.lessons      enable row level security;
alter table public.evaluations  enable row level security;
alter table public.questions    enable row level security;
alter table public.attempts     enable row level security;
alter table public.certificates enable row level security;

-- Helper : rôle de l'utilisateur courant
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ----- PROFILES -----
create policy "profiles_read_all"   on public.profiles for select to authenticated using (true);
create policy "profiles_upsert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid());

-- ----- MODULES (lecture: tous ; écriture: promoteur) -----
create policy "modules_read"   on public.modules for select to authenticated using (true);
create policy "modules_write"  on public.modules for all    to authenticated
  using (public.my_role() = 'promoter') with check (public.my_role() = 'promoter');

-- ----- COURSES (lecture: tous ; écriture: enseignant propriétaire ou promoteur) -----
create policy "courses_read"   on public.courses for select to authenticated using (true);
create policy "courses_insert" on public.courses for insert to authenticated
  with check (public.my_role() in ('teacher','promoter'));
create policy "courses_update" on public.courses for update to authenticated
  using (created_by = auth.uid() or public.my_role() = 'promoter');
create policy "courses_delete" on public.courses for delete to authenticated
  using (created_by = auth.uid() or public.my_role() = 'promoter');

-- ----- LESSONS -----
create policy "lessons_read"   on public.lessons for select to authenticated using (true);
create policy "lessons_write"  on public.lessons for all to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and (c.created_by = auth.uid() or public.my_role()='promoter')))
  with check (exists (select 1 from public.courses c where c.id = course_id and (c.created_by = auth.uid() or public.my_role()='promoter')));

-- ----- EVALUATIONS -----
create policy "eval_read"  on public.evaluations for select to authenticated using (true);
create policy "eval_write" on public.evaluations for all to authenticated
  using (exists (select 1 from public.lessons l join public.courses c on c.id=l.course_id
                 where l.id = lesson_id and (c.created_by = auth.uid() or public.my_role()='promoter')))
  with check (exists (select 1 from public.lessons l join public.courses c on c.id=l.course_id
                 where l.id = lesson_id and (c.created_by = auth.uid() or public.my_role()='promoter')));

-- ----- QUESTIONS -----
create policy "q_read"  on public.questions for select to authenticated using (true);
create policy "q_write" on public.questions for all to authenticated
  using (exists (select 1 from public.evaluations e join public.lessons l on l.id=e.lesson_id
                 join public.courses c on c.id=l.course_id
                 where e.id = evaluation_id and (c.created_by = auth.uid() or public.my_role()='promoter')))
  with check (exists (select 1 from public.evaluations e join public.lessons l on l.id=e.lesson_id
                 join public.courses c on c.id=l.course_id
                 where e.id = evaluation_id and (c.created_by = auth.uid() or public.my_role()='promoter')));

-- ----- ATTEMPTS (chaque étudiant gère ses propres tentatives ; promoteur lit tout) -----
create policy "attempts_read_self" on public.attempts for select to authenticated
  using (user_id = auth.uid() or public.my_role() = 'promoter');
create policy "attempts_insert_self" on public.attempts for insert to authenticated
  with check (user_id = auth.uid());

-- ----- CERTIFICATES (étudiant gère les siens ; promoteur lit tout) -----
create policy "certs_read" on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.my_role() = 'promoter');
create policy "certs_insert_self" on public.certificates for insert to authenticated
  with check (user_id = auth.uid());

-- =========================================================================
--  TERMINÉ. Pense ensuite à créer le bucket de stockage "lessons"
--  (voir README.md, section Storage).
-- =========================================================================
