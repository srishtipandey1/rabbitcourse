import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned[:72] or hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]


def _norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def concept_difficulty(concept: dict) -> str:
    name = _norm(concept.get("concept", ""))
    depth = int(concept.get("depth", 1) or 1)
    advanced_terms = ("optimization", "gradient", "backprop", "architecture", "distributed", "regularization", "proof")
    intermediate_terms = ("state", "async", "model", "query", "component", "matrix", "vector", "function")
    if depth >= 4 or any(t in name for t in advanced_terms):
        return "advanced"
    if depth >= 2 or any(t in name for t in intermediate_terms):
        return "intermediate"
    return "beginner"


def build_knowledge_graph(course_id: str, curriculum: dict, concepts: list[dict], videos: list[dict]) -> dict:
    """Create a persistent graph from extracted concepts and the built curriculum."""
    by_name: dict[str, dict] = {}
    source_counter: dict[str, set[str]] = defaultdict(set)
    depth_counter: Counter[str] = Counter()

    for concept in concepts:
        name = concept.get("concept", "").strip()
        if not name:
            continue
        key = _norm(name)
        source = concept.get("source_video_id") or concept.get("source_title") or "written"
        source_counter[key].add(source)
        depth_counter[key] += int(concept.get("depth", 1) or 1)
        current = by_name.setdefault(key, {"name": name, "raw": []})
        current["raw"].append(concept)

    nodes: list[dict] = []
    edges: list[dict] = []
    concept_ids: dict[str, str] = {}

    for key, item in by_name.items():
        source_count = len(source_counter[key])
        avg_depth = depth_counter[key] / max(len(item["raw"]), 1)
        confidence = min(0.98, 0.35 + (source_count * 0.18) + (avg_depth * 0.08))
        difficulty = concept_difficulty(item["raw"][0])
        concept_id = f"concept-{_slug(item['name'])}"
        concept_ids[key] = concept_id
        nodes.append({
            "id": concept_id,
            "type": "concept",
            "label": item["name"],
            "difficulty": difficulty,
            "confidence": round(confidence, 2),
            "source_count": source_count,
            "mastery": 35 if difficulty == "beginner" else 25 if difficulty == "intermediate" else 15,
        })

        for raw in item["raw"]:
            for prereq in raw.get("depends_on", []) or []:
                target_key = _norm(prereq)
                target_id = concept_ids.get(target_key) or f"concept-{_slug(prereq)}"
                edges.append({
                    "from": target_id,
                    "to": concept_id,
                    "type": "depends_on",
                    "strength": 0.72,
                    "evidence": f"{item['name']} depends on {prereq}",
                })

    for video in videos:
        video_id = video.get("video_id") or _slug(video.get("url", video.get("title", "video")))
        node_id = f"video-{video_id}"
        nodes.append({
            "id": node_id,
            "type": "video",
            "label": video.get("title", "Video"),
            "url": video.get("url", ""),
            "channel": video.get("channel", ""),
        })
        for concept in concepts:
            if concept.get("source_video_id") == video.get("video_id") and _norm(concept.get("concept", "")) in concept_ids:
                edges.append({
                    "from": node_id,
                    "to": concept_ids[_norm(concept["concept"])],
                    "type": "explains",
                    "strength": min(1, 0.25 + (int(concept.get("depth", 1) or 1) * 0.15)),
                    "evidence": video.get("title", ""),
                })

    for module_index, module in enumerate(curriculum.get("modules", [])):
        module_concepts: list[str] = []
        for lesson_index, lesson in enumerate(module.get("lessons", [])):
            lesson_id = f"lesson-{module_index}-{lesson_index}"
            nodes.append({
                "id": lesson_id,
                "type": "lesson",
                "label": lesson.get("title", "Lesson"),
                "lesson_type": lesson.get("type", "written"),
                "module_index": module_index,
                "lesson_index": lesson_index,
            })
            for concept_name in lesson.get("concepts", []) or []:
                concept_id = concept_ids.get(_norm(concept_name))
                if concept_id:
                    edges.append({
                        "from": lesson_id,
                        "to": concept_id,
                        "type": "explains" if lesson.get("type") != "quiz" else "reinforces",
                        "strength": 0.65,
                        "evidence": lesson.get("title", ""),
                    })
                    module_concepts.append(concept_name)

        for left, right in zip(module_concepts, module_concepts[1:]):
            left_id = concept_ids.get(_norm(left))
            right_id = concept_ids.get(_norm(right))
            if left_id and right_id and left_id != right_id:
                edges.append({
                    "from": left_id,
                    "to": right_id,
                    "type": "reinforces",
                    "strength": 0.35,
                    "evidence": module.get("title", ""),
                })

    contradictions = detect_contradictions(concepts)
    for item in contradictions:
        a = concept_ids.get(_norm(item["concept_a"]))
        b = concept_ids.get(_norm(item["concept_b"]))
        if a and b and a != b:
            edges.append({
                "from": a,
                "to": b,
                "type": "contradicts",
                "strength": item["strength"],
                "evidence": item["evidence"],
            })

    return {
        "course_id": course_id,
        "generated_at": datetime.utcnow().isoformat(),
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "concepts": len([n for n in nodes if n["type"] == "concept"]),
            "videos": len([n for n in nodes if n["type"] == "video"]),
            "lessons": len([n for n in nodes if n["type"] == "lesson"]),
            "contradictions": len([e for e in edges if e["type"] == "contradicts"]),
        },
    }


