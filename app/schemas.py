from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, EmailStr


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

class SessionCreate(BaseModel):
    user_text: str = Field(..., min_length=10, max_length=8000)


class ResultOut(BaseModel):
    reflection: str
    clarifying_question: str
    insights: dict
    path_hypotheses: list
    eval_data: Optional[dict] = None
    retries_used: int

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: uuid.UUID
    user_text: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[ResultOut] = None

    model_config = {"from_attributes": True}


class SessionListItem(BaseModel):
    id: uuid.UUID
    user_text: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    # Just the first archetype name for preview
    first_archetype: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Existing AI schemas (unchanged)
# ---------------------------------------------------------------------------

class ReflectRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=8000)


class Insights(BaseModel):
    energizers: List[str] = []
    drainers: List[str] = []
    values: List[str] = []
    skills: List[str] = []
    work_styles: List[str] = []
    constraints: List[str] = []
    open_questions: List[str] = []


class EnvironmentFit(BaseModel):
    likely_to_fit: List[str]
    may_be_challenging: List[str]


class PathHypothesis(BaseModel):
    name: str
    why_it_fits: str
    risks: List[str] = []
    micro_experiments: List[str] = []
    environment_fit: EnvironmentFit
    example_roles: List[str]
    company_archetypes: List[str]


class ReflectResponse(BaseModel):
    insights: Insights
    reflection: str
    clarifying_question: str
    path_hypotheses: List[PathHypothesis]


class IssueEvidence(BaseModel):
    issue: str
    evidence: Optional[str] = None
    suggestion: Optional[str] = None


class EvalResult(BaseModel):
    faithfulness: int = Field(..., ge=1, le=5)
    non_prescriptive: int = Field(..., ge=1, le=5)
    clarity: int = Field(..., ge=1, le=5)
    actionability: int = Field(..., ge=1, le=5)
    overreach: int = Field(..., ge=1, le=5)
    advice_risk: int = Field(..., ge=1, le=5)
    issues: List[str] = []
    issue_evidence: List[IssueEvidence] = []
    overall_assessment: str
    pass_gate: bool
