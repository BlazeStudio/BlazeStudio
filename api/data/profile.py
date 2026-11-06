"""Résumé selector. Which one loads is controlled entirely by config.RESUME_SOURCE —
flip that constant and redeploy, nothing else changes."""

from datetime import date

from config import RESUME_SOURCE

from .profile_hh import PROFILE as PROFILE_HH
from .profile_linkedin import PROFILE as PROFILE_LINKEDIN

PROFILES = {"hh": PROFILE_HH, "linkedin": PROFILE_LINKEDIN}
PROFILE = PROFILES.get(RESUME_SOURCE, PROFILE_HH)


def _month_index(year: int, month: int) -> int:
    return year * 12 + month - 1


def _parse_month(value: str) -> int:
    year, month = value.split("-")
    return _month_index(int(year), int(month))


def _total_months(experience: list, today: date) -> int:
    """Months worked, counted the way hh.ru does: a job's first and last months
    both count, and a month shared by overlapping jobs counts once."""
    current = _month_index(today.year, today.month)
    months = set()
    for job in experience:
        end = _parse_month(job["end"]) if job["end"] else current
        months.update(range(_parse_month(job["start"]), end + 1))
    return len(months)


def _ru_plural(n: int, one: str, few: str, many: str) -> str:
    if n % 10 == 1 and n % 100 != 11:
        return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return few
    return many


def _format_months(total: int) -> dict:
    years, months = divmod(total, 12)
    ru, en = [], []
    if years:
        ru.append(f"{years} {_ru_plural(years, 'год', 'года', 'лет')}")
        en.append(f"{years} {'year' if years == 1 else 'years'}")
    if months:
        ru.append(f"{months} {_ru_plural(months, 'месяц', 'месяца', 'месяцев')}")
        en.append(f"{months} {'month' if months == 1 else 'months'}")
    return {"ru": " ".join(ru), "en": " ".join(en)}


def current_profile(today: date | None = None) -> dict:
    """PROFILE plus what depends on today's date. Call it per request rather than
    caching the result, or a long-lived server would freeze the counter."""
    total = _total_months(PROFILE["experience"], today or date.today())
    return {**PROFILE, "experience_total": _format_months(total)}
