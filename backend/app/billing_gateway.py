"""Only the mock adapter may grant a simulated entitlement synchronously.

A live Stripe/Razorpay adapter must create a pending checkout, then grant
entitlements from an idempotent, signature-verified webhook, never a browser redirect.
"""
import os
from dataclasses import dataclass
from typing import Protocol
from fastapi import HTTPException

@dataclass(frozen=True)
class CheckoutReceipt:
    provider: str
    reference: str
    state: str

class BillingGateway(Protocol):
    def simulate(self, user_id: int, amount_paise: int, currency: str, key: str) -> CheckoutReceipt: ...

class MockGateway:
    def simulate(self, user_id, amount_paise, currency, key):
        if os.getenv('MOCK_CHECKOUT_ENABLED') != 'true':
            raise HTTPException(503, 'Checkout is not configured. No payment has been taken.')
        return CheckoutReceipt('mock', f'mock:{user_id}:{key}', 'simulated')

def get_gateway() -> BillingGateway:
    return MockGateway()
