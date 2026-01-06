from pydantic import BaseModel, Field
from typing import List

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
