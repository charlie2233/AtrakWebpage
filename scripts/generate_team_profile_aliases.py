#!/usr/bin/env python3
"""Generate static team profile alias pages and sitemap entries from team-members.json."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TEAM_DATA_PATH = ROOT / "data" / "team-members.json"
TEAM_TEMPLATE_PATH = ROOT / "team" / "profile.html"
TEAM_DIR = ROOT / "team"
SITEMAP_PATH = ROOT / "sitemap.xml"
BASE_URL = "https://atrak.dev"

SITEMAP_MARKER_START = "  <!-- GENERATED: TEAM PROFILES START -->"
SITEMAP_MARKER_END = "  <!-- GENERATED: TEAM PROFILES END -->"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_only = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only.lower()).strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    return slug


def member_locations(member: dict[str, Any]) -> list[str]:
    # Keep Charlie's specific location context explicit for search indexing.
    if str(member.get("name", "")).strip().lower() == "charlie han":
        return ["Fullerton, CA", "Irvine, CA", "Orange County, California"]
    return []


def build_meta_description(member: dict[str, Any], locations: list[str]) -> str:
    name = str(member.get("name", "Team Member")).strip()
    role = str(member.get("role", "Team Member")).strip()
    bio = str(member.get("bio", "")).strip()
    location_sentence = f" Based in {' / '.join(locations)}." if locations else ""
    desc = f"{name} — {role} at Atrak."
    if bio:
        desc = f"{desc} {bio}"
    desc = f"{desc}{location_sentence}"
    return re.sub(r"\s+", " ", desc).strip()


def build_keywords(member: dict[str, Any], slug_url: str, locations: list[str]) -> str:
    name = str(member.get("name", "Team Member")).strip()
    role = str(member.get("role", "Team Member")).strip()
    parts = [
        f"{name} Atrak",
        f"{name} profile",
        f"{role} Atrak",
        "Atrak team profile",
        "student tech team",
        slug_url,
    ] + locations
    deduped: list[str] = []
    seen: set[str] = set()
    for p in parts:
        p = str(p).strip()
        if not p:
            continue
        key = p.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)
    return ", ".join(deduped)


def replace_once(text: str, pattern: str, repl: str) -> str:
    new_text, count = re.subn(pattern, repl, text, count=1, flags=re.MULTILINE | re.DOTALL)
    if count != 1:
        raise RuntimeError(f"Expected to replace pattern once: {pattern}")
    return new_text


def render_alias_page(template_html: str, member: dict[str, Any]) -> tuple[str, str]:
    name = str(member.get("name", "Team Member")).strip()
    role = str(member.get("role", "Team Member")).strip() or "Team Member"
    slug = slugify(name)
    if not slug or slug == "profile":
        raise RuntimeError(f"Invalid slug for member: {name!r}")

    slug_url = f"{BASE_URL}/team/{slug}.html"
    locations = member_locations(member)
    description = build_meta_description(member, locations)
    keywords = build_keywords(member, slug_url, locations)
    title = f"{name} — {role} | Atrak Team"
    og_description = f"{name} is {role} at Atrak." + (f" Based in {' / '.join(locations)}." if locations else "")

    json_ld = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "name": f"{name} — Atrak Team Profile",
        "url": slug_url,
    }
    json_ld_script = (
        '<script type="application/ld+json" id="profile-jsonld">'
        + json.dumps(json_ld, separators=(",", ":"), ensure_ascii=False)
        + "</script>"
    )

    html = template_html
    html = replace_once(
        html,
        r'<meta name="description" content="[^"]*">',
        f'<meta name="description" content="{description}">',
    )
    html = replace_once(
        html,
        r'<meta name="keywords" content="[^"]*">',
        f'<meta name="keywords" content="{keywords}">',
    )
    html = replace_once(
        html,
        r"<title>[^<]*</title>",
        f"<title>{title}</title>",
    )
    html = replace_once(
        html,
        r'<link rel="canonical" id="profile-canonical" href="[^"]*">',
        f'<link rel="canonical" id="profile-canonical" href="{slug_url}">',
    )
    html = replace_once(
        html,
        r'<meta property="og:title" content="[^"]*">',
        f'<meta property="og:title" content="{title}">',
    )
    html = replace_once(
        html,
        r'<meta property="og:description" content="[^"]*">',
        f'<meta property="og:description" content="{og_description}">',
    )
    html = replace_once(
        html,
        r'<meta property="og:url" content="[^"]*">',
        f'<meta property="og:url" content="{slug_url}">',
    )
    html = replace_once(
        html,
        r'<meta name="twitter:title" content="[^"]*">',
        f'<meta name="twitter:title" content="{title}">',
    )
    html = replace_once(
        html,
        r'<meta name="twitter:description" content="[^"]*">',
        f'<meta name="twitter:description" content="{og_description}">',
    )
    html = replace_once(
        html,
        r'<script type="application/ld\+json" id="profile-jsonld">.*?</script>',
        json_ld_script,
    )

    generated_comment = (
        "<!-- AUTO-GENERATED FILE. Edit team/profile.html and run "
        "python3 scripts/generate_team_profile_aliases.py -->\n"
    )
    return slug, generated_comment + html


def generate_sitemap_team_block(slugs: list[str]) -> str:
    entries = []
    for slug in slugs:
        entries.append(
            "\n".join(
                [
                    "  <url>",
                    f"    <loc>{BASE_URL}/team/{slug}.html</loc>",
                    "    <changefreq>monthly</changefreq>",
                    "    <priority>0.7</priority>",
                    "  </url>",
                ]
            )
        )
    if not entries:
        return f"{SITEMAP_MARKER_START}\n{SITEMAP_MARKER_END}"
    return "\n".join([SITEMAP_MARKER_START, *entries, SITEMAP_MARKER_END])


def update_sitemap(slugs: list[str]) -> None:
    text = SITEMAP_PATH.read_text(encoding="utf-8")
    block = generate_sitemap_team_block(slugs)
    marker_pattern = re.compile(
        re.escape(SITEMAP_MARKER_START) + r".*?" + re.escape(SITEMAP_MARKER_END),
        flags=re.DOTALL,
    )

    if marker_pattern.search(text):
        updated = marker_pattern.sub(block, text, count=1)
    else:
        updated = text.replace("</urlset>", block + "\n</urlset>")

    if updated == text:
        return
    SITEMAP_PATH.write_text(updated, encoding="utf-8")


def main() -> None:
    members = json.loads(TEAM_DATA_PATH.read_text(encoding="utf-8"))
    if not isinstance(members, list):
        raise RuntimeError("team-members.json must contain a list")

    template_html = TEAM_TEMPLATE_PATH.read_text(encoding="utf-8")
    generated_slugs: list[str] = []
    for member in members:
        if not isinstance(member, dict):
            continue
        slug, alias_html = render_alias_page(template_html, member)
        alias_path = TEAM_DIR / f"{slug}.html"
        alias_path.write_text(alias_html, encoding="utf-8")
        generated_slugs.append(slug)

    update_sitemap(generated_slugs)
    print(f"Generated {len(generated_slugs)} team profile alias pages.")
    for slug in generated_slugs:
        print(f" - team/{slug}.html")
    print("Updated sitemap team profile entries.")


if __name__ == "__main__":
    main()
