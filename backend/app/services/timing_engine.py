"""
Timing Engine — Statistical calculations for Time Studies.
Sprint 6: Implements Nievel methodology for TN (Normal Time) and TE (Standard Time).
"""
from typing import Dict, List, Any, Optional
from sqlmodel import Session, select
from ..models import TimeStudy, TimingElement, TimingSession, TimingLap
import math
import uuid


class TimingEngine:
    def __init__(self, session: Session):
        self.session = session

    def calculate_results(self, study_id: uuid.UUID) -> Dict[str, Any]:
        """
        Calculates per-element statistics for a completed time study.
        
        For each element:
          - Filters out abnormal laps
          - Calculates average observed time
          - TN = avg_observed * rating_factor
          - TE = TN * (1 + supplements_pct)
          - Auto-detects outliers (> 2σ from mean)
        """
        study = self.session.get(TimeStudy, study_id)
        if not study:
            return {"error": "Study not found"}

        # Fetch all elements ordered
        elements = self.session.exec(
            select(TimingElement)
            .where(TimingElement.time_study_id == study_id)
            .order_by(TimingElement.order)
        ).all()

        if not elements:
            return {"error": "No elements defined for this study"}

        # Fetch all laps across all sessions
        session_ids = [s.id for s in study.sessions] if study.sessions else []
        if not session_ids:
            return {"error": "No sessions recorded"}

        all_laps = self.session.exec(
            select(TimingLap).where(TimingLap.session_id.in_(session_ids))  # type: ignore
        ).all()

        # Group laps by element
        laps_by_element: Dict[str, List[TimingLap]] = {}
        for lap in all_laps:
            eid = str(lap.element_id)
            if eid not in laps_by_element:
                laps_by_element[eid] = []
            laps_by_element[eid].append(lap)

        # Calculate per-element
        element_results = []
        total_tn = 0.0
        total_te = 0.0

        for elem in elements:
            eid = str(elem.id)
            elem_laps = laps_by_element.get(eid, [])

            # Filter non-abnormal first pass
            normal_laps = [l for l in elem_laps if not l.is_abnormal]

            if not normal_laps:
                element_results.append({
                    "element_id": eid,
                    "element_name": elem.name,
                    "element_type": elem.type,
                    "order": elem.order,
                    "observations": len(elem_laps),
                    "normal_observations": 0,
                    "avg_time_ms": 0,
                    "std_dev_ms": 0,
                    "normal_time_ms": 0,
                    "standard_time_ms": 0,
                    "auto_outliers": 0,
                })
                continue

            # Calculate mean and std dev
            times = [l.split_time_ms for l in normal_laps]
            avg = sum(times) / len(times)
            variance = sum((t - avg) ** 2 for t in times) / len(times) if len(times) > 1 else 0
            std_dev = math.sqrt(variance)

            # Auto-detect outliers (> 2σ from mean)
            auto_outlier_count = 0
            if std_dev > 0 and len(times) > 2:
                filtered_times = []
                for lap in normal_laps:
                    if abs(lap.split_time_ms - avg) > 2 * std_dev:
                        auto_outlier_count += 1
                    else:
                        filtered_times.append(lap.split_time_ms)

                if filtered_times:
                    avg = sum(filtered_times) / len(filtered_times)
                    variance = sum((t - avg) ** 2 for t in filtered_times) / len(filtered_times) if len(filtered_times) > 1 else 0
                    std_dev = math.sqrt(variance)

            # TN = avg * rating_factor
            tn = avg * study.rating_factor
            # TE = TN * (1 + supplements)
            te = tn * (1 + study.supplements_pct)

            if elem.is_cyclic:
                total_tn += tn
                total_te += te

            element_results.append({
                "element_id": eid,
                "element_name": elem.name,
                "element_type": elem.type,
                "order": elem.order,
                "is_cyclic": elem.is_cyclic,
                "observations": len(elem_laps),
                "normal_observations": len(normal_laps) - auto_outlier_count,
                "avg_time_ms": round(avg, 1),
                "std_dev_ms": round(std_dev, 1),
                "normal_time_ms": round(tn, 1),
                "standard_time_ms": round(te, 1),
                "auto_outliers": auto_outlier_count,
            })

        # Total cycle times
        total_te_minutes = total_te / 60000  # ms to minutes

        return {
            "study_id": str(study_id),
            "study_name": study.name,
            "process_standard_id": str(study.process_standard_id) if study.process_standard_id else None,
            "asset_id": str(study.asset_id) if study.asset_id else None,
            "product_reference_id": str(study.product_reference_id) if study.product_reference_id else None,
            "rating_factor": study.rating_factor,
            "supplements_pct": study.supplements_pct,
            "elements": element_results,
            "total_normal_time_ms": round(total_tn, 1),
            "total_standard_time_ms": round(total_te, 1),
            "total_standard_time_minutes": round(total_te_minutes, 4),
            "uph": round(60 / total_te_minutes, 2) if total_te_minutes > 0 else 0,
        }
