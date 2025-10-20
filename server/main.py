"""
Chess.com Anti-Cheat Global Database Server
A simple FastAPI server for crowdsourcing cheater detection data
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import json
from pathlib import Path
import hashlib

app = FastAPI(
    title="Chess Anti-Cheat Global Database",
    description="Crowdsourced database of suspicious chess.com players",
    version="2.0.0"
)

# CORS middleware to allow Chrome extension requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple file-based storage (can be replaced with real database)
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

REPORTS_FILE = DATA_DIR / "reports.json"
STATS_FILE = DATA_DIR / "statistics.json"

# Initialize data files if they don't exist
if not REPORTS_FILE.exists():
    REPORTS_FILE.write_text(json.dumps({"reports": [], "reputation": {}}))

if not STATS_FILE.exists():
    STATS_FILE.write_text(json.dumps({"total_reports": 0, "total_users": 0, "last_updated": None}))


# Models
class PlayerReport(BaseModel):
    """Report of a suspicious player"""
    username: str = Field(..., min_length=2, max_length=25)
    risk_score: float = Field(..., ge=0, le=100)
    game_format: str = Field(..., pattern="^(bullet|blitz|rapid)$")
    timestamp: Optional[datetime] = None
    reporter_hash: Optional[str] = None  # Anonymous hash of reporter
    factors: Optional[Dict[str, Any]] = None
    notes: Optional[str] = Field(None, max_length=500)


class PlayerReputation(BaseModel):
    """Aggregated reputation data for a player"""
    username: str
    total_reports: int
    average_risk_score: float
    last_reported: datetime
    report_count_by_format: Dict[str, int]
    confidence_level: str  # low, medium, high, confirmed
    is_banned: bool = False


class GlobalStats(BaseModel):
    """Global statistics"""
    total_reports: int
    total_unique_players: int
    total_confirmed_cheaters: int
    reports_last_24h: int
    reports_last_7d: int
    top_reported_players: List[Dict[str, Any]]


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    version: str
    uptime: str
    total_reports: int
    last_updated: Optional[str]


# Helper functions
def load_reports() -> dict:
    """Load reports from file"""
    try:
        return json.loads(REPORTS_FILE.read_text())
    except Exception as e:
        print(f"Error loading reports: {e}")
        return {"reports": [], "reputation": {}}


def save_reports(data: dict):
    """Save reports to file"""
    try:
        REPORTS_FILE.write_text(json.dumps(data, indent=2, default=str))
    except Exception as e:
        print(f"Error saving reports: {e}")


def calculate_confidence_level(report_count: int, avg_risk: float) -> str:
    """Calculate confidence level based on reports"""
    if report_count >= 10 and avg_risk >= 80:
        return "confirmed"
    elif report_count >= 5 and avg_risk >= 70:
        return "high"
    elif report_count >= 3 and avg_risk >= 60:
        return "medium"
    else:
        return "low"


def hash_reporter_id(reporter_id: str) -> str:
    """Create anonymous hash of reporter ID"""
    return hashlib.sha256(reporter_id.encode()).hexdigest()[:16]


# Startup event
start_time = datetime.now()


@app.on_event("startup")
async def startup_event():
    """Initialize server on startup"""
    print("=" * 50)
    print("🚀 Chess Anti-Cheat Global Database Server")
    print("=" * 50)
    print(f"📁 Data directory: {DATA_DIR}")
    print(f"📊 Reports file: {REPORTS_FILE}")
    print(f"🌐 Server started at: {start_time}")
    print("=" * 50)


# API Endpoints
@app.get("/", tags=["General"])
async def root():
    """Root endpoint"""
    return {
        "message": "Chess Anti-Cheat Global Database API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthCheck, tags=["General"])
async def health_check():
    """Health check endpoint for extension to verify server availability"""
    data = load_reports()
    uptime = datetime.now() - start_time

    return HealthCheck(
        status="healthy",
        version="2.0.0",
        uptime=str(uptime).split('.')[0],  # Remove microseconds
        total_reports=len(data.get("reports", [])),
        last_updated=data.get("reports", [{}])[-1].get("timestamp") if data.get("reports") else None
    )


@app.post("/api/reports/submit", tags=["Reports"])
async def submit_report(report: PlayerReport):
    """Submit a new player report"""
    try:
        data = load_reports()

        # Add timestamp if not provided
        if not report.timestamp:
            report.timestamp = datetime.now()

        # Convert to dict
        report_dict = report.model_dump()
        report_dict['timestamp'] = report.timestamp.isoformat()

        # Add to reports
        data["reports"].append(report_dict)

        # Update reputation
        username = report.username.lower()
        if username not in data["reputation"]:
            data["reputation"][username] = {
                "username": report.username,
                "total_reports": 0,
                "risk_scores": [],
                "formats": {},
                "first_reported": report_dict['timestamp'],
                "last_reported": report_dict['timestamp'],
                "is_banned": False
            }

        rep = data["reputation"][username]
        rep["total_reports"] += 1
        rep["risk_scores"].append(report.risk_score)
        rep["last_reported"] = report_dict['timestamp']

        # Track format
        format_key = report.game_format
        rep["formats"][format_key] = rep["formats"].get(format_key, 0) + 1

        # Calculate average risk score
        rep["average_risk_score"] = sum(rep["risk_scores"]) / len(rep["risk_scores"])
        rep["confidence_level"] = calculate_confidence_level(
            rep["total_reports"],
            rep["average_risk_score"]
        )

        save_reports(data)

        return {
            "success": True,
            "message": "Report submitted successfully",
            "username": report.username,
            "total_reports": rep["total_reports"],
            "confidence_level": rep["confidence_level"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit report: {str(e)}")


@app.get("/api/reports/player/{username}", tags=["Reports"])
async def get_player_reputation(username: str):
    """Get reputation data for a specific player"""
    try:
        data = load_reports()
        username_lower = username.lower()

        if username_lower not in data["reputation"]:
            return {
                "found": False,
                "username": username,
                "message": "No reports found for this player"
            }

        rep = data["reputation"][username_lower]

        return {
            "found": True,
            "username": rep["username"],
            "total_reports": rep["total_reports"],
            "average_risk_score": round(rep["average_risk_score"], 2),
            "confidence_level": rep["confidence_level"],
            "first_reported": rep["first_reported"],
            "last_reported": rep["last_reported"],
            "report_count_by_format": rep["formats"],
            "is_banned": rep.get("is_banned", False)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch player data: {str(e)}")


@app.get("/api/reports/search", tags=["Reports"])
async def search_suspicious_players(
    min_reports: int = Query(3, ge=1),
    min_risk_score: float = Query(60.0, ge=0, le=100),
    confidence: Optional[str] = Query(None, pattern="^(low|medium|high|confirmed)$"),
    limit: int = Query(100, ge=1, le=1000)
):
    """Search for suspicious players matching criteria"""
    try:
        data = load_reports()
        results = []

        for username, rep in data["reputation"].items():
            # Filter by criteria
            if rep["total_reports"] < min_reports:
                continue
            if rep["average_risk_score"] < min_risk_score:
                continue
            if confidence and rep["confidence_level"] != confidence:
                continue

            results.append({
                "username": rep["username"],
                "total_reports": rep["total_reports"],
                "average_risk_score": round(rep["average_risk_score"], 2),
                "confidence_level": rep["confidence_level"],
                "last_reported": rep["last_reported"],
                "is_banned": rep.get("is_banned", False)
            })

        # Sort by total reports (descending)
        results.sort(key=lambda x: x["total_reports"], reverse=True)

        return {
            "total_found": len(results),
            "players": results[:limit]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/api/statistics/global", response_model=GlobalStats, tags=["Statistics"])
async def get_global_statistics():
    """Get global statistics about the database"""
    try:
        data = load_reports()
        reports = data.get("reports", [])
        reputation = data.get("reputation", {})

        now = datetime.now()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)

        # Count recent reports
        reports_24h = 0
        reports_7d = 0

        for report in reports:
            try:
                report_time = datetime.fromisoformat(report.get("timestamp", ""))
                if report_time >= day_ago:
                    reports_24h += 1
                if report_time >= week_ago:
                    reports_7d += 1
            except:
                pass

        # Count confirmed cheaters
        confirmed_count = sum(1 for rep in reputation.values()
                            if rep.get("confidence_level") == "confirmed" or rep.get("is_banned", False))

        # Get top reported players
        top_players = []
        for username, rep in reputation.items():
            top_players.append({
                "username": rep["username"],
                "total_reports": rep["total_reports"],
                "average_risk_score": round(rep["average_risk_score"], 2),
                "confidence_level": rep["confidence_level"]
            })

        top_players.sort(key=lambda x: x["total_reports"], reverse=True)

        return GlobalStats(
            total_reports=len(reports),
            total_unique_players=len(reputation),
            total_confirmed_cheaters=confirmed_count,
            reports_last_24h=reports_24h,
            reports_last_7d=reports_7d,
            top_reported_players=top_players[:10]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@app.post("/api/admin/mark-banned/{username}", tags=["Admin"])
async def mark_player_banned(username: str, banned: bool = True):
    """Mark a player as banned (admin only - add authentication in production)"""
    try:
        data = load_reports()
        username_lower = username.lower()

        if username_lower not in data["reputation"]:
            raise HTTPException(status_code=404, detail="Player not found")

        data["reputation"][username_lower]["is_banned"] = banned
        data["reputation"][username_lower]["confidence_level"] = "confirmed" if banned else data["reputation"][username_lower]["confidence_level"]

        save_reports(data)

        return {
            "success": True,
            "message": f"Player {username} marked as {'banned' if banned else 'not banned'}",
            "username": username,
            "is_banned": banned
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 50)
    print("🚀 Starting Chess Anti-Cheat Server...")
    print("=" * 50)
    print("📍 URL: http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")
    print("💚 Health: http://localhost:8000/health")
    print("=" * 50 + "\n")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
