from datetime import datetime, timedelta

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}

def time_to_dt(t):
    return datetime.strptime(t, "%H:%M")

def dt_to_str(dt):
    return dt.strftime("%H:%M")

def generate_schedule(tasks, wake_time, sleep_time):
    schedule = []
    current = time_to_dt(wake_time)
    sleep_dt = time_to_dt(sleep_time)

    fixed = sorted(
        [t for t in tasks if t.task_type == "fixed" and t.fixed_time],
        key=lambda t: t.fixed_time
    )
    flexible = sorted(
        [t for t in tasks if t.task_type != "fixed"],
        key=lambda t: PRIORITY_ORDER.get(t.priority, 2)
    )

    blocked = []
    for t in fixed:
        start = time_to_dt(t.fixed_time)
        end = start + timedelta(minutes=t.duration_minutes)
        blocked.append((start, end, t))

    for start, end, task in blocked:
        while flexible and current < start:
            ft = flexible[0]
            ft_end = current + timedelta(minutes=ft.duration_minutes)
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
        schedule.append({
            "task_id": task.id, "name": task.name,
            "start": dt_to_str(start), "end": dt_to_str(end),
            "type": "fixed", "priority": task.priority,
        })
        current = max(current, end)

    for ft in flexible:
        ft_end = current + timedelta(minutes=ft.duration_minutes)
        if ft_end <= sleep_dt:
            schedule.append({
                "task_id": ft.id, "name": ft.name,
                "start": dt_to_str(current), "end": dt_to_str(ft_end),
                "type": "flexible", "priority": ft.priority,
            })
            current = ft_end

    schedule.append({
        "task_id": None, "name": "Sleep",
        "start": dt_to_str(sleep_dt), "end": wake_time,
        "type": "sleep", "priority": "non-negotiable",
    })

    return schedule
