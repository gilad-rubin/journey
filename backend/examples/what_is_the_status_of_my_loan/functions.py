"""
ACME Financial specific workflow tools with type hints.
"""
from typing import Any, Dict

from journey import ToolRegistry
from loguru import logger


def check_user_active_loans(user_id: str) -> Dict[str, Any]:
    """Check if a user has active loans and return loan details."""
    logger.debug(f"check_user_active_loans called with user_id: {user_id}")
    
    # Mock data for different users
    mock_loan_data = {
        "12345": {
            "has_active_loans": True,
            "active_loans": [
                {
                    "loan_id": "LOAN-001",
                    "loan_type": "Personal Loan",
                    "amount": 15000.00,
                    "balance": 8500.00,
                    "status": "Active",
                    "monthly_payment": 450.00,
                    "next_payment_date": "2025-01-15"
                },
                {
                    "loan_id": "LOAN-002", 
                    "loan_type": "Auto Loan",
                    "amount": 25000.00,
                    "balance": 18200.00,
                    "status": "Active",
                    "monthly_payment": 380.00,
                    "next_payment_date": "2025-01-20"
                }
            ],
            "total_balance": 26700.00
        },
        "67890": {
            "has_active_loans": True,
            "active_loans": [
                {
                    "loan_id": "LOAN-003",
                    "loan_type": "Mortgage",
                    "amount": 350000.00,
                    "balance": 298000.00,
                    "status": "Active",
                    "monthly_payment": 1650.00,
                    "next_payment_date": "2025-01-01"
                }
            ],
            "total_balance": 298000.00
        },
        "11111": {
            "has_active_loans": False,
            "active_loans": [],
            "total_balance": 0.00
        }
    }
    
    # Return mock data for known users, or default to no loans for unknown users
    result = mock_loan_data.get(user_id, {
        "has_active_loans": False,
        "active_loans": [],
        "total_balance": 0.00
    })
    
    logger.debug(f"check_user_active_loans returning: {result}")
    return result


def has_active_loans(user_id: str) -> bool:
    """Simple boolean check if user has any active loans."""
    logger.debug(f"has_active_loans called with user_id: {user_id}")
    
    loan_data = check_user_active_loans(user_id)
    result = loan_data.get("has_active_loans", False)
    
    logger.debug(f"has_active_loans returning: {result}")
    return result


def get_loan_count(user_id: str) -> int:
    """Get the number of active loans for a user."""
    logger.debug(f"get_loan_count called with user_id: {user_id}")
    
    loan_data = check_user_active_loans(user_id)
    result = len(loan_data.get("active_loans", []))
    
    logger.debug(f"get_loan_count returning: {result}")
    return result


def get_total_loan_balance(user_id: str) -> float:
    """Get the total outstanding balance across all active loans for a user."""
    logger.debug(f"get_total_loan_balance called with user_id: {user_id}")
    
    loan_data = check_user_active_loans(user_id)
    result = loan_data.get("total_balance", 0.00)
    
    logger.debug(f"get_total_loan_balance returning: {result}")
    return result


def register_acme_tools(registry: ToolRegistry) -> None:
    """Register all ACME Financial workflow tools with the registry."""
    registry.register(
        'check_user_active_loans',
        check_user_active_loans,
        description="Check if a user has active loans and return detailed loan information",
        category="financial",
        examples=["check_user_active_loans('12345')"]
    )
    registry.register(
        'has_active_loans',
        has_active_loans,
        description="Simple boolean check if user has any active loans",
        category="financial",
        examples=["has_active_loans('12345')", "has_active_loans('11111')"]
    )
    registry.register(
        'get_loan_count',
        get_loan_count,
        description="Get the number of active loans for a user",
        category="financial",
        examples=["get_loan_count('12345')", "get_loan_count('67890')"]
    )
    registry.register(
        'get_total_loan_balance',
        get_total_loan_balance,
        description="Get the total outstanding balance across all active loans",
        category="financial",
        examples=["get_total_loan_balance('12345')", "get_total_loan_balance('67890')"]
    ) 