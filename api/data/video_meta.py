"""Per-file overrides for static/video/ entries — display title, position in
the list, and a thumbnail icon. Video containers don't carry easily readable
tags the way audio does (music_sync.py reads those via mutagen), and
generating real thumbnails server-side would need ffmpeg, which isn't part of
this project's dependencies — so all three are manual, keyed by the exact
filename (with extension) as it sits in static/video/.

- title: shown instead of the filename. Omit to fall back to the filename.
- order: lower shows first. Files without one keep their filename order,
  after every file that does have one.
- icon: a filename inside static/video/icons/ (not a full path) used as the
  large-icon thumbnail. Omit to fall back to the generic video icon.
"""

VIDEO_META: dict[str, dict] = {
    "o0ZCiCAi2IV51KQwXPBI6mEfKJ85BvKAyDh1MH.mp4": {"title": "Nostalgia.mp4", "order": 1, "icon": "videoframe_7849.png"}, 
    "zYhlZCjmhSgvRPmymKWVkritZNDQMMxJ.mp4": {"title": "ES.mp4", "order": 1, "icon": "videoframe_512.png"}, 
    "mqYPUKgoQfkAhjkizQutUqIrSINGESNg.mp4": {"title": "thatfeel.mp4", "order": 1, "icon": "videoframe_0.png"}, 
    "MszBsYrVFYwiGrBZnxiYtMrXFaShSfct.mp4": {"title": "Suffocation.mp4", "order": 1, "icon": "videoframe_2850.png"}, 
    "RpDnDnHaOsycMjcZaLgDYAyVHvbXMrcw.mp4": {"title": "God.mp4", "order": 1, "icon": "videoframe_15451.png"}, 
}