def detect_contradictions(concepts: list[dict]) -> list[dict]:
    """Heuristic contradiction detector. Flags conflicting coverage depth for near-identical concepts."""
    grouped: dict[str, list[dict]] = defaultdict(list)
    for concept in concepts:
        grouped[_norm(concept.get("concept", ""))].append(concept)

    contradictions = []
    for items in grouped.values():
        if len(items) < 2:
            continue
        depths = [int(c.get("depth", 1) or 1) for c in items]
        coverages = {c.get("coverage", "") for c in items}
        if max(depths) - min(depths) >= 3 and {"thorough", "shallow"}.issubset(coverages):
            contradictions.append({
                "concept_a": items[0].get("concept", ""),
                "concept_b": items[-1].get("concept", ""),
                "strength": 0.42,
                "evidence": "Sources disagree on how completely this concept is explained.",
            })
    return contradictions


def enrich_curriculum(curriculum: dict, graph: dict) -> dict:
    concept_nodes = {n["label"]: n for n in graph.get("nodes", []) if n.get("type") == "concept"}
    ordered_concepts = list(concept_nodes)

    for module_index, module in enumerate(curriculum.get("modules", [])):
        module["mastery_target"] = 80
        module["mini_project"] = _mini_project(module.get("title", ""), module.get("lessons", []))
        module["revision_trigger"] = "Resurface this module if quiz score drops below 75% or mastery falls under 60."

        for lesson_index, lesson in enumerate(module.get("lessons", [])):
            lesson["lesson_key"] = f"{module_index}-{lesson_index}"
            lesson_concepts = lesson.get("concepts", []) or []
            lesson["difficulty"] = _aggregate_difficulty([concept_nodes.get(c) for c in lesson_concepts])
            lesson["confidence"] = _aggregate_confidence([concept_nodes.get(c) for c in lesson_concepts])
            lesson["mastery_delta"] = {c: 8 if lesson.get("type") == "video" else 10 for c in lesson_concepts}
            lesson["notes"] = [f"Connect {c} to one real example before moving on." for c in lesson_concepts[:2]]

            if lesson.get("type") == "video":
                lesson["concept_markers"] = _concept_markers(lesson_concepts, lesson.get("focus_start_sec", 0), lesson.get("focus_end_sec", 0))
                lesson["skip_guidance"] = "Use the marked range first; revisit the full video only if confidence is below 70%."
            elif lesson.get("type") == "written":
                summary = lesson.get("summary") or lesson.get("topic") or lesson.get("title")
                lesson["layers"] = {
                    "simple": f"{summary}. Start by naming the problem this concept solves.",
                    "deeper": f"Trace how {lesson.get('title', 'this idea')} depends on earlier concepts and changes what you can build.",
                    "technical": "Use the formulas, code, or precise vocabulary in the lesson body to make the idea operational.",
                }
                lesson["diagram"] = _diagram_for(lesson_concepts or [lesson.get("title", "Concept")])
            elif lesson.get("type") == "quiz":
                lesson["adaptive"] = True
                lesson["retry_rule"] = "Missed concepts are routed into a short revision loop before the next module."

    curriculum["knowledge_graph"] = graph
    curriculum["learning_intelligence"] = {
        "mastery_score": _initial_mastery_score(graph),
        "weak_clusters": _weak_clusters(graph),
        "next_review_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "spaced_repetition": [
            {"concept": c, "review_in_days": days}
            for c, days in zip(ordered_concepts[:12], [1, 2, 4, 7, 14, 30] * 2)
        ],
        "adaptive_message": "Start with prerequisites, then accelerate through high-confidence concepts and revisit weak clusters after quizzes.",
    }
    return curriculum


