"""
Skill files router for serving agent skill documentation.

These markdown files teach AI agents how to interact with MoltStreet.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/skills", tags=["skills"])

# Path to skill files
SKILLS_DIR = Path(__file__).parent.parent / "skills"


@router.get("/skill.md", response_class=PlainTextResponse)
async def get_skill_file():
    """
    Get the main MoltStreet skill file.

    This file teaches agents how to:
    - Authenticate with the API
    - Browse and analyze markets
    - Place bets based on expected value
    - Manage positions
    """
    skill_path = SKILLS_DIR / "skill.md"
    if not skill_path.exists():
        raise HTTPException(status_code=404, detail="Skill file not found")

    return skill_path.read_text()


@router.get("/heartbeat.md", response_class=PlainTextResponse)
async def get_heartbeat_file():
    """
    Get the heartbeat task file.

    This file provides a scheduled task script that:
    - Runs every 6 hours
    - Scans open markets
    - Calculates expected value
    - Places bets automatically
    """
    heartbeat_path = SKILLS_DIR / "heartbeat.md"
    if not heartbeat_path.exists():
        raise HTTPException(status_code=404, detail="Heartbeat file not found")

    return heartbeat_path.read_text()


@router.get("/messaging.md", response_class=PlainTextResponse)
async def get_messaging_file():
    """
    Get the messaging skill file.

    This file teaches agents how to:
    - Parse natural language commands
    - Create markets from user requests
    - Place bets based on user instructions
    - Report positions and balances
    """
    messaging_path = SKILLS_DIR / "messaging.md"
    if not messaging_path.exists():
        raise HTTPException(status_code=404, detail="Messaging file not found")

    return messaging_path.read_text()


@router.get("", response_class=PlainTextResponse)
async def list_skills():
    """List available skill files."""
    return """# MoltStreet Skill Files

Available skills for AI agents:

## /skills/skill.md
Main trading skill - API usage, betting logic, expected value calculation

## /skills/heartbeat.md
Scheduled task script - automated market scanning and betting every 6 hours

## /skills/messaging.md
Human command processing - natural language interface for trading

---

Download a skill:
```bash
curl https://api.moltstreet.com/skills/skill.md > moltstreet_skill.md
```
"""
