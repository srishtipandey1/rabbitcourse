import json
import os
import time
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from typing import Callable, Optional

from groq import Groq

MODEL = "llama-3.3-70b-versatile"
YT_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")


def _client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is required for autonomous gap filling")
    return Groq(api_key=api_key)

# ── YouTube search ─────────────────────────────────────────────────────────────

def search_youtube(query: str, max_results: int = 5) -> list[dict]:
    """Search YouTube Data API v3. Falls back to scrape if no API key."""
    if YT_API_KEY:
        return _search_api(query, max_results)
    return _search_fallback(query, max_results)


def _search_api(query: str, max_results: int) -> list[dict]:
    params = urllib.parse.urlencode({
        "part": "snippet",
        "q": query,
        "type": "video",
        "videoDuration": "medium",
        "relevanceLanguage": "en",
        "maxResults": max_results,
        "key": YT_API_KEY,
    })
    try:
        url = f"https://www.googleapis.com/youtube/v3/search?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        return [
            {
                "video_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "channel": item["snippet"]["channelTitle"],
                "description": item["snippet"]["description"][:200],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            }
            for item in data.get("items", [])
            if item.get("id", {}).get("videoId")
        ]
    except Exception:
        return []


def _search_fallback(query: str, max_results: int) -> list[dict]:
    """Scrape YouTube search results as fallback (no API key needed)."""
    import re
    encoded = urllib.parse.quote(query)
    url = f"https://www.youtube.com/results?search_query={encoded}"
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req, timeout=10) as r:
            html = r.read().decode("utf-8")
        video_ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        titles = re.findall(r'"title":\{"runs":\[\{"text":"([^"]+)"', html)
        channels = re.findall(r'"ownerText":\{"runs":\[\{"text":"([^"]+)"', html)

        results = []
        seen = set()
        for i, vid_id in enumerate(video_ids):
            if vid_id in seen or len(results) >= max_results:
                break
            seen.add(vid_id)
            results.append({
                "video_id": vid_id,
                "title": titles[i] if i < len(titles) else "Unknown",
                "channel": channels[i] if i < len(channels) else "Unknown",
                "description": "",
                "url": f"https://www.youtube.com/watch?v={vid_id}",
            })
        return results
    except Exception:
        return []


# ── Tool definitions ───────────────────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_youtube",
            "description": "Search YouTube for educational videos. Returns up to 5 results with titles, channels, video IDs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Specific search query e.g. 'backpropagation chain rule neural networks explained'"
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "select_video",
            "description": "Add a video to the course because it fills a knowledge gap.",
            "parameters": {
                "type": "object",
                "properties": {
                    "video_id": {"type": "string", "description": "YouTube video ID"},
                    "fills_gap": {"type": "string", "description": "Which missing concept this video covers"},
                },
                "required": ["video_id", "fills_gap"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "declare_complete",
            "description": "Declare the knowledge graph complete — all important gaps are filled or no suitable videos exist.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string"}
                },
                "required": ["reason"],
            },
        },
    },
]


# ── Agent loop ─────────────────────────────────────────────────────────────────

