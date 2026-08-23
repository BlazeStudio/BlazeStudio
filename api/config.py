"""Single switch for which résumé feeds the whole site.

Flip this and redeploy — every window (About/This PC, Experience, contacts,
the terminal's `whoami`/`cv`) reads from whichever profile module this
resolves to. Nothing else in the codebase needs to change.
"""

RESUME_SOURCE = "hh"  # "hh" (hh.ru resume, RTL-era story) or "linkedin" (Ominimo-era story)
