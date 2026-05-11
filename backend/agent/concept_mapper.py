import json
import os

from groq import Groq

MODEL = "llama-3.3-70b-versatile"


def _client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is required for concept mapping")
    return Groq(api_key=api_key)

PROMPT = """You are an expert curriculum designer analyzing a YouTube video transcript.

VIDEO TITLE: {title}
CHANNEL: {channel}
DURATION: {duration} seconds

TRANSCRIPT / DESCRIPTION:
{transcript}

Analyze this content and extract a structured concept map.

Return ONLY valid JSON, no markdown, no explanation:
{{
  "topic": "3-6 word description of the overall topic",
  "level": "beginner|intermediate|advanced",
  "concepts": [
    {{
      "concept": "exact concept name",
      "depth": 1,
      "coverage": "thorough|mentions|shallow",
      "depends_on": []
    }}
  ],
  "missing_concepts": [
    "concept A that a learner needs but this video doesn't cover",
    "concept B"
  ],
  "assumed_knowledge": [
    "prerequisite concept assumed but not explained"
  ]
}}

Rules:
- concepts depth: 1=surface mention, 3=explained well, 5=deeply covered
- missing_concepts: important concepts a learner of this topic would need, not covered here (max 8)
- Be specific, not vague. "gradient descent with momentum" not just "optimization"
- Only list concepts actually relevant to the topic"""


def _clean_json(raw: str) -> str:
    text = raw.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.lstrip("json").strip()
            if part.startswith("{"):
                return part.split("```")[0].strip()
    return text


def map_concepts(video_data: dict) -> dict:
    """Extract concept map from video data. Returns structured dict."""
    duration_str = f"{video_data.get('duration', 0) // 60} min"
    prompt = PROMPT.format(
        title=video_data.get("title", ""),
        channel=video_data.get("channel", ""),
        duration=duration_str,
        transcript=video_data.get("transcript", "")[:5000],
    )

    try:
        response = _client().chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.1,
        )
        raw = response.choices[0].message.content
        data = json.loads(_clean_json(raw))
    except Exception as e:
        data = {
            "topic": video_data.get("title", "Unknown topic"),
            "level": "intermediate",
            "concepts": [],
            "missing_concepts": [],
            "assumed_knowledge": [],
        }

    # Tag each concept with its source video
    for c in data.get("concepts", []):
        c["source_video_id"] = video_data.get("video_id", "")
        c["source_title"] = video_data.get("title", "")

    return data
