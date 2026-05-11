import json
import os
import time

from groq import Groq

MODEL = "llama-3.3-70b-versatile"


def _client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is required for curriculum generation")
    return Groq(api_key=api_key)


def _clean_json(raw: str) -> str:
    text = raw.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            p = part.lstrip("json").strip()
            if p.startswith("{") or p.startswith("["):
                return p.split("```")[0].strip()
    start = text.find("{")
    if start != -1:
        return text[start:]
    return text


# ── Curriculum builder ─────────────────────────────────────────────────────────

CURRICULUM_PROMPT = """You are designing a complete self-contained course from YouTube videos.

TOPIC: {topic}

AVAILABLE VIDEOS:
{video_list}

ALL CONCEPTS COVERED:
{concept_list}

Design a logical course curriculum. Group lessons into 2-4 modules that build progressively.

Rules:
- Every video becomes at least one lesson
- A video covering multiple topics can become multiple lessons with different timestamp ranges
- Add "written" lessons ONLY for genuinely important concepts not covered by any video
- End EVERY module with a "quiz" lesson
- Order lessons so prerequisites come before dependent concepts
- Course title should be engaging and specific

Return ONLY valid JSON:
{{
  "course_title": "Specific Engaging Course Title",
  "topic": "{topic}",
  "modules": [
    {{
      "title": "Module title",
      "description": "One sentence what this module covers",
      "lessons": [
        {{
          "type": "video",
          "title": "Lesson title",
          "video_url": "https://youtube.com/watch?v=...",
          "video_title": "Original video title",
          "channel": "Channel name",
          "focus_start_sec": 0,
          "focus_end_sec": 0,
          "summary": "One sentence: what the learner will understand after this lesson",
          "concepts": ["concept1", "concept2", "concept3"]
        }},
        {{
          "type": "written",
          "title": "Lesson title",
          "topic": "Exact topic to write about",
          "summary": "What this written lesson covers",
          "concepts": ["concept1"]
        }},
        {{
          "type": "quiz",
          "title": "Module Quiz",
          "summary": "Test understanding of this module",
          "concepts": ["all", "concepts", "from", "this", "module"]
        }}
      ]
    }}
  ]
}}"""


def build_curriculum(
    all_videos: list[dict],
    all_concepts: list[dict],
    topic: str,
) -> dict:
    """Order all videos into a logical curriculum. Returns curriculum dict."""
    video_list_str = "\n".join(
        f"- [{v.get('title', 'Unknown')}] by {v.get('channel', '')} | {v.get('url', '')} | {v.get('duration', 0)//60}min"
        for v in all_videos
    )
    concept_list_str = "\n".join(
        f"- {c.get('concept', '')} (depth {c.get('depth', 1)}, from: {c.get('source_title', '')})"
        for c in all_concepts[:40]
    )

    prompt = CURRICULUM_PROMPT.format(
        topic=topic,
        video_list=video_list_str,
        concept_list=concept_list_str,
    )

    try:
        response = _client().chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.2,
        )
        raw = response.choices[0].message.content
        return json.loads(_clean_json(raw))
    except Exception as e:
        # Return minimal valid structure
        return {
            "course_title": topic,
            "topic": topic,
            "modules": [
                {
                    "title": "Full Course",
                    "description": topic,
                    "lessons": [
                        {
                            "type": "video",
                            "title": v.get("title", "Video"),
                            "video_url": v.get("url", ""),
                            "video_title": v.get("title", ""),
                            "channel": v.get("channel", ""),
                            "focus_start_sec": 0,
                            "focus_end_sec": 0,
                            "summary": "",
                            "concepts": [],
                        }
                        for v in all_videos
                    ],
                }
            ],
        }


# ── Written lesson writer ──────────────────────────────────────────────────────

LESSON_PROMPT = """Write a clear, educational lesson for a course on "{course_title}".

LESSON TOPIC: {topic}
ASSUMED PRIOR KNOWLEDGE: {prior_knowledge}

Requirements:
- 450-600 words
- Start with a bold one-sentence definition or key insight
- Use concrete examples and analogies, not just theory
- Include Python or math notation where it clarifies things
- End with a "## Key Takeaways" section (3-5 bullet points)
- Markdown format: use ##, ###, **bold**, code blocks, bullet lists
- Dense with information — no padding, no filler phrases

Write the lesson now:"""


def write_lesson(
    topic: str,
    prior_concepts: list[str],
    course_title: str,
) -> str:
    """Generate a complete written lesson in Markdown."""
    prior = ", ".join(prior_concepts[:8]) if prior_concepts else "basic programming"
    prompt = LESSON_PROMPT.format(
        course_title=course_title,
        topic=topic,
        prior_knowledge=prior,
    )
    try:
        response = _client().chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.5,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return f"# {topic}\n\nContent could not be generated. Please refer to the video lessons in this module."


# ── Quiz generator ─────────────────────────────────────────────────────────────

QUIZ_PROMPT = """Generate {n} multiple-choice quiz questions for a course module on "{module_title}".

Concepts to test: {concepts}

Rules:
- Each question tests ONE specific concept from the list
- 3 answer options (exactly)
- Only one correct answer
- Wrong answers must be plausible — not obviously silly
- Questions test understanding, not memorization of definitions
- Vary question types: "what does X do", "what would happen if...", "which of these is correct..."

Return ONLY valid JSON array:
[
  {{
    "question": "Clear, specific question text?",
    "options": ["Option A", "Option B", "Option C"],
    "correct_index": 0,
    "explanation": "Brief explanation of why this answer is correct and why others aren't"
  }}
]"""


def generate_quiz(
    module_title: str,
    concepts: list[str],
    num_questions: int = 4,
) -> list[dict]:
    """Generate multiple-choice quiz questions for a module."""
    if not concepts:
        concepts = [module_title]

    prompt = QUIZ_PROMPT.format(
        n=num_questions,
        module_title=module_title,
        concepts=", ".join(concepts[:12]),
    )

    try:
        response = _client().chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1200,
            temperature=0.4,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                p = part.lstrip("json").strip()
                if p.startswith("["):
                    raw = p.split("```")[0].strip()
                    break
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1:
            raw = raw[start:end + 1]
        questions = json.loads(raw)
        return questions if isinstance(questions, list) else []
    except Exception:
        return [
            {
                "question": f"What is a key concept covered in the {module_title} module?",
                "options": [concepts[0] if concepts else "N/A", "None of the above", "Both A and B"],
                "correct_index": 0,
                "explanation": "This concept is central to this module.",
            }
        ]
