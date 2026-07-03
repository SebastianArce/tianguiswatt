-- Fails if an acceptance number appears more than once.
select
    acceptance_number,
    count() as n
from {{ ref('mart_accepted_actions') }}
group by acceptance_number
having count() > 1
