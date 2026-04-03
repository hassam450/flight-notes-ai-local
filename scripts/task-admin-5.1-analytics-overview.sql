-- Task Admin 5.1.1: Analytics overview RPC for top-level dashboard metrics
-- Run this in the Supabase SQL Editor before using the admin analytics page.

create or replace function public.admin_get_overview_metrics(metric_days integer default 28)
returns jsonb
language sql
security definer
set search_path = public, auth
as $$
with bounds as (
  select
    greatest(coalesce(metric_days, 28), 7) as metric_days,
    current_date as today
),
users_base as (
  select
    id,
    created_at::date as created_day
  from auth.users
),
notes_base as (
  select
    user_id,
    created_at::date as created_day
  from public.notes
),
session_base as (
  select
    user_id,
    created_at::date as created_day
  from public.learning_sessions
),
job_base as (
  select
    user_id,
    created_at::date as created_day
  from public.notes_ai_jobs
),
subscription_base as (
  select
    user_id,
    created_at::date as created_day,
    rc_event_type,
    is_trial_period
  from public.subscription_events
),
sign_in_base as (
  select
    id as user_id,
    last_sign_in_at::date as created_day
  from auth.users
  where last_sign_in_at is not null
),
activity_events as (
  select user_id, created_day from notes_base
  union all
  select user_id, created_day from session_base
  union all
  select user_id, created_day from job_base
  union all
  select user_id, created_day from subscription_base
  union all
  select user_id, created_day from sign_in_base
),
series as (
  select generate_series(
    (select today - (metric_days - 1) from bounds),
    (select today from bounds),
    interval '1 day'
  )::date as day
),
signups_daily as (
  select
    created_day as day,
    count(*)::bigint as value
  from users_base
  group by created_day
),
notes_daily as (
  select
    created_day as day,
    count(*)::bigint as value
  from notes_base
  group by created_day
),
converted_users as (
  select
    user_id,
    min(created_day) as converted_day
  from subscription_base
  where
    coalesce(is_trial_period, false) = false
    and rc_event_type in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION')
  group by user_id
),
daily_active as (
  select
    created_day as day,
    count(distinct user_id)::bigint as value
  from activity_events
  group by created_day
),
rolling_active as (
  select
    s.day,
    (
      select count(distinct ae.user_id)::bigint
      from activity_events ae
      where ae.created_day between s.day - interval '6 day' and s.day
    ) as wau_value,
    (
      select count(distinct ae.user_id)::bigint
      from activity_events ae
      where ae.created_day between s.day - interval '29 day' and s.day
    ) as mau_value
  from series s
),
users_trend as (
  select
    s.day,
    coalesce(
      (
        select count(*)::bigint
        from users_base u
        where u.created_day <= s.day
      ),
      0
    ) as value
  from series s
),
notes_trend as (
  select
    s.day,
    coalesce(
      (
        select count(*)::bigint
        from notes_base n
        where n.created_day <= s.day
      ),
      0
    ) as value
  from series s
),
conversion_trend as (
  select
    s.day,
    case
      when (
        select count(*)::numeric
        from users_base u
        where u.created_day <= s.day
      ) = 0 then 0::numeric
      else round(
        (
          (
            select count(*)::numeric
            from converted_users cu
            where cu.converted_day <= s.day
          ) / nullif(
            (
              select count(*)::numeric
              from users_base u
              where u.created_day <= s.day
            ),
            0
          )
        ) * 100,
        2
      )
    end as value
  from series s
),
summary as (
  select
    (select count(*)::bigint from users_base) as total_users,
    (
      select count(distinct user_id)::bigint
      from activity_events
      where created_day = (select today from bounds)
    ) as dau,
    (
      select count(distinct user_id)::bigint
      from activity_events
      where created_day between (select today - interval '6 day' from bounds) and (select today from bounds)
    ) as wau,
    (
      select count(distinct user_id)::bigint
      from activity_events
      where created_day between (select today - interval '29 day' from bounds) and (select today from bounds)
    ) as mau,
    (select count(*)::bigint from notes_base) as total_notes,
    (select count(*)::bigint from converted_users) as paid_converted_users
)
select jsonb_build_object(
  'generated_at', now(),
  'window_days', (select metric_days from bounds),
  'total_users', coalesce((select total_users from summary), 0),
  'dau', coalesce((select dau from summary), 0),
  'wau', coalesce((select wau from summary), 0),
  'mau', coalesce((select mau from summary), 0),
  'total_notes', coalesce((select total_notes from summary), 0),
  'paid_converted_users', coalesce((select paid_converted_users from summary), 0),
  'conversion_rate', case
    when coalesce((select total_users from summary), 0) = 0 then 0
    else round(
      (
        coalesce((select paid_converted_users from summary), 0)::numeric
        / nullif((select total_users from summary)::numeric, 0)
      ) * 100,
      2
    )
  end,
  'trends', jsonb_build_object(
    'total_users', (
      select jsonb_agg(
        jsonb_build_object('date', day, 'value', value)
        order by day
      )
      from users_trend
    ),
    'dau', (
      select jsonb_agg(
        jsonb_build_object('date', s.day, 'value', coalesce(da.value, 0))
        order by s.day
      )
      from series s
      left join daily_active da on da.day = s.day
    ),
    'wau', (
      select jsonb_agg(
        jsonb_build_object('date', day, 'value', coalesce(wau_value, 0))
        order by day
      )
      from rolling_active
    ),
    'mau', (
      select jsonb_agg(
        jsonb_build_object('date', day, 'value', coalesce(mau_value, 0))
        order by day
      )
      from rolling_active
    ),
    'total_notes', (
      select jsonb_agg(
        jsonb_build_object('date', day, 'value', value)
        order by day
      )
      from notes_trend
    ),
    'conversion_rate', (
      select jsonb_agg(
        jsonb_build_object('date', day, 'value', value)
        order by day
      )
      from conversion_trend
    )
  )
);
$$;

revoke all on function public.admin_get_overview_metrics(integer) from public;
grant execute on function public.admin_get_overview_metrics(integer) to service_role;
