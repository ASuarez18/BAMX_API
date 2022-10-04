create schema if not exists app;
create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists app.user
( id bigint not null primary key generated always as identity
, email citext not null unique
, password text not null
);

create table if not exists app.permission
( id bigint not null primary key generated always as identity
, uid bigint not null references app.user(id) on delete cascade
, name citext not null
);

create table if not exists app.question
( id bigint not null primary key generated always as identity
, kind citext not null
, content text not null
, options jsonb not null
, per_person boolean not null default false
, first_time_only boolean not null default false
);

create table if not exists app.submission
( id bigint not null primary key generated always as identity
, submitter bigint not null references app.user(id) on delete cascade
, family_id text not null
, created_at timestamptz not null default now()
, geo_data jsonb not null
);

create table if not exists app.answer
( id bigint not null primary key generated always as identity
, submission bigint not null references app.submission(id) on delete cascade
, question bigint not null references app.question(id) on delete cascade
, content jsonb not null
, person_number int
);
