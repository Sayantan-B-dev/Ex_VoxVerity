"""Language and Accent Metadata for VoxVerity.

Adds metadata, configuration and test scaffolding for Indian language/accent
coverage without claiming trained multilingual accuracy.

This module does NOT add multilingual model capabilities.
It provides metadata hooks so the system can track which languages
have been evaluated and what limitations exist.
"""

from typing import Optional, Dict, List
from dataclasses import dataclass, field


@dataclass
class LanguageProfile:
    """Profile for a supported language/accent."""
    code: str  # ISO 639-1
    name: str
    region: str = ""
    script: str = ""
    evaluated: bool = False
    known_limitations: List[str] = field(default_factory=list)
    notes: str = ""


# ── Supported Languages ──
# This is metadata only — no trained multilingual accuracy is claimed.
SUPPORTED_LANGUAGES: Dict[str, LanguageProfile] = {
    "en": LanguageProfile(
        code="en",
        name="English",
        region="Global",
        script="Latin",
        evaluated=True,
        known_limitations=[
            "Primary evaluation language",
            "AASIST-L trained on English-dominant datasets",
        ],
        notes="Best supported language for spoof detection",
    ),
    "hi": LanguageProfile(
        code="hi",
        name="Hindi",
        region="India",
        script="Devanagari",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "AASIST-L may have reduced accuracy",
            "ECAPA-TDNN may have reduced speaker verification accuracy",
        ],
        notes="Indian language — evaluation pending",
    ),
    "bn": LanguageProfile(
        code="bn",
        name="Bengali",
        region="India/Bangladesh",
        script="Bengali",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "ta": LanguageProfile(
        code="ta",
        name="Tamil",
        region="India/Sri Lanka",
        script="Tamil",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "te": LanguageProfile(
        code="te",
        name="Telugu",
        region="India",
        script="Telugu",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "mr": LanguageProfile(
        code="mr",
        name="Marathi",
        region="India",
        script="Devanagari",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "gu": LanguageProfile(
        code="gu",
        name="Gujarati",
        region="India",
        script="Gujarati",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "kn": LanguageProfile(
        code="kn",
        name="Kannada",
        region="India",
        script="Kannada",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "ml": LanguageProfile(
        code="ml",
        name="Malayalam",
        region="India",
        script="Malayalam",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "pa": LanguageProfile(
        code="pa",
        name="Punjabi",
        region="India/Pakistan",
        script="Gurmukhi",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "ur": LanguageProfile(
        code="ur",
        name="Urdu",
        region="India/Pakistan",
        script="Arabic",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Limited training data availability",
        ],
    ),
    "es": LanguageProfile(
        code="es",
        name="Spanish",
        region="Global",
        script="Latin",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
        ],
    ),
    "fr": LanguageProfile(
        code="fr",
        name="French",
        region="Global",
        script="Latin",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
        ],
    ),
    "de": LanguageProfile(
        code="de",
        name="German",
        region="Global",
        script="Latin",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
        ],
    ),
    "zh": LanguageProfile(
        code="zh",
        name="Chinese",
        region="Global",
        script="Han",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "Tonal language — may affect acoustic analysis",
        ],
    ),
    "ja": LanguageProfile(
        code="ja",
        name="Japanese",
        region="Japan",
        script="Kana/Kanji",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
        ],
    ),
    "ar": LanguageProfile(
        code="ar",
        name="Arabic",
        region="Global",
        script="Arabic",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
            "RTL language — may affect text processing",
        ],
    ),
    "pt": LanguageProfile(
        code="pt",
        name="Portuguese",
        region="Global",
        script="Latin",
        evaluated=False,
        known_limitations=[
            "Not evaluated for spoof detection",
        ],
    ),
}


# ── Evaluation Matrix ──
# Tracks which languages have been evaluated for each component

EVALUATION_MATRIX = {
    "AASIST-L": {
        "en": {"status": "evaluated", "eer": "TBD", "notes": "Primary evaluation language"},
        "hi": {"status": "not_evaluated", "notes": "Pending"},
        "bn": {"status": "not_evaluated", "notes": "Pending"},
        "ta": {"status": "not_evaluated", "notes": "Pending"},
        "te": {"status": "not_evaluated", "notes": "Pending"},
    },
    "ECAPA-TDNN": {
        "en": {"status": "evaluated", "notes": "Primary evaluation language"},
        "hi": {"status": "not_evaluated", "notes": "Pending"},
    },
    "DSP": {
        "en": {"status": "evaluated", "notes": "Language-agnostic metrics"},
        "hi": {"status": "evaluated", "notes": "Language-agnostic metrics"},
    },
    "Risk Engine": {
        "en": {"status": "evaluated", "notes": "Weights based on English evaluation"},
        "hi": {"status": "not_evaluated", "notes": "Pending cross-language calibration"},
    },
}


def get_language(code: str) -> Optional[LanguageProfile]:
    """Get language profile by ISO 639-1 code."""
    return SUPPORTED_LANGUAGES.get(code)


def list_languages(evaluated_only: bool = False) -> List[LanguageProfile]:
    """List all supported languages."""
    langs = list(SUPPORTED_LANGUAGES.values())
    if evaluated_only:
        langs = [l for l in langs if l.evaluated]
    return langs


def get_evaluation_status(model_id: str) -> Dict[str, dict]:
    """Get evaluation status for a model across languages."""
    return EVALUATION_MATRIX.get(model_id, {})


def get_language_metadata() -> dict:
    """Get full language metadata for API response."""
    return {
        "total_languages": len(SUPPORTED_LANGUAGES),
        "evaluated_languages": len([l for l in SUPPORTED_LANGUAGES.values() if l.evaluated]),
        "languages": {
            code: {
                "name": lp.name,
                "region": lp.region,
                "evaluated": lp.evaluated,
                "known_limitations": lp.known_limitations,
            }
            for code, lp in SUPPORTED_LANGUAGES.items()
        },
        "evaluation_matrix": EVALUATION_MATRIX,
    }
