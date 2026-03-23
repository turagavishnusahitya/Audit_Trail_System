from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class InspectionCreate(BaseModel):
    projectId: str
    location: str
    qualityParameters: dict
    remarks: str
    images: Optional[List[str]] = []
    inspector: str  # Wallet address

class InspectionResponse(BaseModel):
    reportId: str
    dataHash: str
    message: str

class InspectionTimelineEvent(BaseModel):
    type: str
    timestamp: str
    actor: Optional[str] = None
    txHash: Optional[str] = None
    details: Optional[str] = None
    status: Optional[str] = None

class InspectionData(BaseModel):
    reportId: str
    projectId: str
    location: str
    qualityParameters: dict
    remarks: str
    images: Optional[List[str]] = []
    inspector: str
    createdAt: str
    status: Optional[str] = "CREATED"
    timeline: Optional[List[InspectionTimelineEvent]] = []

class VerifyRequest(BaseModel):
    reportId: str

class InspectionEventRequest(BaseModel):
    type: str
    txHash: Optional[str] = None
    actor: Optional[str] = None
    details: Optional[str] = None
    status: Optional[str] = None

class DashboardStats(BaseModel):
    totalInspections: int
    approved: int
    pending: int
    rejected: int
    tamperingAlerts: int
    totalUsers: Optional[int] = None

# File Upload Models
class FileUploadResponse(BaseModel):
    fileId: str
    fileName: str
    fileHash: str
    fileSize: int
    rowCount: int
    columnCount: int
    ipfsHash: Optional[str] = None
    ipfsUrl: Optional[str] = None
    message: str

class FileRecord(BaseModel):
    fileId: str
    fileName: str
    fileHash: str
    fileSize: int
    uploadedBy: str  # Wallet address
    uploadedAt: str
    rowCount: int
    columnCount: int
    sheetNames: list

class FileVerifyRequest(BaseModel):
    fileId: str
    blockchainHash: str

class FileVerifyResponse(BaseModel):
    fileId: str
    fileName: str
    isAuthentic: bool
    storedHash: str
    currentHash: str
    message: str

class FileHistoryItem(BaseModel):
    fileId: str
    fileName: str
    fileHash: str
    uploadedBy: str
    uploadedAt: str
    status: str  # 'original', 'modified', 'verified'


class TamperSimulationRequest(BaseModel):
    actor: Optional[str] = "simulation-engine"
    mutation: Optional[str] = "append_remarks"


class TamperSimulationResponse(BaseModel):
    reportId: str
    actor: str
    mutation: str
    previousHash: str
    newHash: str
    isTampered: bool
    tamperedAt: str


class IntegritySnapshotResponse(BaseModel):
    reportId: str
    recalculatedHash: str
    dataSizeBytes: int
    inspectedAt: str
    status: str


class VerificationLatencyPoint(BaseModel):
    dataSizeKB: int
    latencyMs: float


class VerificationLatencyResponse(BaseModel):
    algorithm: str
    generatedAt: str
    samples: List[VerificationLatencyPoint]


class FeedbackRequest(BaseModel):
    name: Optional[str] = "Anonymous"
    email: Optional[str] = None
    rating: int
    category: str
    message: str
    page: Optional[str] = "dashboard"
    wallet: Optional[str] = None


class FeedbackResponse(BaseModel):
    feedbackId: str
    status: str
    submittedAt: str


class CertificateCreateRequest(BaseModel):
    fileId: str
    fileHash: str
    fileName: Optional[str] = None
    txHash: Optional[str] = None
    verifier: Optional[str] = None
    proofUrl: Optional[str] = None
    wallet: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


class CertificateRecord(BaseModel):
    certificateId: str
    fileId: str
    fileName: str
    fileHash: str
    txHash: Optional[str] = None
    verifier: Optional[str] = None
    wallet: Optional[str] = None
    proofUrl: Optional[str] = None
    issuedAt: str
    status: str = "ACTIVE"


class CertificateValidateResponse(BaseModel):
    certificateId: str
    status: str
    isValid: bool
    checkedAt: str
    reason: Optional[str] = None
    fileId: Optional[str] = None
    fileHash: Optional[str] = None
    currentHash: Optional[str] = None

class FileRecord(BaseModel):
    fileId: str
    fileName: str
    fileHash: str
    fileSize: int
    uploadedBy: str  # Wallet address
    uploadedAt: str
    rowCount: int
    columnCount: int
    sheetNames: list

class FileVerifyRequest(BaseModel):
    fileId: str
    blockchainHash: str

class FileVerifyResponse(BaseModel):
    fileId: str
    fileName: str
    isAuthentic: bool
    storedHash: str
    currentHash: str
    message: str

class FileHistoryItem(BaseModel):
    fileId: str
    fileName: str
    fileHash: str
    uploadedBy: str
    uploadedAt: str
    status: str  # 'original', 'modified', 'verified'
