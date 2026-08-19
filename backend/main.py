"""Raahi API: Exasol-backed journey packs and idempotent report sync."""
import os
from datetime import datetime
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field

try:
    import pyexasol
except ImportError:
    pyexasol = None

app = FastAPI(title="Raahi API", version="0.1.0")
memory_reports: dict[str, dict] = {}

class Report(BaseModel):
    report_id: str = Field(min_length=8, max_length=64)
    segment_id: str
    hazard_type: Literal["BRIDGE_DAMAGED","TRAIL_BLOCKED","WATER_SOURCE_DRY","SHELTER_UNAVAILABLE"]
    severity: Literal["LOW","MEDIUM","HIGH"] = "HIGH"
    description: str = Field(max_length=2000)
    source_type: Literal["COMMUNITY","GPS_CONFIRMED"] = "GPS_CONFIRMED"
    observed_at: datetime

def connection():
    if not pyexasol or not os.getenv("EXASOL_DSN"):
        return None
    return pyexasol.connect(
        dsn=os.environ["EXASOL_DSN"],
        user=os.getenv("EXASOL_USER","sys"),
        password=os.environ["EXASOL_PASSWORD"],
        compression=True,
    )

@app.get("/health")
def health():
    return {"status":"ok","database":"exasol" if os.getenv("EXASOL_DSN") else "demo"}

@app.get("/journey-packs/{trail_id}")
def journey_pack(trail_id: str):
    db = connection()
    if db:
        evidence = db.export_to_list(
            "SELECT * FROM RAAHI.SEGMENT_EVIDENCE WHERE TRAIL_ID = ? ORDER BY SEGMENT_ID",
            [trail_id],
        )
        rules = db.export_to_list("SELECT * FROM RAAHI.DECISION_RULES WHERE ENABLED = TRUE")
        return {"trail_id":trail_id,"generated_at":datetime.utcnow(),"evidence":evidence,"rules":rules}
    return {"trail_id":trail_id,"mode":"demo","generated_at":datetime.utcnow(),"rules":{
        "pace_ratio":0.75,"daylight_buffer_min":90,"weather_age_hours":6,"battery_percent":20
    },"synced_reports":list(memory_reports.values())}

@app.post("/reports/sync")
def sync(report: Report):
    """REPORT_ID is the idempotency key: retries update nothing and return success."""
    db = connection()
    if db:
        exists = db.execute(
            "SELECT COUNT(*) FROM RAAHI.TRAVELLER_REPORTS WHERE REPORT_ID = ?",
            [report.report_id],
        ).fetchval()
        if not exists:
            db.execute(
                """INSERT INTO RAAHI.TRAVELLER_REPORTS
                (REPORT_ID,SEGMENT_ID,HAZARD_TYPE,SEVERITY,DESCRIPTION,SOURCE_TYPE,OBSERVED_AT)
                VALUES (?,?,?,?,?,?,?)""",
                [report.report_id,report.segment_id,report.hazard_type,report.severity,
                 report.description,report.source_type,report.observed_at],
            )
        return {"report_id":report.report_id,"status":"synced","duplicate":bool(exists)}
    duplicate = report.report_id in memory_reports
    memory_reports.setdefault(report.report_id, report.model_dump(mode="json"))
    return {"report_id":report.report_id,"status":"synced","duplicate":duplicate}
