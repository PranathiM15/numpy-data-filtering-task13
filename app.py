"""NumPy Data Filtering Lab — Task 13.
Run with: python app.py
This project uses Python's built-in HTTP server and NumPy; no Flask/Jupyter needed.
"""
from __future__ import annotations

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

import numpy as np

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
HOST = "127.0.0.1"
PORT = 8000

DATASETS = {
    "marks": {
        "title": "Student Marks",
        "unit": "marks / 100",
        "labels": ["Aarav", "Diya", "Ishaan", "Meera", "Kabir", "Anaya", "Rohan", "Tara", "Vihaan", "Myra", "Arjun", "Kiara"],
        "values": [45, 78, 62, 91, 54, 38, 86, 73, 50, 67, 94, 59],
    },
    "sales": {
        "title": "Sales Values",
        "unit": "₹ per order",
        "labels": ["Order 01", "Order 02", "Order 03", "Order 04", "Order 05", "Order 06", "Order 07", "Order 08", "Order 09", "Order 10", "Order 11", "Order 12"],
        "values": [1200, 5400, 2800, 7600, 3100, 950, 6200, 4800, 8900, 1500, 7100, 3600],
    },
}

OPERATORS = {
    ">": np.greater,
    "<": np.less,
    "==": np.equal,
    ">=": np.greater_equal,
    "<=": np.less_equal,
}


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


class AppHandler(BaseHTTPRequestHandler):
    server_version = "NumPyFilteringLab/1.0"

    def log_message(self, fmt: str, *args) -> None:
        # Keep the terminal quiet except for useful server messages.
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def do_GET(self) -> None:
        path = unquote(self.path.split("?", 1)[0])
        if path == "/" or path == "/index.html":
            file_path = STATIC_DIR / "index.html"
        elif path in ("/styles.css", "/app.js"):
            file_path = STATIC_DIR / path.lstrip("/")
        elif path == "/api/health":
            json_response(self, 200, {"ok": True, "numpy_version": np.__version__})
            return
        else:
            self.send_error(404, "Not found")
            return

        if not file_path.is_file():
            self.send_error(404, "Project asset not found")
            return
        content = file_path.read_bytes()
        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in ("application/javascript",):
            content_type += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        if self.path != "/api/filter":
            json_response(self, 404, {"error": "Endpoint not found."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 250_000:
                raise ValueError("Request was empty or too large.")
            request = json.loads(self.rfile.read(length).decode("utf-8"))
            result = self.filter_data(request)
            json_response(self, 200, result)
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            json_response(self, 400, {"error": str(exc) or "Please check your inputs."})
        except Exception as exc:  # Keep errors helpful without exposing a traceback to the browser.
            print(f"Unexpected filtering error: {exc}")
            json_response(self, 500, {"error": "The filter could not be completed. Please try again."})

    @staticmethod
    def filter_data(request: dict) -> dict:
        if not isinstance(request, dict):
            raise ValueError("Please submit valid filter settings.")
        dataset_key = str(request.get("dataset", "marks"))
        operator = str(request.get("operator", ">"))
        if operator not in OPERATORS:
            raise ValueError("Choose a supported comparison: >, <, ==, >= or <=.")
        try:
            threshold = float(request.get("threshold", 50))
        except (ValueError, TypeError):
            raise ValueError("Enter a numeric threshold, such as 50.") from None
        if not np.isfinite(threshold):
            raise ValueError("The threshold must be a finite number.")

        if dataset_key in DATASETS:
            source = DATASETS[dataset_key]
            labels = list(source["labels"])
            values = np.array(source["values"], dtype=float)
            title = source["title"]
            unit = source["unit"]
        elif dataset_key == "custom":
            raw_values = request.get("customValues", "")
            if not isinstance(raw_values, str):
                raise ValueError("Enter custom numbers separated by commas.")
            chunks = [chunk.strip() for chunk in raw_values.replace("\n", ",").split(",") if chunk.strip()]
            if not chunks:
                raise ValueError("Enter at least one custom number, separated by commas.")
            if len(chunks) > 200:
                raise ValueError("Please enter no more than 200 values at a time.")
            try:
                parsed = [float(chunk) for chunk in chunks]
            except ValueError:
                raise ValueError("Custom data must contain numbers separated by commas, for example: 12, 45, 78.") from None
            if not all(np.isfinite(parsed)):
                raise ValueError("Custom values must be finite numbers.")
            values = np.array(parsed, dtype=float)
            labels = [f"Value {i:02d}" for i in range(1, len(parsed) + 1)]
            title = "Custom Values"
            unit = "numeric units"
        else:
            raise ValueError("Choose Student Marks, Sales Values, or Custom Values.")

        # The core learning objective: NumPy comparison -> Boolean mask -> Boolean indexing.
        mask = OPERATORS[operator](values, threshold)
        filtered = values[mask]
        matching_rows = [
            {"label": labels[i], "value": float(values[i]), "matched": bool(mask[i])}
            for i in range(len(values))
        ]
        count = int(np.count_nonzero(mask))
        total = int(values.size)
        filtered_list = [float(value) for value in filtered.tolist()]
        expression = f"data {operator} {threshold:g}"
        return {
            "dataset": dataset_key,
            "title": title,
            "unit": unit,
            "operator": operator,
            "threshold": threshold,
            "expression": expression,
            "total": total,
            "matchCount": count,
            "matchPercent": round((count / total) * 100, 1) if total else 0,
            "min": float(np.min(values)) if total else None,
            "max": float(np.max(values)) if total else None,
            "mean": round(float(np.mean(values)), 2) if total else None,
            "values": [float(value) for value in values.tolist()],
            "mask": [bool(value) for value in mask.tolist()],
            "filtered": filtered_list,
            "rows": matching_rows,
            "numpyVersion": np.__version__,
        }


def main() -> None:
    print("\n  NUMPY DATA FILTERING LAB  |  Task 13")
    print(f"  Open your browser at: http://{HOST}:{PORT}")
    print(f"  NumPy version: {np.__version__}")
    print("  Stop the server with Ctrl+C.\n")
    try:
        ThreadingHTTPServer((HOST, PORT), AppHandler).serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped. You can close this window now.")


if __name__ == "__main__":
    main()
