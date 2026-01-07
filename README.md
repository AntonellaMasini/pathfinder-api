# Project Outline

## Problem
As technology accelerates and new roles emerge faster than formal education can adapt, career decision-making has become increasingly fragmented and overwhelming. Many people no longer follow linear paths tied to a single degree, and a growing number work in fields unrelated to their original training.

Despite this shift, most career tools still rely on static taxonomies, job titles, or prescriptive recommendations. These approaches fail to capture how people actually experience work — through energy, motivation, context, and constraints. As a result, many individuals struggle not because they lack options, but because they lack clarity.

## Solution — Pathfinder
Pathfinder is a text- and voice-based career sensemaking tool designed to help people articulate their experiences, surface hidden patterns, and explore possible professional directions without prescribing a single “right” answer.

Instead of matching users to predefined jobs, Pathfinder reflects back their stated energizers, drainers, skills, values, and constraints, and proposes a small set of path hypotheses: archetypal ways of working rather than job titles. The system emphasizes reflection, uncertainty, and experimentation, helping users move from confusion to actionable insight while preserving personal agency.

## MVP
The current MVP allows a user to describe their work experiences and motivations in free-form text. Using an LLM-based reasoning layer, the system:
- extracts structured signals (energizers, values, skills, work styles, constraints)
- generates a reflective summary in human, non-prescriptive language
- proposes 2–3 path hypotheses aligned with those patterns
- suggests concrete, short-term micro-experiments to test each path in the real world
- reads reflections aloud using text-to-speech, supporting accessibility and emotional resonance

To reduce overreach, the system includes an internal evaluation layer that checks outputs for prescriptiveness, unsupported claims, and vague actions, retrying generation only when necessary.

The MVP is intentionally minimal, prioritizing reasoning quality, clarity, and human-centered design over interface complexity or scale.

## Notes

This project is an exploration of how AI systems can support self-understanding and decision-making under uncertainty — not by optimizing outcomes, but by improving sensemaking.

http://127.0.0.1:8000/docs