-- READ-ONLY. Transfers for the upcoming gameweek: who, out, in, kept, over-limit.
with nxt as (
  select id, number from matchdays
  where status in ('scheduled','draft') and deadline_at > now()
  order by played_on, number limit 1
),
tr as (
  select t.manager_id, t.player_out_id, t.player_in_id
  from fantasy_transfers t join nxt on nxt.id = t.matchday_id
  where t.status = 'active'
),
team as (  -- each manager's current squad for that gameweek
  select ft.manager_id, ftp.player_id
  from fantasy_teams ft join nxt on nxt.id = ft.matchday_id
  join fantasy_team_players ftp on ftp.fantasy_team_id = ft.id
)
select 'GW' || (select number from nxt) as gw,
       u.display_name as manager,
       count(*) as transfers,
       coalesce(w.free_available, 2) as free_allowed,
       greatest(0, count(*) - coalesce(w.free_available, 2)) as extra,
       count(*) > 2 as more_than_2,
       string_agg(po.display_name, ', ' order by po.display_name) as removed,
       string_agg(pi.display_name, ', ' order by pi.display_name) as added,
       (select string_agg(p.display_name, ', ' order by p.display_name)
          from team tm join players p on p.id = tm.player_id
         where tm.manager_id = tr.manager_id
           and tm.player_id not in (select player_in_id from tr t2 where t2.manager_id = tr.manager_id)
       ) as kept
from tr
join users u on u.id = tr.manager_id
join players po on po.id = tr.player_out_id
join players pi on pi.id = tr.player_in_id
left join manager_transfer_windows w
  on w.manager_id = tr.manager_id and w.matchday_id = (select id from nxt) and w.voided_at is null
group by u.display_name, tr.manager_id, w.free_available
order by transfers desc, manager;
