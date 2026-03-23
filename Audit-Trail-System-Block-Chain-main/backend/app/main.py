from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.db import get_database, test_connection
from app.models import (
    InspectionCreate,
    InspectionResponse,
    InspectionData,
    VerifyRequest,
    InspectionEventRequest,
    DashboardStats,
    FileUploadResponse,
    FileRecord,
    FileVerifyRequest,
    FileVerifyResponse,
    TamperSimulationRequest,
    TamperSimulationResponse,
    IntegritySnapshotResponse,
    VerificationLatencyResponse,
    FeedbackRequest,
    FeedbackResponse,
    CertificateCreateRequest,
    CertificateRecord,
    CertificateValidateResponse,
)
from app.hash_utils import generate_hash, verify_hash
from app.file_handler import generate_file_hash, parse_file, verify_file_integrity, calculate_detailed_hash, upload_to_ipfs
from datetime import datetime
from bson import ObjectId
import uuid
import json
from time import perf_counter
from typing import Optional

app = FastAPI(title="Audit Trail API")

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite and CRA default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Audit Trail Backend Running"}


def build_inspection_hash_payload(inspection: dict) -> dict:
    """Build a canonical inspection payload used for integrity hashing."""
    return {
        "projectId": inspection["projectId"],
        "location": inspection["location"],
        "qualityParameters": inspection["qualityParameters"],
        "remarks": inspection["remarks"],
        "images": inspection.get("images", []),
        "inspector": inspection["inspector"],
        "createdAt": inspection["createdAt"],
    }

@app.get("/test-db")
def test_db_route():
    client, db = test_connection()
    if client is not None and db is not None:
        client.close()
        return {
            "status": "success",
            "message": "Database connection successful",
            "database": db.name
        }
    else:
        return {
            "status": "error", 
            "message": "Database connection failed"
        }

