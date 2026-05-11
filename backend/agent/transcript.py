import json
import re
import urllib.request
import yt_dlp


def _parse_json3_subs(data: dict) -> str:
    """Parse YouTube json3 subtitle format into plain text."""
    events = data.get("events", [])
    words = []
    for event in events:
        for seg in event.get("segs", []):
            text = seg.get("utf8", "").strip()
            if text and text != "\n":
                words.append(text)
    return " ".join(words)


def _fetch_sub_url(url: str) -> str:
    """Fetch subtitle content from a URL and parse it."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode("utf-8")
        try:
            data = json.loads(raw)
            return _parse_json3_subs(data)
        except json.JSONDecodeError:
            # Might be VTT format — strip tags
            text = re.sub(r"<[^>]+>", "", raw)
            text = re.sub(r"\d{2}:\d{2}:\d{2}\.\d{3} --> .*\n", "", text)
            text = re.sub(r"\n+", " ", text)
            return text.strip()
    except Exception:
        return ""


def get_transcript(youtube_url: str) -> dict:
    """
    Extract video metadata and transcript using yt-dlp.
    Falls back to description if captions unavailable.
    Returns dict with title, channel, duration, url, transcript, thumbnail.
    """
    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en", "en-US", "en-GB"],
        "subtitlesformat": "json3",
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)

    video_id = info.get("id", "")
    title = info.get("title", "")
    channel = info.get("uploader", "")
    duration = info.get("duration", 0)
    thumbnail = info.get("thumbnail", "")
    description = info.get("description", "")[:2000]

    # Try to get transcript from subtitles
    transcript = ""
    requested_subs = info.get("requested_subtitles") or {}
    automatic_subs = info.get("automatic_captions") or {}

    all_subs = {**requested_subs, **automatic_subs}

    for lang in ["en", "en-US", "en-GB"]:
        if lang in all_subs:
            sub_info = all_subs[lang]
            # sub_info might be a list (multiple formats) or a dict
            if isinstance(sub_info, list):
                sub_info = sub_info[0] if sub_info else {}
            sub_url = sub_info.get("url", "")
            if sub_url:
                transcript = _fetch_sub_url(sub_url)
                if len(transcript) > 200:
                    break

    # Fallback: use description + chapters
    if len(transcript) < 200:
        chapters = info.get("chapters") or []
        chapter_text = " | ".join(
            f"{c.get('title', '')}" for c in chapters
        )
        transcript = f"{description}\n\nChapters: {chapter_text}".strip()

    return {
        "video_id": video_id,
        "title": title,
        "channel": channel,
        "duration": duration,
        "url": youtube_url,
        "transcript": transcript[:8000],  # cap at 8k chars
        "thumbnail": thumbnail,
        "description": description,
    }


def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r"youtu\.be/([a-zA-Z0-9_-]{11})",
        r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
        r"youtube\.com/embed/([a-zA-Z0-9_-]{11})",
        r"youtube\.com/v/([a-zA-Z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return ""


def is_youtube_url(s: str) -> bool:
    return "youtube.com" in s or "youtu.be" in s
