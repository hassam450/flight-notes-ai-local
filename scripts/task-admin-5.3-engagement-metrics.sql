-- Task Admin 5.3: Engagement metrics RPCs (session duration + retention cohorts)
-- Run this in the Supabase SQL Editor before using the admin engagement page.

-- 5.3.1: Session duration distribution
create or replace function public.admin_get_session_duration_distribution(metric_days integer default 28)
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
durations as (
  -- Learning sessions (quiz / oral exam)
  select
    user_id,
    'learning_session' as source,
    coalesce(time_taken_seconds, 0) as duration_seconds,
    created_at::date as created_day
  from public.learning_sessions
  where created_at::date >= (select today - (metric_days - 1) from bounds)

  union all

  -- Note recordings
  select
    user_id,
    'recording' as source,
    coalesce(duration_sec, 0) as duration_seconds,
    created_at::date as created_day
  from public.notes
  where duration_sec > 0
    and created_at::date >= (select today - (metric_days - 1) from bounds)

  union all

  -- AI jobs
  select
    user_id,
    'ai_job' as source,
    coalesce(duration_ms / 1000, 0) as duration_seconds,
    created_at::date as created_day
  from public.notes_ai_jobs
  where duration_ms > 0
    and created_at::date >= (select today - (metric_days - 1) from bounds)
),
bucketed as (
  select
    *,
    case
      when duration_seconds < 30 then '0-30s'
      when duration_seconds < 60 then '30s-1m'
      when duration_seconds < 120 then '1-2m'
      when duration_seconds < 300 then '2-5m'
      when duration_seconds < 600 then '5-10m'
      when duration_seconds < 1200 then '10-20m'
      else '20m+'
    end as bucket,
    case
      when duration_seconds < 30 then 1
      when duration_seconds < 60 then 2
      when duration_seconds < 120 then 3
      when duration_seconds < 300 then 4
      when duration_seconds < 600 then 5
      when duration_seconds < 1200 then 6
      else 7
    end as bucket_order
  from durations
  where duration_seconds > 0
),
total_count as (
  select count(*)::numeric as cnt from bucketed
),
distribution as (
  select
    bucket,
    bucket_order,
    count(*)::bigint as count,
    round(count(*)::numeric / nullif((select cnt from total_count), 0) * 100, 1) as percentage
  from bucketed
  group by bucket, bucket_order
),
by_source as (
  select
    source,
    round(avg(duration_seconds)::numeric, 1) as avg_seconds,
    percentile_cont(0.5) within group (order by duration_seconds)::numeric as median_seconds,
    count(*)::bigint as count
  from bucketed
  group by source
),
series as (
  select generate_series(
    (select today - (metric_days - 1) from bounds),
    (select today from bounds),
    interval '1 day'
  )::date as day
),
daily_avg as (
  select
    created_day as day,
    round(avg(duration_seconds)::numeric, 1) as value
  from bucketed
  group by created_day
)
select jsonb_build_object(
  'generated_at', now(),
  'window_days', (select metric_days from bounds),
  'distribution', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('bucket', bucket, 'count', count, 'percentage', percentage)
        order by bucket_order
      )
      from distribution
    ),
    '[]'::jsonb
  ),
  'by_source', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('source', source, 'avg_seconds', avg_seconds, 'median_seconds', round(median_seconds, 1), 'count', count)
        order by count desc
      )
      from by_source
    ),
    '[]'::jsonb
  ),
  'daily_avg_duration', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('date', s.day, 'value', coalesce(da.value, 0))
        order by s.day
      )
      from series s
      left join daily_avg da on da.day = s.day
    ),
    '[]'::jsonb
  )
);
$$;

revoke all on function public.admin_get_session_duration_distribution(integer) from public;
grant execute on function public.admin_get_session_duration_distribution(integer) to service_role;


-- 5.3.2: Retention cohort heatmap
create or replace function public.admin_get_retention_cohorts(cohort_weeks integer default 12)
returns jsonb
language sql
security definer
set search_path = public, auth
as $$
with bounds as (
  select greatest(coalesce(cohort_weeks, 12), 4) as cohort_weeks
),
user_cohorts as (
  select
    id as user_id,
    date_trunc('week', created_at)::date as cohort_week
  from auth.users
  where created_at::date >= current_date - ((select cohort_weeks from bounds) * 7)
),
activity_events as (
  select user_id, created_at::date as activity_day from public.notes
  union all
  select user_id, created_at::date as activity_day from public.learning_sessions
  union all
  select user_id, created_at::date as activity_day from public.notes_ai_jobs
  union all
  select id as user_id, last_sign_in_at::date as activity_day
  from auth.users
  where last_sign_in_at is not null
),
cohort_activity as (
  select distinct
    uc.cohort_week,
    uc.user_id,
    ae.activity_day
  from user_cohorts uc
  inner join activity_events ae on ae.user_id = uc.user_id
),
cohort_sizes as (
  select
    cohort_week,
    count(distinct user_id)::bigint as cohort_size
  from user_cohorts
  group by cohort_week
),
retention as (
  select
    cs.cohort_week,
    cs.cohort_size,
    -- Day 1: active within 1 day of cohort week start
    round(
      count(distinct case
        when ca.activity_day between cs.cohort_week and cs.cohort_week + 1
        then ca.user_id
      end)::numeric / nullif(cs.cohort_size, 0) * 100,
      1
    ) as day_1_pct,
    -- Day 7: active within 7 days of cohort week start
    round(
      count(distinct case
        when ca.activity_day between cs.cohort_week and cs.cohort_week + 7
          and ca.activity_day >= cs.cohort_week + 2
        then ca.user_id
      end)::numeric / nullif(cs.cohort_size, 0) * 100,
      1
    ) as day_7_pct,
    -- Day 30: active within 30 days of cohort week start
    round(
      count(distinct case
        when ca.activity_day between cs.cohort_week + 8 and cs.cohort_week + 30
        then ca.user_id
      end)::numeric / nullif(cs.cohort_size, 0) * 100,
      1
    ) as day_30_pct
  from cohort_sizes cs
  left join cohort_activity ca on ca.cohort_week = cs.cohort_week
  group by cs.cohort_week, cs.cohort_size
)
select jsonb_build_object(
  'generated_at', now(),
  'cohort_weeks', (select cohort_weeks from bounds),
  'cohorts', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'cohort_week', cohort_week,
          'cohort_size', cohort_size,
          'day_1_pct', coalesce(day_1_pct, 0),
          'day_7_pct', coalesce(day_7_pct, 0),
          'day_30_pct', coalesce(day_30_pct, 0)
        )
        order by cohort_week
      )
      from retention
    ),
    '[]'::jsonb
  )
);
$$;

revoke all on function public.admin_get_retention_cohorts(integer) from public;
grant execute on function public.admin_get_retention_cohorts(integer) to service_role;
