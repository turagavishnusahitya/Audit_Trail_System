// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuditTrail {
    
    // Roles
    enum Role { NONE, ADMIN, INSPECTOR, APPROVER, AUDITOR }
    
    // Inspection Status
    enum Status { CREATED, SUBMITTED, APPROVED, REJECTED }
    
    // Inspection Structure
    struct Inspection {
        string reportId;
        bytes32 dataHash;
        address inspector;
        uint256 timestamp;
        Status status;
        address approver;
        bytes32 approvalHash;
    }
    
    // File Record Structure for Tampering Detection
    struct FileRecord {
        string fileId;
        string fileName;
        bytes32 fileHash;
        string ipfsHash;
        address uploadedBy;
        uint256 uploadTime;
        uint256 fileSize;
        uint32 rowCount;
        uint32 columnCount;
        bool isVerified;
    }
    
    // State Variables
    address public admin;
    mapping(address => Role) public roles;
    mapping(string => Inspection) public inspections;
    mapping(string => bool) public inspectionExists;
    
    // File Storage Mappings
    mapping(string => FileRecord) public fileRecords;
    mapping(string => bool) public fileExists;
    mapping(string => bytes32[]) public fileVerificationHistory;  // Track all verification attempts
    
    // Events
    event InspectorRegistered(address indexed inspector);
    event ApproverRegistered(address indexed approver);
    event AuditorRegistered(address indexed auditor);
    event InspectionCreated(string indexed reportId, address indexed inspector, bytes32 dataHash);
    event InspectionSubmitted(string indexed reportId);
    event InspectionApproved(string indexed reportId, address indexed approver);
    event InspectionRejected(string indexed reportId, address indexed approver, string reason);
    
    // File Upload Events
    event FileUploaded(string indexed fileId, string fileName, address indexed uploadedBy, bytes32 fileHash, string ipfsHash);
    event FileVerified(string indexed fileId, bytes32 providedHash, bool isAuthentic);
    event FileTamperingDetected(string indexed fileId, bytes32 originalHash, bytes32 currentHash);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyInspectorOrAdmin() {
        require(
            roles[msg.sender] == Role.INSPECTOR || 
            roles[msg.sender] == Role.ADMIN,
            "Only inspector or admin can perform this action"
        );
        _;
    }
    
    modifier onlyInspector() {
        require(roles[msg.sender] == Role.INSPECTOR, "Only inspector can perform this action");
        _;
    }
    
    modifier onlyApprover() {
        require(roles[msg.sender] == Role.APPROVER, "Only approver can perform this action");
        _;
    }
    
    modifier inspectionNotApproved(string memory reportId) {
        require(inspections[reportId].status != Status.APPROVED, "Inspection is already approved and immutable");
        _;
    }
    
    modifier inspectionMustExist(string memory reportId) {
        require(inspectionExists[reportId], "Inspection does not exist");
        _;
    }
    
    modifier fileMustExist(string memory fileId) {
        require(fileExists[fileId], "File does not exist");
        _;
    }
    
    // Constructor
    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.ADMIN;
    }
    
    // Admin Functions
    function registerInspector(address _inspector) external onlyAdmin {
        require(_inspector != address(0), "Invalid address");
        require(roles[_inspector] == Role.NONE, "Address already has a role");
        roles[_inspector] = Role.INSPECTOR;
        emit InspectorRegistered(_inspector);
    }
    
    function registerApprover(address _approver) external onlyAdmin {
        require(_approver != address(0), "Invalid address");
        require(roles[_approver] == Role.NONE, "Address already has a role");
        roles[_approver] = Role.APPROVER;
        emit ApproverRegistered(_approver);
    }
    
    function registerAuditor(address _auditor) external onlyAdmin {
        require(_auditor != address(0), "Invalid address");
        require(roles[_auditor] == Role.NONE, "Address already has a role");
        roles[_auditor] = Role.AUDITOR;
        emit AuditorRegistered(_auditor);
    }
    
    // Inspector Functions
    function createInspection(string memory reportId, bytes32 dataHash) external onlyInspector {
        require(!inspectionExists[reportId], "Inspection already exists");
        require(dataHash != bytes32(0), "Invalid hash");
        
        inspections[reportId] = Inspection({
            reportId: reportId,
            dataHash: dataHash,
            inspector: msg.sender,
            timestamp: block.timestamp,
            status: Status.CREATED,
            approver: address(0),
            approvalHash: bytes32(0)
        });
        
        inspectionExists[reportId] = true;
        emit InspectionCreated(reportId, msg.sender, dataHash);
    }
    
    function submitInspection(string memory reportId) 
        external 
        onlyInspector 
        inspectionMustExist(reportId) 
        inspectionNotApproved(reportId) 
    {
        require(inspections[reportId].inspector == msg.sender, "Only creator can submit");
        require(inspections[reportId].status == Status.CREATED, "Inspection already submitted");
        
        inspections[reportId].status = Status.SUBMITTED;
        emit InspectionSubmitted(reportId);
    }
    
    // Approver Functions
    function approveInspection(string memory reportId, bytes32 approvalHash) 
        external 
        onlyApprover 
        inspectionMustExist(reportId) 
        inspectionNotApproved(reportId) 
    {
        require(inspections[reportId].status == Status.SUBMITTED, "Inspection must be submitted first");
        require(approvalHash != bytes32(0), "Invalid approval hash");
        
        inspections[reportId].status = Status.APPROVED;
        inspections[reportId].approver = msg.sender;
        inspections[reportId].approvalHash = approvalHash;
        
        emit InspectionApproved(reportId, msg.sender);
    }
    
    function rejectInspection(string memory reportId, string memory reason) 
        external 
        onlyApprover 
        inspectionMustExist(reportId) 
        inspectionNotApproved(reportId) 
    {
        require(inspections[reportId].status == Status.SUBMITTED, "Inspection must be submitted first");
        
        inspections[reportId].status = Status.REJECTED;
        inspections[reportId].approver = msg.sender;
        
        emit InspectionRejected(reportId, msg.sender, reason);
    }
    
    // FILE UPLOAD & TAMPERING DETECTION FUNCTIONS
    
    /**
     * @dev Record file hash on blockchain for tampering detection
     * Called by Inspector or Admin after uploading file to backend
     */
    function recordFileHash(
        string memory fileId,
        string memory fileName,
        bytes32 fileHash,
        string memory ipfsHash,
        uint256 fileSize,
        uint32 rowCount,
        uint32 columnCount
    ) external onlyInspectorOrAdmin {
        require(!fileExists[fileId], "File already recorded");
        require(fileHash != bytes32(0), "Invalid file hash");
        require(bytes(fileId).length > 0, "File ID cannot be empty");
        
        fileRecords[fileId] = FileRecord({
            fileId: fileId,
            fileName: fileName,
            fileHash: fileHash,
            ipfsHash: ipfsHash,
            uploadedBy: msg.sender,
            uploadTime: block.timestamp,
            fileSize: fileSize,
            rowCount: rowCount,
            columnCount: columnCount,
            isVerified: false
        });
        
        fileExists[fileId] = true;
        
        // Record initial hash in verification history
        fileVerificationHistory[fileId].push(fileHash);
        
        emit FileUploaded(fileId, fileName, msg.sender, fileHash, ipfsHash);
    }
    
    /**
     * @dev Verify file integrity by comparing current hash with stored hash
     * Returns true if file is authentic, false if tampered
     */
    function verifyFileIntegrity(string memory fileId, bytes32 currentHash) 
        external 
        fileMustExist(fileId)
        returns (bool isAuthentic)
    {
        bytes32 storedHash = fileRecords[fileId].fileHash;
        isAuthentic = (currentHash == storedHash);
        
        // Record this verification attempt
        fileVerificationHistory[fileId].push(currentHash);
        
        // If tampering detected, emit alert
        if (!isAuthentic) {
            emit FileTamperingDetected(fileId, storedHash, currentHash);
        }
        
        emit FileVerified(fileId, currentHash, isAuthentic);
        
        return isAuthentic;
    }
    
    /**
     * @dev Get file record details
     */
    function getFileRecord(string memory fileId) 
        external 
        view 
        fileMustExist(fileId)
        returns (FileRecord memory)
    {
        return fileRecords[fileId];
    }
    
    /**
     * @dev Get file verification history
     */
    function getFileVerificationHistory(string memory fileId) 
        external 
        view 
        fileMustExist(fileId)
        returns (bytes32[] memory)
    {
        return fileVerificationHistory[fileId];
    }
    
    /**
     * @dev Check if file has been tampered (quick check)
     */
    function hasFileBeenTampered(string memory fileId, bytes32 currentHash) 
        external 
        view 
        fileMustExist(fileId)
        returns (bool)
    {
        return fileRecords[fileId].fileHash != currentHash;
    }
    
    // Public Functions (Inspection)
    function getInspection(string memory reportId) 
        external 
        view 
        inspectionMustExist(reportId) 
        returns (Inspection memory) 
    {
        return inspections[reportId];
    }
    
    function verifyInspection(string memory reportId, bytes32 providedHash) 
        external 
        view 
        inspectionMustExist(reportId) 
        returns (bool) 
    {
        return inspections[reportId].dataHash == providedHash;
    }
    
    function getRole(address user) external view returns (Role) {
        return roles[user];
    }
}


