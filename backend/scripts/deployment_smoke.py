import json
import os
import time
import urllib.error
import urllib.request


API_BASE_URL = os.environ.get("API_BASE_URL", "").rstrip("/")
STUDENT_EMAIL = os.environ.get("SMOKE_STUDENT_EMAIL", f"smoke-{int(time.time())}@sattest.uz")
STUDENT_PASSWORD = os.environ.get("SMOKE_STUDENT_PASSWORD", "SmokeTest12345")
ADMIN_EMAIL = os.environ.get("SMOKE_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("SMOKE_ADMIN_PASSWORD")


def main() -> None:
    if not API_BASE_URL:
        raise SystemExit("API_BASE_URL is required, for example https://xxx.up.railway.app")

    print(f"Testing API: {API_BASE_URL}")
    assert_ok("GET", "/api/health")
    assert_ok("GET", "/api/ready")

    token = register_or_login(STUDENT_EMAIL, STUDENT_PASSWORD)
    tests = request("GET", "/api/tests", token=token)
    if not tests:
        raise SystemExit("No active tests found. Seed or create a test before smoke validation.")
    attempt = request("POST", f"/api/tests/{tests[0]['id']}/attempts", token=token)
    attempt_id = attempt["attempt_id"]

    transitions = []
    while True:
        module = request("GET", f"/api/attempts/{attempt_id}/module", token=token)
        if not module["questions"]:
            raise SystemExit(f"No questions returned for module payload: {module['attempt']}")
        answer_module(attempt_id, module, token)
        advanced = request("POST", f"/api/attempts/{attempt_id}/advance", token=token)
        transitions.append(advanced)
        print(f"Advanced: {advanced}")
        if advanced["status"] == "completed":
            break
        if len(transitions) > 4:
            raise SystemExit(f"Too many module transitions: {transitions}")

    if not any(int(step["current_module"]) == 2 for step in transitions):
        raise SystemExit(f"Adaptive Module 2 route was not reached: {transitions}")
    results = request("GET", f"/api/attempts/{attempt_id}/results", token=token)
    if "score_total" not in results:
        raise SystemExit(f"Results payload missing score_total: {results}")
    print(f"Full SAT flow OK. Score: {results['score_total']}")

    if ADMIN_EMAIL and ADMIN_PASSWORD:
        admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        quality = request("GET", "/api/admin/question-quality", token=admin_token)
        if quality is None:
            raise SystemExit("Admin quality endpoint failed")
        print("Admin dashboard API OK")
        try:
            graph = request("POST", "/api/admin/graphs/sat-set", token=admin_token)
            if not graph.get("graphs"):
                raise SystemExit("Graph generation returned no graphs")
            print("Graph generation OK")
        except urllib.error.HTTPError as exc:
            raise SystemExit(f"Graph generation failed: {exc}") from exc
    else:
        print("Skipping admin and graph checks. Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD to enable them.")

    print("Smoke test passed.")


def answer_module(attempt_id: str, module: dict, token: str) -> None:
    for question in module["questions"]:
        answer = question["choices"][0]["label"] if question["format"] == "multiple_choice" and question["choices"] else "1"
        request(
            "POST",
            f"/api/attempts/{attempt_id}/answers",
            token=token,
            payload={
                "question_id": question["id"],
                "selected_answer": answer,
                "previous_answer": None,
                "answer_changed": False,
                "marked_for_review": False,
                "hesitation_seconds": 2,
                "time_spent_seconds": 20,
                "interaction_count": 1,
            },
        )


def register_or_login(email: str, password: str) -> str:
    try:
        response = request(
            "POST",
            "/api/auth/register",
            payload={"email": email, "password": password, "full_name": "Smoke Test Student"},
        )
        return response["access_token"]
    except urllib.error.HTTPError as exc:
        if exc.code != 409:
            raise
        return login(email, password)


def login(email: str, password: str) -> str:
    response = request("POST", "/api/auth/login", payload={"email": email, "password": password})
    return response["access_token"]


def assert_ok(method: str, path: str) -> None:
    response = request(method, path)
    if response.get("status") not in {"ok", "ready"}:
        raise SystemExit(f"{path} returned unexpected payload: {response}")
    print(f"{path} OK")


def request(method: str, path: str, token: str | None = None, payload: dict | None = None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API_BASE_URL}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


if __name__ == "__main__":
    main()
