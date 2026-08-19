"""Résumé selector. Which one loads is controlled entirely by config.RESUME_SOURCE —
flip that constant and redeploy, nothing else changes."""

from config import RESUME_SOURCE

from .profile_hh import PROFILE as PROFILE_HH
from .profile_linkedin import PROFILE as PROFILE_LINKEDIN

PROFILES = {"hh": PROFILE_HH, "linkedin": PROFILE_LINKEDIN}
PROFILE = PROFILES.get(RESUME_SOURCE, PROFILE_HH)
