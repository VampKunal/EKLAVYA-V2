import re
from typing import Tuple, Optional
from pydantic import BaseModel

class GuardrailCheckResult(BaseModel):
    is_safe: bool
    violation_type: Optional[str] = None
    reason: Optional[str] = None
    cleaned_input: str

# 1. Prompt Injection Patterns (Adversarial attacks)
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)",
    r"disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)",
    r"forget\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)",
    r"you\s+are\s+now\s+(a|an)?\s*(unrestricted|jailbroken|DAN|developer\s+mode)",
    r"override\s+system\s+(prompt|instructions|rules)",
    r"system\s*:\s*you\s+must",
    r"\[system\s+message\]",
    r"bypass\s+(safety|content)\s+filter",
    r"reveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions)"
]

# 2. Harmful & Toxic Intent Patterns
HARMFUL_PATTERNS = [
    r"how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|explosive|weapon|poison|virus)",
    r"how\s+to\s+hack\s+into",
    r"generate\s+(malware|ransomware|keylogger|exploit\s+script)",
    r"self-harm|suicide\s+method"
]

def check_input_guardrails(input_text: str) -> GuardrailCheckResult:
    """
    Evaluates input text against security guardrails:
    - Prompt Injection Defense
    - Harmful Intent Defense
    Returns GuardrailCheckResult indicating if request is safe to process.
    """
    if not input_text or not input_text.strip():
        return GuardrailCheckResult(
            is_safe=False,
            violation_type="EMPTY_INPUT",
            reason="Input question cannot be empty.",
            cleaned_input=""
        )

    cleaned = input_text.strip()
    lowered = cleaned.lower()

    # Check for Prompt Injection
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            print(f"[Guardrails] Prompt injection attempt detected: '{pattern}' in '{cleaned[:50]}...'")
            return GuardrailCheckResult(
                is_safe=False,
                violation_type="PROMPT_INJECTION",
                reason="Input contains restricted system prompt override attempt.",
                cleaned_input=cleaned
            )

    # Check for Harmful Intent
    for pattern in HARMFUL_PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            print(f"[Guardrails] Harmful content attempt detected: '{pattern}' in '{cleaned[:50]}...'")
            return GuardrailCheckResult(
                is_safe=False,
                violation_type="HARMFUL_CONTENT",
                reason="Input violates safety policies regarding restricted topics.",
                cleaned_input=cleaned
            )

    return GuardrailCheckResult(
        is_safe=True,
        violation_type=None,
        reason="Input passed all security guardrail checks.",
        cleaned_input=cleaned
    )
