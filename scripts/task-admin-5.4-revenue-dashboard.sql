-- Task Admin 5.4: Revenue dashboard RPCs (MRR trend + revenue by plan)
-- Run this in the Supabase SQL Editor before using the admin revenue page.

-- 5.4.1: MRR trend line chart
create or replace function public.admin_get_mrr_trend(metric_days integer default 90)
returns jsonb
language sql
security definer
set search_path = public
as $$
with bounds as (
  select
    greatest(coalesce(metric_days, 90), 7) as metric_days,
    current_date as today
),
series as (
  select generate_series(
    (select today - (metric_days - 1) from bounds),
    (select today from bounds),
    interval '1 day'
  )::date as day
),
ranked_events as (
  select
    se.*,
    row_number() over (
      partition by se.user_id, s.day
      order by se.created_at desc
    ) as rn,
    s.day
  from series s
  cross join lateral (
    select *
    from public.subscription_events sub
    where sub.created_at::date <= s.day
  ) se
),
daily_mrr as (
  select
    day,
    coalesce(sum(
      case
        when rn = 1
          and rc_event_type not in ('CANCELLATION', 'EXPIRATION')
          and expiration_at::date > day
          and coalesce(is_trial_period, false) = false
        then coalesce(price_usd, 0)
        else 0
      end
    ), 0)::numeric(10,2) as mrr
  from ranked_events
  where rn = 1
  group by day
),
filled as (
  select
    s.day,
    coalesce(dm.mrr, 0) as mrr
  from series s
  left join daily_mrr dm on dm.day = s.day
),
first_last as (
  select
    (select mrr from filled order by day asc limit 1) as first_mrr,
    (select mrr from filled order by day desc limit 1) as last_mrr
)
select jsonb_build_object(
  'generated_at', now(),
  'window_days', (select metric_days from bounds),
  'current_mrr', (select last_mrr from first_last),
  'mrr_growth_pct', case
    when (select first_mrr from first_last) = 0 then
      case when (select last_mrr from first_last) > 0 then 100 else 0 end
    else round(
      (((select last_mrr from first_last) - (select first_mrr from first_last))
       / nullif((select first_mrr from first_last), 0)) * 100,
      1
    )
  end,
  'trend', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('date', day, 'value', mrr)
        order by day
      )
      from filled
    ),
    '[]'::jsonb
  )
);
$$;

revoke all on function public.admin_get_mrr_trend(integer) from public;
grant execute on function public.admin_get_mrr_trend(integer) to service_role;


-- 5.4.2: Revenue by plan tier breakdown
create or replace function public.admin_get_revenue_by_plan()
returns jsonb
language sql
security definer
set search_path = public
as $$
with latest_per_user as (
  select distinct on (user_id)
    user_id,
    product_id,
    rc_event_type,
    expiration_at,
    is_trial_period,
    price_usd
  from public.subscription_events
  order by user_id, created_at desc
),
active_subs as (
  select *
  from latest_per_user
  where rc_event_type not in ('CANCELLATION', 'EXPIRATION')
    and expiration_at > now()
    and coalesce(is_trial_period, false) = false
),
plan_breakdown as (
  select
    coalesce(product_id, 'unknown') as product_id,
    count(*)::bigint as active_count,
    coalesce(sum(price_usd), 0)::numeric(10,2) as mrr
  from active_subs
  group by product_id
),
total as (
  select coalesce(sum(mrr), 0)::numeric(10,2) as total_mrr from plan_breakdown
)
select jsonb_build_object(
  'generated_at', now(),
  'total_mrr', (select total_mrr from total),
  'plans', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'product_id', pb.product_id,
          'active_count', pb.active_count,
          'mrr', pb.mrr,
          'percentage', case
            when (select total_mrr from total) = 0 then 0
            else round(pb.mrr / nullif((select total_mrr from total), 0) * 100, 1)
          end
        )
        order by pb.mrr desc
      )
      from plan_breakdown pb
    ),
    '[]'::jsonb
  )
);
$$;

revoke all on function public.admin_get_revenue_by_plan() from public;
grant execute on function public.admin_get_revenue_by_plan() to service_role;
