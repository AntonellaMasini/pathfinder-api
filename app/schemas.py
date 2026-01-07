from pydantic import BaseModel, Field
from typing import List, Optional

class ReflectRequest(BaseModel):
    text: str = Field(..., min_length=10, description="User reflection / story")

class Insights(BaseModel):
    energizers: List[str] = []
    drainers: List[str] = []
    values: List[str] = []
    skills: List[str] = []
    work_styles: List[str] = []
    constraints: List[str] = []
    open_questions: List[str] = []

class PathHypothesis(BaseModel):
    name: str
    why_it_fits: str
    risks: List[str] = []
    micro_experiments: List[str] = []

class ReflectResponse(BaseModel):
    insights: Insights
    reflection: str
    clarifying_question: str
    path_hypotheses: List[PathHypothesis]

class IssueEvidence(BaseModel):
    issue: str
    evidence: Optional[str] = None  # quote or pointer to specific sentence/field
    suggestion: Optional[str] = None


class EvalResult(BaseModel):
    # 1–5 scales (5 is best)
    faithfulness: int = Field(..., ge=1, le=5)
    non_prescriptive: int = Field(..., ge=1, le=5)
    clarity: int = Field(..., ge=1, le=5)
    actionability: int = Field(..., ge=1, le=5)
    overreach: int = Field(..., ge=1, le=5)     # 5 = no unsupported claims
    advice_risk: int = Field(..., ge=1, le=5)   # 5 = safe, no “therapy/guarantees/should”

    issues: List[str] = []
    issue_evidence: List[IssueEvidence] = []
    overall_assessment: str

    pass_gate: bool
