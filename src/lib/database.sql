-- Drop existing tables and policies
drop policy if exists "Allow anonymous uploads" on storage.objects;
drop policy if exists "Allow anonymous reads" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop table if exists comments;
drop table if exists tracks;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create storage bucket
do $$ 
begin
  insert into storage.buckets (id, name, public)
  values ('tracks', 'tracks', true)
  on conflict (id) do nothing;

  -- Set storage policies
  create policy "Public Access"
    on storage.objects for all
    using ( bucket_id = 'tracks' )
    with check ( bucket_id = 'tracks' );

  -- Enable RLS on storage.objects
  alter table storage.objects enable row level security;

  -- Create policies for anonymous access
  create policy "Allow anonymous uploads"
    on storage.objects for insert
    with check (bucket_id = 'tracks');

  create policy "Allow anonymous reads"
    on storage.objects for select
    using (bucket_id = 'tracks');
end $$;

-- Tracks table
create table tracks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  artist text not null,
  duration integer not null,
  audio_url text not null,
  cover_art_url text,
  likes integer default 0,
  plays integer default 0,
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Comments table
create table comments (
  id uuid default uuid_generate_v4() primary key,
  track_id uuid references tracks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  timestamp integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create indexes
create index tracks_tags_gin_idx on tracks using gin (tags);
create index comments_track_id_idx on comments(track_id);
create index comments_timestamp_idx on comments(timestamp);

-- Enable RLS
alter table tracks enable row level security;
alter table comments enable row level security;

-- Tracks policies (allowing all operations for now)
create policy "Enable all operations for tracks"
  on tracks for all
  using (true)
  with check (true);

-- Comments policies
create policy "Comments are viewable by everyone"
  on comments
  for select
  using (true);

create policy "Users can insert comments"
  on comments
  for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own comments"
  on comments
  for update
  using (auth.uid() = user_id);
