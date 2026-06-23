import hashlib
import json
import time
from pathlib import Path

from flask import Flask, Response, jsonify, request, render_template

from scrape import write_json_atomic
from group import _score_confidence


def create_app(data_dir: Path | None = None) -> Flask:
    app = Flask(__name__)

    if data_dir is None:
        from config import DATA_DIR
        data_dir = DATA_DIR

    app.config["DATA_DIR"] = data_dir

    def _read(filename: str) -> list | dict:
        path = data_dir / filename
        if not path.exists():
            return {} if filename == "progress.json" else []
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            return {} if filename == "progress.json" else []

    def _write_groups(groups: list) -> None:
        write_json_atomic(groups, data_dir / "groups.json")

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/products")
    def get_products():
        return jsonify(_read("products.json"))

    @app.route("/api/groups")
    def get_groups():
        return jsonify(_read("groups.json"))

    @app.route("/api/progress")
    def get_progress():
        return jsonify(_read("progress.json"))

    @app.route("/api/groups/<group_id>/approve", methods=["POST"])
    def approve_group(group_id: str):
        groups = _read("groups.json")
        for g in groups:
            if g["group_id"] == group_id:
                g["approved"] = True
        _write_groups(groups)
        return jsonify({"ok": True})

    @app.route("/api/groups/<group_id>/split", methods=["POST"])
    def split_group(group_id: str):
        groups = _read("groups.json")
        new_groups = []
        for g in groups:
            if g["group_id"] != group_id:
                new_groups.append(g)
                continue
            for variant in g["variants"]:
                gid = hashlib.md5(f"split:{variant['sku']}".encode()).hexdigest()[:12]
                new_groups.append({
                    "group_id": gid,
                    "group_name": g["group_name"],
                    "category_path": g["category_path"],
                    "auto_grouped": False,
                    "confidence": "singleton",
                    "approved": False,
                    "variants": [variant],
                })
        _write_groups(new_groups)
        return jsonify({"ok": True})

    @app.route("/api/groups/merge", methods=["POST"])
    def merge_groups():
        body = request.get_json() or {}
        source_id = body.get("source_id")
        target_id = body.get("target_id")
        groups = _read("groups.json")
        source = next((g for g in groups if g["group_id"] == source_id), None)
        target = next((g for g in groups if g["group_id"] == target_id), None)
        if not source or not target:
            return jsonify({"error": "group not found"}), 404
        target["variants"] = target["variants"] + source["variants"]
        target["auto_grouped"] = True
        target["approved"] = False
        target["confidence"] = _score_confidence(target["variants"])
        _write_groups([g for g in groups if g["group_id"] != source_id])
        return jsonify({"ok": True})

    @app.route("/api/groups/<group_id>", methods=["PATCH"])
    def update_group(group_id: str):
        body = request.get_json() or {}
        groups = _read("groups.json")
        for g in groups:
            if g["group_id"] == group_id:
                if "group_name" in body:
                    g["group_name"] = body["group_name"]
                if "category_path" in body:
                    g["category_path"] = body["category_path"]
        _write_groups(groups)
        return jsonify({"ok": True})

    @app.route("/api/export", methods=["POST"])
    def export():
        groups = _read("groups.json")
        approved = [g for g in groups if g.get("approved") or g.get("confidence") == "singleton"]
        write_json_atomic(approved, data_dir / "products_curated.json")
        return jsonify({"ok": True, "count": len(approved)})

    @app.route("/events")
    def events():
        def generate():
            last_mtime = 0.0
            watched = [data_dir / f for f in ("products.json", "groups.json", "progress.json")]
            while True:
                mtime = max((f.stat().st_mtime for f in watched if f.exists()), default=0.0)
                if mtime > last_mtime:
                    last_mtime = mtime
                    payload = {
                        "products": _read("products.json"),
                        "groups": _read("groups.json"),
                        "progress": _read("progress.json"),
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                time.sleep(1)

        return Response(
            generate(),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return app
