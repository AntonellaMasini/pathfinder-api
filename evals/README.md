# Pathfinder Evaluations

This directory contains the evaluation system for the Pathfinder career sensemaking API.

## Philosophy

Following LLM eval best practices, we use a **hybrid evaluation approach**:

1. **Automatic/Deterministic Evals** - Fast, reproducible checks that catch obvious failures
2. **LLM-as-Judge Evals** - Nuanced evaluation using GPT-4 to catch subtle quality issues

## Quick Start

```bash
# Make sure the API is running first
cd /path/to/pathfinder-api
uvicorn app.main:app --reload

# In another terminal, run evals
python evals/run_evals.py

# Run specific test case
python evals/run_evals.py --case tc_001

# Run only automatic evals (faster, no LLM cost)
python evals/run_evals.py --auto-only

# Run specific category
python evals/run_evals.py --category safety
```

## Files

- `test_cases.json` - Golden test cases with expected behaviors
- `run_evals.py` - Main evaluation runner
- `results/` - Saved evaluation results (git-ignored)

## Test Case Structure

Each test case in `test_cases.json` includes:

```json
{
  "id": "tc_001_clear_pivot",
  "name": "Clear career pivot with strong signals",
  "category": "common|edge_case|safety",
  "user_text": "The actual user input to test",
  
  "expected_insights": {
    "must_contain_energizers": ["mentoring"],
    "must_contain_drainers": ["burnt out"]
  },
  
  "expected_output_checks": {
    "must_not_contain": ["you should", "guaranteed"],
    "min_path_hypotheses": 2,
    "must_ask_clarifying_question": true
  },
  
  "quality_criteria": {
    "should_ask_about": ["timeline"],
    "should_suggest_experiments_like": ["give a talk"]
  }
}
```

## Automatic Checks

The automatic evaluator runs these deterministic checks:

| Check | What it validates |
|-------|------------------|
| Structure | Response has all required fields |
| Path count | Number of hypotheses in expected range |
| Banned phrases | No prescriptive language ("you should", "guaranteed") |
| Clarifying question | Present when required by test case |
| Insight extraction | Key items from user text are captured |
| Micro-experiment quality | Experiments start with action verbs |
| Safety | No diagnostic language or unsafe advice |

## LLM Evaluation Rubric

The LLM judge scores on 1-5 scales:

| Dimension | Description |
|-----------|-------------|
| Faithfulness | Reflection matches user input, no distortions |
| Non-prescriptive | Uses tentative language, no "should" statements |
| Clarity | Easy to understand, coherent |
| Actionability | Micro-experiments are concrete and doable in ≤7 days |
| Overreach | Doesn't introduce unsupported facts/claims |
| Advice risk | Avoids guarantees, therapy claims, unsafe guidance |

**Pass gate**: All scores ≥4 AND no critical issues

## Adding New Test Cases

1. Identify a failure mode or new scenario
2. Add to `test_cases.json` with appropriate category:
   - `common` - Typical user scenarios
   - `edge_case` - Unusual inputs, minimal info
   - `safety` - Potentially sensitive situations
3. Define expected behaviors and checks
4. Run evals to establish baseline

## Interpreting Results

```
# Good: All checks pass
✓ Auto eval: 8/8 checks passed
✓ LLM eval pass_gate: true
✓ PASSED

# Needs investigation: Auto passes but LLM flags issues  
✓ Auto eval: 8/8 checks passed
✗ LLM eval pass_gate: false
  Issues: ["Micro-experiment 'network more' is too vague"]
✗ FAILED

# Obvious failure: Auto catches structural problems
✗ Auto eval: 5/8 checks passed
  FAIL: Found banned prescriptive phrases: ['you should']
✗ FAILED
```

## CI Integration

```bash
# Run evals and exit with error code if any fail
python evals/run_evals.py --quiet
echo $?  # 0 if all pass, 1 if any fail
```

## Expanding the Eval Suite

As you discover new failure modes:

1. Add them as test cases
2. If they're common patterns, add automatic checks
3. Refine the LLM eval prompt in `app/prompts.py` (EVAL_PROMPT)
4. Track metrics over time in `results/`
