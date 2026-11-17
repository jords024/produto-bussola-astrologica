import importlib
import os
import sys
from datetime import datetime, timedelta
import jwt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import routes.auth as auth_mod  # noqa: E402


def test_jwt_token_expires_in_72_hours_by_default(monkeypatch):
    monkeypatch.delenv("JWT_EXPIRE_HOURS", raising=False)
    importlib.reload(auth_mod)
    assert auth_mod.JWT_EXPIRE_HOURS == 72

    before = datetime.utcnow()
    token = auth_mod.create_token("user-123", "client")
    payload = jwt.decode(token, auth_mod.JWT_SECRET, algorithms=[auth_mod.JWT_ALGORITHM])

    exp_dt = datetime.utcfromtimestamp(payload["exp"])
    delta = exp_dt - before
    assert timedelta(hours=71, minutes=59) <= delta <= timedelta(hours=72, minutes=1)