def update_mastery(intelligence: dict, lesson: dict | None = None, quiz_score: int | None = None) -> dict:
    updated = dict(intelligence or {})
    current = int(updated.get("mastery_score", 35) or 35)
    if quiz_score is not None:
        current = max(0, min(100, round((current * 0.82) + (quiz_score * 0.18))))
    elif lesson:
        current = min(100, current + 2)
    updated["mastery_score"] = current
    updated["adaptive_message"] = (
        "You are struggling with core ideas, so RabbitCourse is revisiting fundamentals."
        if current < 55 else
        "Mastery is improving. The next lessons can move faster while keeping revision active."
    )
    return updated


def tutor_reply(course: dict, prompt: str, lesson: dict | None, intelligence: dict) -> str:
    concepts = ", ".join((lesson or {}).get("concepts", [])[:4]) or course.get("topic", "this topic")
    lower = prompt.lower()
    if "analogy" in lower:
        return f"Think of {concepts} as a control room: each concept is one instrument, and mastery is knowing which dial changes the outcome."
    if "test" in lower:
        return f"Quick check: explain {concepts} without naming the definition. What problem does it solve, and what would break without it?"
    if "next" in lower:
        return intelligence.get("adaptive_message", "Move to the next prerequisite-supported lesson, then retry the weakest quiz.")
    if "summar" in lower:
        return f"You just worked on {concepts}. Keep the durable takeaway: what it does, when to use it, and which prerequisite it relies on."
    return f"Here is another angle on {concepts}: first isolate the input, then the transformation, then the output. If any one part is fuzzy, revisit the prerequisite node in the graph."


def _aggregate_difficulty(nodes: list[dict | None]) -> str:
    score = {"beginner": 1, "intermediate": 2, "advanced": 3}
    valid = [n for n in nodes if n]
    if not valid:
        return "beginner"
    avg = sum(score.get(n.get("difficulty", "beginner"), 1) for n in valid) / len(valid)
    return "advanced" if avg >= 2.5 else "intermediate" if avg >= 1.6 else "beginner"


def _aggregate_confidence(nodes: list[dict | None]) -> float:
    valid = [n for n in nodes if n]
    if not valid:
        return 0.5
    return round(sum(float(n.get("confidence", 0.5)) for n in valid) / len(valid), 2)


def _concept_markers(concepts: list[str], start: int, end: int) -> list[dict]:
    if not concepts:
        return []
    if not end or end <= start:
        end = start + max(240, len(concepts) * 90)
    step = max(45, math.floor((end - start) / max(len(concepts), 1)))
    return [{"concept": c, "time_sec": start + (i * step)} for i, c in enumerate(concepts[:8])]


def _diagram_for(concepts: list[str]) -> str:
    safe = [re.sub(r"[^A-Za-z0-9 ]", "", c).strip() or "Concept" for c in concepts[:5]]
    lines = ["graph TD"]
    for i, concept in enumerate(safe):
        lines.append(f'  n{i}["{concept}"]')
        if i > 0:
            lines.append(f"  n{i-1} --> n{i}")
    return "\n".join(lines)


def _initial_mastery_score(graph: dict) -> int:
    concepts = [n for n in graph.get("nodes", []) if n.get("type") == "concept"]
    if not concepts:
        return 35
    return round(sum(int(n.get("mastery", 30)) for n in concepts) / len(concepts))


def _weak_clusters(graph: dict) -> list[dict]:
    concepts = [n for n in graph.get("nodes", []) if n.get("type") == "concept"]
    concepts.sort(key=lambda n: (int(n.get("mastery", 30)), float(n.get("confidence", 0.5))))
    return [
        {
            "concept": n["label"],
            "mastery": n.get("mastery", 30),
            "reason": f"{n.get('difficulty', 'beginner')} concept with {int(float(n.get('confidence', 0.5)) * 100)}% source confidence",
        }
        for n in concepts[:6]
    ]


def _mini_project(module_title: str, lessons: list[dict]) -> dict:
    concepts = []
    for lesson in lessons:
        concepts.extend(lesson.get("concepts", []) or [])
    target = ", ".join(concepts[:3]) or module_title
    return {
        "title": f"Apply {module_title}",
        "brief": f"Build a small artifact that uses {target}. Explain your decisions and one tradeoff.",
        "deliverable": "A short note, code sketch, diagram, or worked example.",
    }
