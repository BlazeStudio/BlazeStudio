"""League of Legends showcase for the desktop's "LoL" window.

A snapshot, not live: Riot's API needs a key that expires every day (or a
production key Riot has to approve), and League of Graphs / op.gg sit behind
bot protection, so these numbers are copied by hand from op.gg (the profile in
LINKS, "S<year> most-played champions" → Ranked, plus the Mastery block).
Refresh them there and bump "as_of".
"""

LOL = {
    "riot_id": "ФрешПринц#2165",
    "region": "RU",
    "level": 63,
    "as_of": "2026-10-20",
    "season": "S2026",
    "role": {"ru": "Лес", "en": "Jungle"},
    # All ranked games this season (solo + flex), to show Briar's share of them.
    "season_games": 101,
    "main": {
        "id": "Briar",  # Riot's champion key — also names its art on Data Dragon
        "name": {"ru": "Брайер", "en": "Briar"},
        "mastery_level": 22,
        "mastery_points": 216412,
        "games": 60,
        "win_rate": 57,
        "kills": 9.7,
        "deaths": 8.6,
        "assists": 7.1,
        "kda": 1.95,
    },
    # The next most-mastered champions, for scale.
    "others": [
        {"id": "Diana", "name": {"ru": "Диана", "en": "Diana"}, "mastery_points": 42028},
        {"id": "Jax", "name": {"ru": "Джакс", "en": "Jax"}, "mastery_points": 35125},
        {"id": "Warwick", "name": {"ru": "Варвик", "en": "Warwick"}, "mastery_points": 32431},
    ],
    "links": {
        "leagueofgraphs": "https://www.leagueofgraphs.com/summoner/ru/%D0%A4%D1%80%D0%B5%D1%88%D0%9F%D1%80%D0%B8%D0%BD%D1%86-2165",
        "opgg": "https://op.gg/lol/summoners/ru/%D0%A4%D1%80%D0%B5%D1%88%D0%9F%D1%80%D0%B8%D0%BD%D1%86-2165",
    },
}
