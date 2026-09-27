"""Per-file overrides for static/music/ entries — position in Winamp's
playlist, plus optional title/artist that win over the file's own tags.
Same idea as video_meta.py, keyed by the exact filename (with extension)
as it sits in static/music/.

- order: lower plays first. Files without one keep their filename order,
  after every file that does have one.
- title / artist: shown instead of what the file's tags (or its filename) say.
  Omit to keep the tags.
"""

MUSIC_META: dict[str, dict] = {
    "Saša_Ogorodnikov_feat_шумные_и_угрожающие_выходки_Страшно.mp3": {"order": 1},
    "Snow_Strippers_-_Under_Your_Spell.mp3": {"order": 6},
    "ferrari_-_alice_gas.mp3": {"order": 7},
    "Энтропия2.mp3": {"order": 2},
    "много_человеческих,_TSP_офисный_ронин.mp3": {"order": 5},
    "оставь_все_сомнения.mp3": {"order": 4},
    "ace2.mp3": {"order": 3},
}
