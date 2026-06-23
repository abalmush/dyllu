import json
import pytest
from pathlib import Path
from server import create_app


@pytest.fixture
def app(tmp_path):
    products = [
        {"id": "dtac1351", "name": "Disc 125mm DYLLU DTAC1351", "sku": "DTAC1351",
         "price_mdl": 10, "image_url": "a.webp", "source_url": "https://example.com/1/",
         "description": None, "category_path": ["Discuri"], "status": "scraped"},
    ]
    groups = [
        {"group_id": "abc123", "group_name": "Disc DYLLU", "category_path": ["Discuri"],
         "auto_grouped": False, "confidence": "singleton", "approved": False,
         "variants": [{"sku": "DTAC1351", "size": "125mm", "price_mdl": 10,
                       "image_url": "a.webp", "source_url": "https://example.com/1/",
                       "description": None}]},
    ]
    (tmp_path / "products.json").write_text(json.dumps(products))
    (tmp_path / "groups.json").write_text(json.dumps(groups))
    (tmp_path / "progress.json").write_text(json.dumps({"next_url": None, "scraped_urls": []}))
    app = create_app(data_dir=tmp_path)
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def test_get_products(client):
    r = client.get("/api/products")
    assert r.status_code == 200
    assert r.get_json()[0]["sku"] == "DTAC1351"


def test_get_groups(client):
    r = client.get("/api/groups")
    assert r.status_code == 200
    assert r.get_json()[0]["group_id"] == "abc123"


def test_get_progress(client):
    r = client.get("/api/progress")
    assert r.status_code == 200
    assert "scraped_urls" in r.get_json()


def test_approve_group(client, app):
    client.post("/api/groups/abc123/approve")
    groups = json.loads((app.config["DATA_DIR"] / "groups.json").read_text())
    assert groups[0]["approved"] is True


def test_split_group(client, app):
    client.post("/api/groups/abc123/split")
    groups = json.loads((app.config["DATA_DIR"] / "groups.json").read_text())
    assert all(len(g["variants"]) == 1 for g in groups)


def test_rename_group(client, app):
    client.patch("/api/groups/abc123", json={"group_name": "New Name"})
    groups = json.loads((app.config["DATA_DIR"] / "groups.json").read_text())
    assert groups[0]["group_name"] == "New Name"


def test_export(client, app):
    client.post("/api/groups/abc123/approve")
    client.post("/api/export")
    export_file = app.config["DATA_DIR"] / "products_curated.json"
    assert export_file.exists()
    assert len(json.loads(export_file.read_text())) == 1
