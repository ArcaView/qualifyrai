"""Scoring package - Baseline and LLM-enhanced candidate scoring."""
from app.scoring.engine import ScoringEngine

try:
    from app.scoring.llm_scorer import get_llm_scorer, LLMScorer
    __all__ = ['ScoringEngine', 'get_llm_scorer', 'LLMScorer']
except ImportError:
    # LLM dependencies not installed
    __all__ = ['ScoringEngine']