@app.post("/api/inspections", response_model=InspectionResponse)
def create_inspection(inspection: InspectionCreate):
    """
    Store inspection report and return hash.
    Frontend will then store this hash on blockchain.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    # Prepare inspection data
    inspection_data = {
        "projectId": inspection.projectId,
        "location": inspection.location,
        "qualityParameters": inspection.qualityParameters,
        "remarks": inspection.remarks,
        "images": inspection.images,
        "inspector": inspection.inspector,
        "createdAt": datetime.utcnow().isoformat(),
        "status": "CREATED",
        "timeline": [
            {
                "type": "CREATED",
                "timestamp": datetime.utcnow().isoformat(),
                "actor": inspection.inspector,
                "details": "Inspection created in backend"
            }
        ]
    }
    
    # Generate SHA-256 hash
    data_hash = generate_hash(inspection_data)
    
    # Store in MongoDB
    result = db.inspections.insert_one(inspection_data)
    report_id = str(result.inserted_id)
    
    return InspectionResponse(
        reportId=report_id,
        dataHash=data_hash,
        message="Inspection stored successfully. Use this hash for blockchain."
    )

@app.get("/api/inspections/{report_id}", response_model=InspectionData)
def get_inspection(report_id: str):
    """
    Retrieve inspection report by ID.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        inspection = db.inspections.find_one({"_id": ObjectId(report_id)})
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        return InspectionData(
            reportId=str(inspection["_id"]),
            projectId=inspection["projectId"],
            location=inspection["location"],
            qualityParameters=inspection["qualityParameters"],
            remarks=inspection["remarks"],
            images=inspection.get("images", []),
            inspector=inspection["inspector"],
            createdAt=inspection["createdAt"],
            status=inspection.get("status", "CREATED"),
            timeline=inspection.get("timeline", [])
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid report ID: {str(e)}")


@app.post("/api/inspections/{report_id}/events")
def add_inspection_event(report_id: str, event: InspectionEventRequest):
    """Append a timeline event to an inspection report."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        inspection = db.inspections.find_one({"_id": ObjectId(report_id)})
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")

        event_record = {
            "type": event.type,
            "timestamp": datetime.utcnow().isoformat(),
            "actor": event.actor,
            "txHash": event.txHash,
            "details": event.details,
            "status": event.status,
        }

        update_fields = {"$push": {"timeline": event_record}}
        if event.status:
            update_fields["$set"] = {"status": event.status}

        db.inspections.update_one({"_id": ObjectId(report_id)}, update_fields)

        return {"status": "success", "event": event_record}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to add event: {str(e)}")


@app.get("/api/inspections/{report_id}/timeline")
def get_inspection_timeline(report_id: str):
    """Return timeline events for an inspection."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        inspection = db.inspections.find_one({"_id": ObjectId(report_id)}, {"timeline": 1})
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")

        return {"reportId": report_id, "timeline": inspection.get("timeline", [])}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to retrieve timeline: {str(e)}")


@app.get("/api/reports/inspections")
def get_inspection_report():
    """Return inspection metrics for dashboards."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        inspections = list(db.inspections.find({}))
        total = len(inspections)
        approved = sum(1 for i in inspections if i.get("status") == "APPROVED")
        rejected = sum(1 for i in inspections if i.get("status") == "REJECTED")
        pending = sum(1 for i in inspections if i.get("status") in ("CREATED", "SUBMITTED"))

        # Monthly counts (based on createdAt)
        monthly_counts = {}
        for i in inspections:
            created = i.get("createdAt")
            if not created:
                continue
            try:
                dt = datetime.fromisoformat(created)
                key = f"{dt.year}-{dt.month:02d}"
                monthly_counts[key] = monthly_counts.get(key, 0) + 1
            except Exception:
                continue

        # Inspector performance
        inspector_stats = {}
        for i in inspections:
            inspector = i.get("inspector", "unknown")
            inspector_stats.setdefault(inspector, {"total": 0, "approved": 0, "pending": 0, "rejected": 0})
            inspector_stats[inspector]["total"] += 1
            status = i.get("status")
            if status == "APPROVED":
                inspector_stats[inspector]["approved"] += 1
            elif status == "REJECTED":
                inspector_stats[inspector]["rejected"] += 1
            elif status in ("CREATED", "SUBMITTED"):
                inspector_stats[inspector]["pending"] += 1

        # File-history-driven stats
        tampering_alerts = 0
        total_files = 0
        verified_files = 0
        authentic_files = 0
        tampered_files = 0
        unverified_files = 0
        total_file_verifications = 0
        file_monthly_uploads = {}
        file_monthly_verifications = {}
        file_uploader_performance = {}

        def build_month_key(ts: str):
            if not ts:
                return None
            try:
                safe = ts.replace("Z", "+00:00")
                dt = datetime.fromisoformat(safe)
                return f"{dt.year}-{dt.month:02d}"
            except Exception:
                return None

        if "files" in db.list_collection_names():
            for f in db.files.find({}):
                verifications = f.get("verifications", []) or []
                total_files += 1
                total_file_verifications += len(verifications)

                uploader = f.get("uploadedBy", "unknown")
                file_uploader_performance.setdefault(
                    uploader,
                    {"totalFiles": 0, "verifiedFiles": 0, "tamperedFiles": 0, "totalVerifications": 0},
                )
                file_uploader_performance[uploader]["totalFiles"] += 1
                file_uploader_performance[uploader]["totalVerifications"] += len(verifications)

                upload_key = build_month_key(f.get("uploadedAt"))
                if upload_key:
                    file_monthly_uploads[upload_key] = file_monthly_uploads.get(upload_key, 0) + 1

                file_tampered_count = 0
                for v in verifications:
                    is_tampered = bool(v.get("tampering_detected")) or (v.get("isAuthentic") is False)
                    if is_tampered:
                        file_tampered_count += 1

                    verification_key = build_month_key(v.get("verifiedAt"))
                    if verification_key:
                        file_monthly_verifications[verification_key] = file_monthly_verifications.get(verification_key, 0) + 1

                tampering_alerts += file_tampered_count

                if len(verifications) == 0:
                    unverified_files += 1
                else:
                    verified_files += 1
                    file_uploader_performance[uploader]["verifiedFiles"] += 1
                    if file_tampered_count > 0:
                        tampered_files += 1
                        file_uploader_performance[uploader]["tamperedFiles"] += 1
                    else:
                        authentic_files += 1

        # Blockchain transaction count (based on timeline entries with txHash)
        blockchain_tx_count = 0
        for i in inspections:
            for evt in i.get("timeline", []):
                if evt.get("txHash"):
                    blockchain_tx_count += 1

        stats = {
            # Existing inspection metrics (kept for backward compatibility)
            "totalInspections": total,
            "approved": approved,
            "pending": pending,
            "rejected": rejected,
            "monthlyCounts": monthly_counts,
            "inspectorPerformance": inspector_stats,

            # Existing mixed metrics (kept)
            "tamperingAlerts": tampering_alerts,
            "totalFiles": total_files,
            "blockchainTxCount": blockchain_tx_count,

            # New file-history-driven analytics
            "fileMetrics": {
                "totalFiles": total_files,
                "verifiedFiles": verified_files,
                "unverifiedFiles": unverified_files,
                "authenticFiles": authentic_files,
                "tamperedFiles": tampered_files,
                "totalVerifications": total_file_verifications,
                "tamperingAlerts": tampering_alerts,
            },
            "fileMonthlyUploads": file_monthly_uploads,
            "fileMonthlyVerifications": file_monthly_verifications,
            "fileUploaderPerformance": file_uploader_performance,
            "verificationStatusBreakdown": {
                "Authentic": authentic_files,
                "Tampered": tampered_files,
                "Unverified": unverified_files,
            },
        }

        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute report: {str(e)}")


@app.post("/api/verify")
def verify_inspection(request: VerifyRequest):
    """
    Recalculate hash of stored inspection data.
    Frontend will compare this with blockchain hash.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        inspection = db.inspections.find_one({"_id": ObjectId(request.reportId)})
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        # Recreate the data structure used for hashing
        inspection_data = {
            "projectId": inspection["projectId"],
            "location": inspection["location"],
            "qualityParameters": inspection["qualityParameters"],
            "remarks": inspection["remarks"],
            "images": inspection.get("images", []),
            "inspector": inspection["inspector"],
            "createdAt": inspection["createdAt"]
        }
        
        # Recalculate hash
        calculated_hash = generate_hash(inspection_data)

        # Record verification attempt in timeline
        db.inspections.update_one(
            {"_id": ObjectId(request.reportId)},
            {
                "$push": {
                    "timeline": {
                        "type": "VERIFIED",
                        "timestamp": datetime.utcnow().isoformat(),
                        "details": "Verification request received",
                        "status": inspection.get("status", "UNKNOWN")
                    }
                }
            }
        )
        
        return {
            "reportId": request.reportId,
            "calculatedHash": calculated_hash,
            "message": "Compare this hash with blockchain hash to verify integrity"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")


@app.get("/api/inspections/{report_id}/integrity", response_model=IntegritySnapshotResponse)
def get_inspection_integrity_snapshot(report_id: str):
    """
    Return a backend integrity snapshot for one inspection.
    This endpoint is additive and does not change existing verification behavior.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        inspection = db.inspections.find_one({"_id": ObjectId(report_id)})
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")

        payload = build_inspection_hash_payload(inspection)
        recalculated_hash = generate_hash(payload)
        data_size_bytes = len(json.dumps(payload, sort_keys=True).encode("utf-8"))

        return IntegritySnapshotResponse(
            reportId=report_id,
            recalculatedHash=recalculated_hash,
            dataSizeBytes=data_size_bytes,
            inspectedAt=datetime.utcnow().isoformat(),
            status=inspection.get("status", "CREATED"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to compute integrity snapshot: {str(e)}")


@app.post("/api/inspections/{report_id}/simulate-tamper", response_model=TamperSimulationResponse)
def simulate_inspection_tamper(report_id: str, request: TamperSimulationRequest):
    """
    Simulate backend data tampering for research/demo purposes.
    Keeps all existing routes intact and only adds a new optional endpoint.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        inspection = db.inspections.find_one({"_id": ObjectId(report_id)})
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")

        previous_hash = generate_hash(build_inspection_hash_payload(inspection))
        tampered_at = datetime.utcnow().isoformat()
        actor = request.actor or "simulation-engine"
        mutation = request.mutation or "append_remarks"

        update_fields = {}
        if mutation == "location_shift":
            update_fields["location"] = f"{inspection.get('location', '')} [SIMULATED-CHANGE]"
        elif mutation == "quality_shift":
            quality = dict(inspection.get("qualityParameters", {}))
            quality["simulatedMutation"] = tampered_at
            update_fields["qualityParameters"] = quality
        else:
            update_fields["remarks"] = f"{inspection.get('remarks', '')} [SIMULATED-TAMPER:{tampered_at}]"
            mutation = "append_remarks"

        update_fields["updatedAt"] = tampered_at

        timeline_event = {
            "type": "TAMPER_SIMULATED",
            "timestamp": tampered_at,
            "actor": actor,
            "details": f"Tampering simulation applied with mutation={mutation}",
            "status": inspection.get("status", "CREATED"),
        }

        db.inspections.update_one(
            {"_id": ObjectId(report_id)},
            {
                "$set": update_fields,
                "$push": {"timeline": timeline_event},
            },
        )

        updated = db.inspections.find_one({"_id": ObjectId(report_id)})
        new_hash = generate_hash(build_inspection_hash_payload(updated))

        return TamperSimulationResponse(
            reportId=report_id,
            actor=actor,
            mutation=mutation,
            previousHash=previous_hash,
            newHash=new_hash,
            isTampered=previous_hash != new_hash,
            tamperedAt=tampered_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Tampering simulation failed: {str(e)}")


@app.get("/api/analytics/verification-latency", response_model=VerificationLatencyResponse)
def get_verification_latency_analytics():
    """
    Generate verification latency samples for multiple payload sizes.
    This is an additive analytics endpoint for dashboard visualization.
    """
    sample_sizes_kb = [1, 5, 10, 25, 50, 100, 250, 500]
    iterations = 5
    samples = []

    for size_kb in sample_sizes_kb:
        payload = {
            "sizeKB": size_kb,
            "content": "x" * (size_kb * 1024),
            "generatedAt": datetime.utcnow().isoformat(),
        }

        elapsed_ms_total = 0.0
        for _ in range(iterations):
            start = perf_counter()
            generate_hash(payload)
            elapsed_ms_total += (perf_counter() - start) * 1000

        samples.append(
            {
                "dataSizeKB": size_kb,
                "latencyMs": round(elapsed_ms_total / iterations, 4),
            }
        )

    return VerificationLatencyResponse(
        algorithm="SHA-256",
        generatedAt=datetime.utcnow().isoformat(),
        samples=samples,
    )


@app.post("/api/feedback", response_model=FeedbackResponse)
def submit_feedback(request: FeedbackRequest):
    """
    Store user feedback for UX improvement tracking.
    New additive endpoint; existing functionality remains untouched.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        rating = int(request.rating)
        if rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

        message = (request.message or "").strip()
        if len(message) < 5:
            raise HTTPException(status_code=400, detail="Feedback message is too short")

        submitted_at = datetime.utcnow().isoformat()
        feedback_id = str(uuid.uuid4())
        record = {
            "feedbackId": feedback_id,
            "name": (request.name or "Anonymous").strip(),
            "email": (request.email or "").strip() or None,
            "rating": rating,
            "category": (request.category or "General").strip(),
            "message": message,
            "page": (request.page or "dashboard").strip(),
            "wallet": request.wallet,
            "submittedAt": submitted_at,
        }

        db.feedback.insert_one(record)
        return FeedbackResponse(
            feedbackId=feedback_id,
            status="success",
            submittedAt=submitted_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")


# ==================== FILE UPLOAD & TAMPERING DETECTION ENDPOINTS ====================

@app.post("/api/files/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...), uploaderAddress: str = None):
    """
    Upload Excel or CSV file, store in backend, and generate SHA-256 hash.
    
    The hash will be stored on blockchain to create immutable proof of the original file.
    Any modification to the file will result in a different hash, allowing tampering detection.
    
    Args:
        file: Excel (.xlsx/.xls) or CSV file
        uploaderAddress: Wallet address of uploader
        
    Returns:
        FileUploadResponse with fileId and hash
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        # Validate file type
        filename_lower = file.filename.lower()
        supported_exts = ['.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.pdf', '.docx', '.doc']
        if not any(filename_lower.endswith(ext) for ext in supported_exts):
            raise HTTPException(status_code=400, detail="Unsupported file type. Supported: Excel, CSV, images, PDF, and DOC.")
        
        # Read file content
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Generate file hash (SHA-256)
        file_hash = generate_file_hash(file_content)
        
        # Parse file for metadata when possible (Excel/CSV)
        metadata = {
            "row_count": 0,
            "column_count": 0,
            "sheet_names": []
        }
        if filename_lower.endswith(('.xlsx', '.xls', '.csv')):
            try:
                metadata, _ = parse_file(file_content, file.filename)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        # Optionally upload to IPFS (requires IPFS_API_URL / credentials)
        ipfs_info = None
        try:
            ipfs_info = upload_to_ipfs(file_content, file.filename)
        except Exception:
            # If IPFS upload fails, continue using local storage
            ipfs_info = None
        
        # Create unique file ID
        file_id = str(uuid.uuid4())
        
        # Store file record in MongoDB
        file_record = {
            "fileId": file_id,
            "fileName": file.filename,
            "fileHash": file_hash,
            "fileSize": len(file_content),
            "fileContent": file_content,  # Store actual file bytes
            "uploadedBy": uploaderAddress or "unknown",
            "uploadedAt": datetime.utcnow().isoformat(),
            "rowCount": metadata["row_count"],
            "columnCount": metadata["column_count"],
            "sheetNames": metadata["sheet_names"],
            "status": "uploaded",
            "verifications": [],  # Track all verification attempts
            "ipfs": ipfs_info or {},
        }
        
        result = db.files.insert_one(file_record)
        
        response_message = "File uploaded successfully. Store this hash on blockchain for tampering detection."
        if ipfs_info and ipfs_info.get("ipfsHash"):
            response_message = "File uploaded successfully and pinned to IPFS. Store the IPFS hash on blockchain for tamper proofing."

        return FileUploadResponse(
            fileId=file_id,
            fileName=file.filename,
            fileHash=file_hash,
            fileSize=len(file_content),
            rowCount=metadata["row_count"],
            columnCount=metadata["column_count"],
            ipfsHash=ipfs_info.get("ipfsHash") if ipfs_info else None,
            ipfsUrl=ipfs_info.get("ipfsUrl") if ipfs_info else None,
            message=response_message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@app.post("/api/files/verify", response_model=FileVerifyResponse)
async def verify_file(request: FileVerifyRequest):
    """
    Verify file integrity by comparing current hash with blockchain hash.
    
    This endpoint detects if a file has been tampered with by:
    1. Retrieving the stored file from database
    2. Regenerating its SHA-256 hash
    3. Comparing with the hash stored on blockchain
    
    Args:
        request: FileVerifyRequest with fileId and blockchainHash
        
    Returns:
        FileVerifyResponse indicating if file is authentic
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        # Find file record
        file_record = db.files.find_one({"fileId": request.fileId})
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Regenerate hash of stored file
        stored_file_content = file_record["fileContent"]
        current_hash = generate_file_hash(stored_file_content)
        
        # Normalize blockchain hash (remove 0x prefix if present)
        blockchain_hash = request.blockchainHash
        if blockchain_hash.startswith('0x'):
            blockchain_hash = blockchain_hash[2:]
        
        # Compare hashes
        is_authentic = current_hash == blockchain_hash
        
        # Record verification attempt
        verification_record = {
            "verifiedAt": datetime.utcnow().isoformat(),
            "blockchainHash": blockchain_hash,
            "storedHash": current_hash,
            "isAuthentic": is_authentic,
            "tampering_detected": not is_authentic
        }
        
        # Update file record with verification attempt
        db.files.update_one(
            {"fileId": request.fileId},
            {"$push": {"verifications": verification_record}}
        )
        
        return FileVerifyResponse(
            fileId=request.fileId,
            fileName=file_record["fileName"],
            isAuthentic=is_authentic,
            storedHash=current_hash,
            currentHash=blockchain_hash,
            message="✅ File is authentic and has not been tampered" if is_authentic else "❌ FILE HAS BEEN TAMPERED WITH! Hashes do not match."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


def _serialize_certificate(document: dict) -> dict:
    """Normalize Mongo certificate document into API-safe payload."""
    return {
        "certificateId": document.get("certificateId"),
        "fileId": document.get("fileId"),
        "fileName": document.get("fileName"),
        "fileHash": document.get("fileHash"),
        "txHash": document.get("txHash"),
        "verifier": document.get("verifier"),
        "wallet": document.get("wallet"),
        "proofUrl": document.get("proofUrl"),
        "issuedAt": document.get("issuedAt"),
        "status": document.get("status", "ACTIVE"),
        "metadata": document.get("metadata", {}),
    }


@app.post("/api/certificates/generate", response_model=CertificateRecord)
def generate_certificate(request: CertificateCreateRequest):
    """
    Generate and persist a verification certificate for an authentic file snapshot.
    Additive endpoint; existing verification behavior remains unchanged.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        file_record = db.files.find_one({"fileId": request.fileId})
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        current_hash = generate_file_hash(file_record["fileContent"])
        if current_hash != request.fileHash:
            raise HTTPException(
                status_code=400,
                detail="Certificate cannot be issued because current file hash does not match provided hash",
            )

        existing = db.certificates.find_one(
            {
                "fileId": request.fileId,
                "fileHash": request.fileHash,
                "txHash": request.txHash or "",
            }
        )
        if existing:
            cert = _serialize_certificate(existing)
            return CertificateRecord(
                certificateId=cert["certificateId"],
                fileId=cert["fileId"],
                fileName=cert["fileName"],
                fileHash=cert["fileHash"],
                txHash=cert["txHash"],
                verifier=cert["verifier"],
                wallet=cert["wallet"],
                proofUrl=cert["proofUrl"],
                issuedAt=cert["issuedAt"],
                status=cert["status"],
            )

        issued_at = datetime.utcnow().isoformat()
        certificate_id = f"CERT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        certificate_record = {
            "certificateId": certificate_id,
            "fileId": request.fileId,
            "fileName": request.fileName or file_record.get("fileName") or "Unknown",
            "fileHash": request.fileHash,
            "txHash": request.txHash or "",
            "verifier": request.verifier,
            "wallet": request.wallet,
            "proofUrl": request.proofUrl or "",
            "issuedAt": issued_at,
            "status": "ACTIVE",
            "metadata": request.metadata or {},
        }

        db.certificates.insert_one(certificate_record)

        return CertificateRecord(
            certificateId=certificate_id,
            fileId=certificate_record["fileId"],
            fileName=certificate_record["fileName"],
            fileHash=certificate_record["fileHash"],
            txHash=certificate_record["txHash"] or None,
            verifier=certificate_record["verifier"],
            wallet=certificate_record["wallet"],
            proofUrl=certificate_record["proofUrl"] or None,
            issuedAt=certificate_record["issuedAt"],
            status=certificate_record["status"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate certificate: {str(e)}")


@app.get("/api/certificates")
def list_certificates(fileId: Optional[str] = None, wallet: Optional[str] = None, limit: int = 50):
    """List issued certificates. Supports optional filtering by fileId and wallet."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        query = {}
        if fileId:
            query["fileId"] = fileId
        if wallet:
            query["wallet"] = wallet

        safe_limit = min(max(int(limit), 1), 200)
        docs = (
            db.certificates
            .find(query, {"_id": 0})
            .sort("issuedAt", -1)
            .limit(safe_limit)
        )
        certificates = list(docs)
        return {
            "status": "success",
            "totalCertificates": len(certificates),
            "certificates": certificates,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load certificates: {str(e)}")


@app.get("/api/certificates/{certificate_id}/validate", response_model=CertificateValidateResponse)
def validate_certificate(certificate_id: str):
    """
    Validate certificate against the current file hash to detect post-issuance tampering.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cert = db.certificates.find_one({"certificateId": certificate_id})
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")

        checked_at = datetime.utcnow().isoformat()
        file_id = cert.get("fileId")
        issued_hash = cert.get("fileHash")
        status = cert.get("status", "ACTIVE")

        file_record = db.files.find_one({"fileId": file_id})
        if not file_record:
            return CertificateValidateResponse(
                certificateId=certificate_id,
                status="INVALID",
                isValid=False,
                checkedAt=checked_at,
                reason="Linked file record is missing",
                fileId=file_id,
                fileHash=issued_hash,
                currentHash=None,
            )

        current_hash = generate_file_hash(file_record["fileContent"])
        valid_hash = current_hash == issued_hash
        is_valid = valid_hash and status == "ACTIVE"

        if status != "ACTIVE":
            reason = "Certificate is not active"
        elif not valid_hash:
            reason = "Hash mismatch detected. Data appears modified after certificate issuance"
        else:
            reason = "Certificate is valid and linked file remains authentic"

        return CertificateValidateResponse(
            certificateId=certificate_id,
            status="VALID" if is_valid else "INVALID",
            isValid=is_valid,
            checkedAt=checked_at,
            reason=reason,
            fileId=file_id,
            fileHash=issued_hash,
            currentHash=current_hash,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate certificate: {str(e)}")


@app.get("/api/files/{file_id}")
def get_file_details(file_id: str):
    """
    Retrieve file metadata and verification history.
    
    Shows:
    - Original file information
    - SHA-256 hash
    - All verification attempts
    - Tampering detection results
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        file_record = db.files.find_one({"fileId": file_id})
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Don't return the actual file content, just metadata
        return {
            "fileId": file_record["fileId"],
            "fileName": file_record["fileName"],
            "fileHash": file_record["fileHash"],
            "fileSize": file_record["fileSize"],
            "uploadedBy": file_record["uploadedBy"],
            "uploadedAt": file_record["uploadedAt"],
            "rowCount": file_record["rowCount"],
            "columnCount": file_record["columnCount"],
            "sheetNames": file_record["sheetNames"],
            "status": file_record["status"],
            "ipfs": file_record.get("ipfs"),
            "verifications": file_record.get("verifications", []),
            "totalVerifications": len(file_record.get("verifications", []))
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to retrieve file: {str(e)}")


@app.get("/api/files")
def list_all_files():
    """
    List all uploaded files with their status and verification results.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        files = list(db.files.find({}, {
            "fileId": 1,
            "fileName": 1,
            "fileHash": 1,
            "fileSize": 1,
            "uploadedBy": 1,
            "uploadedAt": 1,
            "status": 1,
            "ipfs": 1,
            "verifications": 1,
            "_id": 0
        }).sort("uploadedAt", -1))
        
        # Add verification summary
        for file in files:
            verifications = file.get("verifications", [])
            file["totalVerifications"] = len(verifications)
            file["lastVerified"] = verifications[-1]["verifiedAt"] if verifications else None
            file["tamperedCount"] = sum(1 for v in verifications if not v.get("isAuthentic", False))
        
        return {
            "status": "success",
            "totalFiles": len(files),
            "files": files
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")


@app.post("/api/files/{file_id}/re-upload")
async def re_upload_file_for_verification(file_id: str, file: UploadFile = File(...)):
    """
    Re-upload a file to verify if it matches the original (stored on blockchain).
    
    This is the main tampering detection mechanism:
    1. User re-uploads a file
    2. System generates hash of the re-uploaded file
    3. Compares with the original file hash stored in database
    4. If hashes match - File is authentic
    5. If hashes differ - File has been tampered with
    
    Args:
        file_id: ID of the file to verify against
        file: Re-uploaded file for verification
        
    Returns:
        Verification result
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        # Find original file record
        original_file = db.files.find_one({"fileId": file_id})
        
        if not original_file:
            raise HTTPException(status_code=404, detail="Original file not found")
        
        # Read re-uploaded file content
        re_uploaded_content = await file.read()
        
        if not re_uploaded_content:
            raise HTTPException(status_code=400, detail="Re-uploaded file is empty")
        
        # Generate hash of re-uploaded file
        new_file_hash = generate_file_hash(re_uploaded_content)
        original_file_hash = original_file["fileHash"]
        
        # Compare hashes
        is_matching = new_file_hash == original_file_hash
        
        # Record this verification attempt
        verification_record = {
            "verifiedAt": datetime.utcnow().isoformat(),
            "originalHash": original_file_hash,
            "reUploadedHash": new_file_hash,
            "isMatching": is_matching,
            "isAuthentic": is_matching,
            "tampering_detected": not is_matching,
            "reUploadedFileName": file.filename
        }
        
        # Update verification attempts
        db.files.update_one(
            {"fileId": file_id},
            {"$push": {"verifications": verification_record}}
        )
        
        return {
            "fileId": file_id,
            "fileName": original_file["fileName"],
            "isAuthentic": is_matching,
            "originalHash": original_file_hash,
            "currentHash": new_file_hash,
            "reUploadedFileName": file.filename,
            "message": "✅ File is authentic and matches original" if is_matching else "❌ FILE HAS BEEN TAMPERED! Hashes do not match.",
            "verificationCount": len(original_file.get("verifications", [])) + 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")
