"""Device Pairing API tests - NADIBOX IBO Player style flow."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://latency-control-hls.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def registered_device(client):
    r = client.post(f"{BASE_URL}/api/device/register")
    assert r.status_code == 200, r.text
    d = r.json()
    yield d
    try:
        client.delete(f"{BASE_URL}/api/device/unpair/{d['device_id']}")
    except Exception:
        pass


# ── Register ──────────────────────────────────────────
class TestRegister:
    def test_register_returns_required_fields(self, client):
        r = client.post(f"{BASE_URL}/api/device/register")
        assert r.status_code == 200
        d = r.json()
        assert "device_id" in d and len(d["device_id"]) > 0
        assert "mac_address" in d
        assert d["mac_address"].count(":") == 5
        assert "pin" in d and len(d["pin"]) == 6 and d["pin"].isdigit()
        assert "created_at" in d


# ── Status ────────────────────────────────────────────
class TestStatus:
    def test_status_unpaired(self, client, registered_device):
        r = client.get(f"{BASE_URL}/api/device/status/{registered_device['device_id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["paired"] is False
        assert d["device_id"] == registered_device["device_id"]
        assert d["mac_address"] == registered_device["mac_address"]

    def test_status_not_found(self, client):
        r = client.get(f"{BASE_URL}/api/device/status/NOPE_NONEXISTENT_ID")
        assert r.status_code == 404


# ── Pair ──────────────────────────────────────────────
class TestPair:
    def test_pair_success_then_status_paired_then_config(self, client, registered_device):
        payload = {
            "pin": registered_device["pin"],
            "server_url": "http://test.example.com:8080",
            "username": "TEST_user",
            "password": "TEST_pass",
            "profile_name": "TEST_Profile",
        }
        r = client.post(f"{BASE_URL}/api/device/pair", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["success"] is True
        assert d["device_id"] == registered_device["device_id"]

        # status should now be paired
        s = client.get(f"{BASE_URL}/api/device/status/{registered_device['device_id']}")
        assert s.status_code == 200
        assert s.json()["paired"] is True

        # config returns credentials
        c = client.get(f"{BASE_URL}/api/device/config/{registered_device['device_id']}")
        assert c.status_code == 200
        cfg = c.json()
        assert cfg["server_url"] == payload["server_url"]
        assert cfg["username"] == payload["username"]
        assert cfg["password"] == payload["password"]
        assert cfg["profile_name"] == payload["profile_name"]

    def test_pair_invalid_pin_returns_404(self, client):
        r = client.post(f"{BASE_URL}/api/device/pair", json={
            "pin": "000000",
            "server_url": "http://x", "username": "u", "password": "p",
        })
        # 404 for not found OR could be 404 because random PIN doesn't match
        assert r.status_code == 404

    def test_pair_bad_pin_format_returns_400(self, client):
        r = client.post(f"{BASE_URL}/api/device/pair", json={
            "pin": "abc", "server_url": "http://x", "username": "u", "password": "p",
        })
        assert r.status_code == 400

    def test_pair_already_paired_returns_404(self, client, registered_device):
        payload = {
            "pin": registered_device["pin"],
            "server_url": "http://x", "username": "u", "password": "p",
        }
        r1 = client.post(f"{BASE_URL}/api/device/pair", json=payload)
        assert r1.status_code == 200
        # Trying the same PIN again - already paired
        r2 = client.post(f"{BASE_URL}/api/device/pair", json=payload)
        assert r2.status_code == 404


# ── Config not paired ─────────────────────────────────
class TestConfig:
    def test_config_unpaired_returns_404(self, client, registered_device):
        r = client.get(f"{BASE_URL}/api/device/config/{registered_device['device_id']}")
        assert r.status_code == 404

    def test_config_unknown_device_404(self, client):
        r = client.get(f"{BASE_URL}/api/device/config/NOPE_DOES_NOT_EXIST")
        assert r.status_code == 404


# ── Unpair ────────────────────────────────────────────
class TestUnpair:
    def test_unpair_resets_and_gives_new_pin(self, client, registered_device):
        # Pair first
        client.post(f"{BASE_URL}/api/device/pair", json={
            "pin": registered_device["pin"],
            "server_url": "http://x", "username": "u", "password": "p",
        })
        r = client.delete(f"{BASE_URL}/api/device/unpair/{registered_device['device_id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["success"] is True
        assert "new_pin" in d and len(d["new_pin"]) == 6
        assert d["new_pin"] != registered_device["pin"]

        # status should be unpaired
        s = client.get(f"{BASE_URL}/api/device/status/{registered_device['device_id']}")
        assert s.json()["paired"] is False

    def test_unpair_nonexistent_404(self, client):
        r = client.delete(f"{BASE_URL}/api/device/unpair/NOPE_UNKNOWN")
        assert r.status_code == 404
