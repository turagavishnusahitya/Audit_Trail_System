import hashlib
import json
import csv
from typing import Dict, Tuple
from io import BytesIO, TextIOWrapper
import openpyxl
import pandas as pd


def generate_file_hash(file_content: bytes) -> str:
    """
    Generate SHA-256 hash of file content.
    This hash will be stored on blockchain for tampering detection.
    
    Args:
        file_content: Raw bytes of the file
        
    Returns:
        SHA-256 hash as hexadecimal string
    """
    hash_object = hashlib.sha256(file_content)
    return hash_object.hexdigest()


def parse_csv_file(file_content: bytes) -> Tuple[Dict, str]:
    """
    Parse CSV file and extract metadata.
    
    Args:
        file_content: Raw bytes of CSV file
        
    Returns:
        Tuple of (metadata dict, file_hash)
    """
    try:
        # Decode bytes to string
        text_stream = TextIOWrapper(BytesIO(file_content), encoding='utf-8')
        
        # Read CSV
        reader = csv.reader(text_stream)
        rows = list(reader)
        
        # Extract metadata
        row_count = len(rows)
        col_count = max(len(row) for row in rows) if rows else 0
        
        metadata = {
            "sheet_names": ["Sheet1"],  # CSV has single sheet
            "active_sheet": "Sheet1",
            "row_count": row_count,
            "column_count": col_count,
            "cell_data": rows
        }
        
        # Generate hash of file content
        file_hash = generate_file_hash(file_content)
        
        return metadata, file_hash
        
    except Exception as e:
        raise ValueError(f"Failed to parse CSV file: {str(e)}")


def parse_excel_file(file_content: bytes, filename: str = None) -> Tuple[Dict, str]:
    """
    Parse Excel file (.xls or .xlsx) and extract metadata.
    Uses pandas to handle both formats.
    
    Args:
        file_content: Raw bytes of Excel file
        filename: Filename to determine format (optional)
        
    Returns:
        Tuple of (metadata dict, file_hash)
    """
    try:
        # Use pandas to read Excel file - works for both .xls and .xlsx
        file_stream = BytesIO(file_content)
        excel_file = pd.ExcelFile(file_stream)
        
        # Get sheet names
        sheet_names = excel_file.sheet_names
        
        # Read first sheet to get dimensions
        first_sheet = excel_file.parse(sheet_names[0])
        max_row = len(first_sheet)
        max_col = len(first_sheet.columns)
        
        # Get cell data from first sheet
        cell_data = first_sheet.values.tolist()
        
        metadata = {
            "sheet_names": sheet_names,
            "active_sheet": sheet_names[0] if sheet_names else "Sheet1",
            "row_count": max_row,
            "column_count": max_col,
            "cell_data": cell_data
        }
        
        # Generate hash of file content (not just metadata)
        file_hash = generate_file_hash(file_content)
        
        return metadata, file_hash
        
    except Exception as e:
        raise ValueError(f"Failed to parse Excel file: {str(e)}")


def parse_file(file_content: bytes, filename: str) -> Tuple[Dict, str]:
    """
    Parse any supported file type and extract metadata.
    Automatically detects file type from extension.
    
    Args:
        file_content: Raw bytes of file
        filename: Name of file (to determine type)
        
    Returns:
        Tuple of (metadata dict, file_hash)
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.csv'):
        return parse_csv_file(file_content)
    elif filename_lower.endswith(('.xlsx', '.xls')):
        return parse_excel_file(file_content, filename)
    else:
        raise ValueError(f"Unsupported file type: {filename}. Supported types: .xlsx, .xls, .csv")


def verify_file_integrity(original_file_content: bytes, current_file_content: bytes) -> bool:
    """
    Verify if a file has been tampered with by comparing hashes.
    
    Args:
        original_file_content: Original file bytes
        current_file_content: Current file bytes to verify
        
    Returns:
        True if files match, False if tampered
    """
    original_hash = generate_file_hash(original_file_content)
    current_hash = generate_file_hash(current_file_content)
    
    return original_hash == current_hash


def extract_file_data(file_content: bytes, filename: str) -> Dict:
    """
    Extract all data from file for detailed verification.
    
    Args:
        file_content: Raw bytes of file
        filename: Name of file (to determine type)
        
    Returns:
        Dictionary containing all sheet/CSV data
    """
    filename_lower = filename.lower()
    
    try:
        if filename_lower.endswith('.csv'):
            text_stream = TextIOWrapper(BytesIO(file_content), encoding='utf-8')
            reader = csv.reader(text_stream)
            return {"Sheet1": list(reader)}
        
        elif filename_lower.endswith(('.xlsx', '.xls')):
            file_stream = BytesIO(file_content)
            excel_file = pd.ExcelFile(file_stream)
            
            all_data = {}
            for sheet in excel_file.sheet_names:
                df = excel_file.parse(sheet)
                sheet_data = df.values.tolist()
                all_data[sheet] = sheet_data
            
            return all_data
        else:
            raise ValueError(f"Unsupported file type: {filename}")
        
    except Exception as e:
        raise ValueError(f"Failed to extract file data: {str(e)}")


def calculate_detailed_hash(file_content: bytes, filename: str) -> Dict:
    """
    Calculate hash and metadata for file verification audit trail.
    
    Args:
        file_content: Raw bytes of file
        filename: Name of file (to determine type)
        
    Returns:
        Dictionary with hash, metadata, and integrity info
    """
    try:
        metadata, file_hash = parse_file(file_content, filename)
        
        return {
            "file_hash": file_hash,
            "file_size": len(file_content),
            "sheet_count": len(metadata["sheet_names"]),
            "sheet_names": metadata["sheet_names"],
            "row_count": metadata["row_count"],
            "column_count": metadata["column_count"],
            "hash_algorithm": "SHA-256"
        }
        
    except Exception as e:
        raise ValueError(f"Failed to calculate hash: {str(e)}")


def upload_to_ipfs(file_content: bytes, filename: str) -> dict:
    """Upload a file to an IPFS node and return metadata.

    Requires environment variables (optional):
    - IPFS_API_URL (default: https://ipfs.infura.io:5001)
    - IPFS_PROJECT_ID / IPFS_PROJECT_SECRET (for Infura authentication)

    Returns:
        dict: { "ipfsHash": str, "ipfsUrl": str }
    """
    import os
    import requests

    ipfs_api_url = os.getenv("IPFS_API_URL", "https://ipfs.infura.io:5001")
    project_id = os.getenv("IPFS_PROJECT_ID")
    project_secret = os.getenv("IPFS_PROJECT_SECRET")
    endpoint = f"{ipfs_api_url.rstrip('/')}/api/v0/add"

    files = {"file": (filename, file_content)}
    auth = (project_id, project_secret) if project_id and project_secret else None

    response = requests.post(endpoint, files=files, auth=auth)
    response.raise_for_status()

    data = response.json()
    ipfs_hash = data.get("Hash")
    return {
        "ipfsHash": ipfs_hash,
        "ipfsUrl": f"https://ipfs.io/ipfs/{ipfs_hash}" if ipfs_hash else None,
        "raw": data
    }
