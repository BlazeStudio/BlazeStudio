"""Display-title overrides for static/video/ files. Video containers don't
carry easily readable tags the way audio does (music_sync.py reads those via
mutagen), so renaming a video for display is manual: map its exact filename
(with extension) to the title it should show up as. Anything dropped into
static/video/ that isn't listed here just falls back to its filename.
"""

VIDEO_TITLES: dict[str, str] = {
    # "clip.mp4": "Заголовок для рабочего стола",
}
