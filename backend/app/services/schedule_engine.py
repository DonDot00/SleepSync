from datetime import datetime, timedelta

# Maps priority levels to numbers so we can sort tasks by importance
PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}

# converts times
def time_to_dt(t):
    return datetime.strptime(t, "%H:%M")

def dt_to_str(dt):
    return dt.strftime("%H:%M")

# The main scheduling function
# tasks — list of all Task objects from the database
# wake_time — when the user's day starts e.g. "07:00"
# sleep_time — when sleep begins and scheduling must stop e.g. "23:00"
def generate_schedule(tasks, wake_time, sleep_time):
    schedule = []                       # the final list of scheduled blocks to return
    current = time_to_dt(wake_time)     # pointer that tracks where we are in the day
    sleep_dt = time_to_dt(sleep_time)   # the hard deadline — no tasks can go past this

    # Fixed tasks — locked to a specific time, sorted chronologically by their fixed_time
    fixed = sorted(
        [t for t in tasks if t.task_type == "fixed" and t.fixed_time],
        key=lambda t: t.fixed_time
    )
    # Flexible tasks — can be scheduled anywhere, sorted by priority (high to low)
    flexible = sorted(
        [t for t in tasks if t.task_type != "fixed"],
        key=lambda t: PRIORITY_ORDER.get(t.priority, 2)
    )

    # Pre-compute the start and end times for every fixed task
    # and store them as "blocked" time windows the scheduler must work around
    blocked = []
    for t in fixed:
        start = time_to_dt(t.fixed_time)
        end = start + timedelta(minutes=t.duration_minutes)
        blocked.append((start, end, t))

    # Loop through each fixed task block and fill the gaps before it with flexible tasks
    for start, end, task in blocked:
        # While there are flexible tasks left and we haven't reached a fixed block yet try to fit flexible tasks into the gap before the fixed task starts
        while flexible and current < start:
            ft = flexible[0]
            ft_end = current + timedelta(minutes=ft.duration_minutes)

            # Only schedule it if it fits completely before the fixed task starts
            if ft_end <= start:
                schedule.append({
                    "task_id": ft.id, "name": ft.name,
                    "start": dt_to_str(current), "end": dt_to_str(ft_end),
                    "type": "flexible", "priority": ft.priority,
                })
                current = ft_end
                flexible.pop(0)
            else:
                break
        # Add the fixed task at its locked time regardless of anything else
        schedule.append({
            "task_id": task.id, "name": task.name,
            "start": dt_to_str(start), "end": dt_to_str(end),
            "type": "fixed", "priority": task.priority,
        })
        
        # Move the pointer to after the fixed task
        current = max(current, end)

    # After all fixed tasks are placed, fill remaining time with leftover flexible tasks
    for ft in flexible:
        ft_end = current + timedelta(minutes=ft.duration_minutes)
        # makes sure it doesn't schedule past bedtime
        if ft_end <= sleep_dt:
            schedule.append({
                "task_id": ft.id, "name": ft.name,
                "start": dt_to_str(current), "end": dt_to_str(ft_end),
                "type": "flexible", "priority": ft.priority,
            })
            current = ft_end
    # sleep block
    schedule.append({
        "task_id": None, "name": "Sleep",
        "start": dt_to_str(sleep_dt), "end": wake_time,
        "type": "sleep", "priority": "non-negotiable",
    })

    return schedule