def find_and_fill_gaps(
    covered_concepts: list[str],
    missing_concepts: list[str],
    existing_urls: set[str],
    topic: str,
    max_videos: int = 5,
    marginal_gain_threshold: float = 0.18,
    progress_cb: Optional[Callable] = None,
) -> list[dict]:
    """
    Agentic loop: searches YouTube to fill knowledge gaps.
    Returns list of dicts: {url, video_id, fills_gap}
    """
    if not missing_concepts:
        return []

    selected_videos: list[dict] = []
    filled_gaps: set[str] = set()
    last_gain = 1.0
    stale_iterations = 0

    messages = [
        {
            "role": "user",
            "content": (
                f"You are finding YouTube videos to complete a course on: {topic}\n\n"
                f"CONCEPTS ALREADY COVERED:\n"
                + "\n".join(f"- {c}" for c in covered_concepts[:25])
                + f"\n\nCONCEPTS STILL MISSING (need videos for these):\n"
                + "\n".join(f"- {c}" for c in missing_concepts)
                + f"\n\nINSTRUCTIONS:\n"
                f"1. Search for videos covering the missing concepts\n"
                f"2. Prefer channels known for clarity: 3Blue1Brown, Andrej Karpathy, StatQuest, sentdex, The Coding Train, etc\n"
                f"3. Select videos that cover multiple missing concepts at once when possible\n"
                f"4. Select at most {max_videos} videos total\n"
                f"5. When you've filled all important gaps OR marginal new knowledge is low, call declare_complete\n"
                f"6. Do NOT select videos already in the course\n\n"
                f"Start searching now."
            ),
        }
    ]

    max_iterations = (max_videos * 3) + 5

    for _ in range(max_iterations):
        try:
            response = _client().chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=800,
                temperature=0.2,
            )
        except Exception as e:
            if progress_cb:
                progress_cb("error", f"LLM error: {e}")
            break

        msg = response.choices[0].message
        tool_calls = msg.tool_calls or []

        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in tool_calls
            ],
        })

        if not tool_calls:
            break

        tool_results = []
        done = False

        for tc in tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments)
            except Exception:
                args = {}

            if name == "search_youtube":
                query = args.get("query", topic)
                if progress_cb:
                    progress_cb("search", f"Searching: {query}")
                results = search_youtube(query, 5)
                # Filter already-selected and title-level redundancy before transcript extraction.
                results = [r for r in results if r["url"] not in existing_urls]
                results = [
                    r for r in results
                    if not _is_redundant_video(r, selected_videos, topic)
                ]
                result_content = json.dumps(results) if results else json.dumps([{"error": "no results"}])

            elif name == "select_video":
                vid_id = args.get("video_id", "")
                fills_gap = args.get("fills_gap", "")
                url = f"https://www.youtube.com/watch?v={vid_id}"

                if url not in existing_urls and len(selected_videos) < max_videos:
                    selected_videos.append({
                        "url": url,
                        "video_id": vid_id,
                        "fills_gap": fills_gap,
                    })
                    existing_urls.add(url)
                    before = len(filled_gaps)
                    for gap in missing_concepts:
                        if _gap_overlap(gap, fills_gap):
                            filled_gaps.add(gap)
                    gain = (len(filled_gaps) - before) / max(len(missing_concepts), 1)
                    last_gain = gain
                    stale_iterations = stale_iterations + 1 if gain < marginal_gain_threshold else 0
                    if progress_cb:
                        progress_cb(
                            "video_selected",
                            f"Selected video for: {fills_gap} | marginal gain {gain:.0%}",
                        )

                result_content = json.dumps({
                    "status": "added",
                    "selected_so_far": len(selected_videos),
                    "max_videos": max_videos,
                    "marginal_gain": round(last_gain, 3),
                })

                if len(selected_videos) >= max_videos or stale_iterations >= 2:
                    if progress_cb and stale_iterations >= 2:
                        progress_cb("adaptive_stop", "Stopped because new videos were adding little new knowledge.")
                    done = True

            elif name == "declare_complete":
                if progress_cb:
                    progress_cb("gaps_done", args.get("reason", "Gaps filled"))
                done = True
                result_content = json.dumps({"status": "complete"})

            else:
                result_content = json.dumps({"error": "unknown tool"})

            tool_results.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result_content,
            })
            time.sleep(0.2)

        messages.extend(tool_results)

        if done:
            break

    return selected_videos


def _gap_overlap(gap: str, fills_gap: str) -> bool:
    g = gap.lower()
    f = fills_gap.lower()
    if g in f or f in g:
        return True
    return SequenceMatcher(None, g, f).ratio() >= 0.62


def _is_redundant_video(candidate: dict, selected: list[dict], topic: str) -> bool:
    title = candidate.get("title", "").lower()
    if not title:
        return False
    for item in selected:
        previous = (item.get("title") or item.get("fills_gap") or topic).lower()
        if SequenceMatcher(None, title, previous).ratio() >= 0.78:
            return True
    return False
