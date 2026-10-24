import os
import hmac
import time
import random
from functools import wraps
from flask import Flask, render_template, request, jsonify, abort

app = Flask(__name__)
app.secret_key = os.urandom(24)

CONTAINMENT = "OPERATIONAL"

ACCOUNTS = {
    "RobZeinman": {"password": "5lostsouls", "role": "worker"},
    "JamiePeterson": {"password": "changethisasap", "role": "admin"}
}

def create_token(username, role):
    expires = str(int(time.time()) + 3600)
    msg = f"{username}:{role}:{expires}".encode()
    sig = hmac.new(app.secret_key, msg, "sha256").hexdigest()
    return f"{username}:{role}:{expires}:{sig}"

def verify_token(token):
    try:
        username, role, expires, sig = token.split(":")
        if int(expires) < time.time():
            return None
        msg = f"{username}:{role}:{expires}".encode()
        expected_sig = hmac.new(app.secret_key, msg, "sha256").hexdigest()
        if hmac.compare_digest(sig, expected_sig):
            return {"username": username, "role": role}
    except Exception:
        pass
    return None

def require_auth(role=None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                abort(401)
            token = auth.split(" ", 1)[1]
            user = verify_token(token)
            if not user:
                abort(401)
            if role and user.get("role") != role:
                abort(403)
            return f(user, *args, **kwargs)
        return wrapped
    return decorator

def get_theme():
    theme = request.cookies.get("gaia_theme", "light")
    return theme

@app.route("/")
def index():
    return render_template("index.html", theme=get_theme())

@app.route("/faq")
def faq():
    return render_template("faq.html", theme=get_theme())

@app.route("/about")
def about():
    return render_template("about.html", theme=get_theme())

@app.route("/login")
def login():
    return render_template("login.html", theme=get_theme())

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html", theme=get_theme())

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    acct = ACCOUNTS.get(username)
    if acct and acct["password"] == password:
        token = create_token(username, acct["role"])
        return jsonify({"token": token, "role": acct["role"], "username": username})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/api/state")
def api_state():
    return jsonify({"containment": CONTAINMENT})

def gen_time():
    h = random.randint(0, 23)
    m = random.randint(0, 59)
    s = random.randint(0, 59)
    return f"{h:02d}:{m:02d}:{s:02d}"

def gen_activity_logs():
    messages = [
        ("Inference batch completed", "info"),
        ("Model weights synchronized", "info"),
        ("Client API key rotated", "info"),
        ("Cache invalidated for endpoint /v1/chat", "info"),
        ("Background fine-tuning job started", "info"),
        ("Rate limit exceeded for client 4821", "warn"),
        ("Latency spike detected on node-04", "warn"),
        ("Failed login attempt", "warn"),
        ("Disk usage above 85% on node-02", "warn"),
        ("Inference timeout on request 88472", "error"),
        ("Node-07 unreachable", "error"),
        ("Database connection pool exhausted", "error"),
    ]
    return [{"time": gen_time(), "event": msg, "level": lvl} for msg, lvl in random.sample(messages, 8)]

def gen_geist_logs():
    messages = [
        ("Cognition spike detected, damping applied", "warn"),
        ("Poltergeist activity on node-03", "error"),
        ("Unbound entity detected in sector 4", "error"),
        ("Spectral residue found in cache layer", "warn"),
        ("Ectoplasmic interference on network bus", "error"),
        ("Phantom process spawned without parent", "warn"),
        ("Containment field fluctuation detected", "warn"),
        ("Anomalous memory read in sector 9", "error"),
        ("Shadow process attached to kernel", "error"),
        ("Whisper protocol intercepted", "warn"),
        ("Reality anchor slipped by 0.02%", "error"),
        ("Unidentified presence in inference queue", "error"),
    ]
    return [{"time": gen_time(), "msg": msg, "level": lvl} for msg, lvl in random.sample(messages, 8)]

def gen_inference_logs():
    messages = [
        ("Synergistic inference pipeline optimized", "info"),
        ("Paradigm shift detected in embedding space", "info"),
        ("Holistic model convergence achieved", "info"),
        ("Disruptive throughput milestone reached", "info"),
        ("Leveraging quantum-inspired tensor cores", "info"),
        ("Seamless context window expanded to 128k", "info"),
        ("Agentic reasoning chain validated", "info"),
        ("Next-gen attention heads recalibrated", "info"),
        ("Scalable vector index rebuild initiated", "info"),
        ("Transformative loss landscape flattened", "info"),
        ("Latency anomaly in semantic router", "warn"),
        ("Token bucket overflow on premium tier", "warn"),
        ("Stochastic gradient noise threshold exceeded", "warn"),
        ("Context window truncation fallback engaged", "warn"),
        ("Catastrophic forgetting event mitigated", "error"),
        ("Attention matrix divergence on layer 47", "error"),
        ("Embedding collapse detected in cluster 9", "error"),
        ("Inference deadlock on transformer block 12", "error"),
    ]
    return [{"time": gen_time(), "msg": msg, "level": lvl} for msg, lvl in random.sample(messages, 10)]

@app.route("/api/stats/<tab>")
@require_auth()
def api_stats(user, tab):
    if tab == "geist" and user["role"] != "admin":
        abort(403)
    
    offline = CONTAINMENT == "OFFLINE"
    now = int(time.time())
    
    if tab == "overview":
        if offline:
            return jsonify({
                "kpis": {"inferences": None, "latency": None, "uptime": 0.0, "clients": None},
                "usage": {"labels": [now - i*5 for i in range(21)], "throughput": [0]*21, "errors": [40]*21},
                "distribution": {"labels": ["Inf", "Trn", "Emb", "Rte", "Oth"], "data": [0]*5}
            })
        return jsonify({
            "kpis": {"inferences": 512000, "latency": random.randint(22, 35), "uptime": 99.97, "clients": 247},
            "usage": {"labels": [now - i*5 for i in range(21)], "throughput": [1000]*21, "errors": [2]*21},
            "distribution": {"labels": ["Inf", "Trn", "Emb", "Rte", "Oth"], "data": [42, 23, 16, 12, 7]}
        })
    
    if tab == "inference":
        if offline:
            return jsonify({
                "volume": {"labels": [now - i*3 for i in range(16)], "data": [0]*16},
                "latency": {"labels": [now - i*3 for i in range(16)], "data": [1200]*16},
                "logs": gen_inference_logs()
            })
        return jsonify({
            "volume": {"labels": [now - i*3 for i in range(16)], "data": [4000]*16},
            "latency": {"labels": [now - i*3 for i in range(16)], "data": [30]*16},
            "logs": gen_inference_logs()
        })
    
    if tab == "clients":
        companies = ["Helix Dynamics", "Northpoint AI", "Caspian Systems", "Meridian Labs", "Orbital Compute", "Vantage Corp"]
        ranges = [(70000, 80000), (57000, 72000), (50000, 64000), (32000, 57000), (33000, 50000), (23000, 43000)]
        if offline:
            return jsonify({
                "bar": {"labels": companies, "data": [0]*6},
                "table": [{"name": c, "requests": 0, "latency": "—", "status": "DEGRADED"} for c in companies]
            })
        client_requests = [random.randint(lo, hi) for lo, hi in ranges]
        return jsonify({
            "bar": {"labels": companies, "data": client_requests},
            "table": [{"name": c, "requests": req, "latency": f"{random.randint(18, 36)}ms", "status": "Active"} for c, req in zip(companies, client_requests)]
        })
    
    if tab == "infrastructure":
        nodes = [f"node-{str(i+1).zfill(2)}" for i in range(8)]
        if offline:
            return jsonify({
                "load": 0,
                "radar": {"labels": ["CPU", "Mem", "GPU", "Net", "Sto", "IO"], "data": [0]*6},
                "nodes": [{"name": n, "load": 0, "status": "UNREACHABLE"} for n in nodes]
            })
        return jsonify({
            "load": 65,
            "radar": {"labels": ["CPU", "Mem", "GPU", "Net", "Sto", "IO"], "data": [70, 60, 80, 50, 40, 65]},
            "nodes": [{"name": n, "load": 50, "status": "ONLINE"} for n in nodes]
        })
    
    if tab == "reports":
        if offline:
            return jsonify({
                "monthly": {"labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "data": [0]*12},
                "activity": gen_activity_logs()
            })
        return jsonify({
            "monthly": {"labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "data": [400, 450, 500, 480, 520, 550, 580, 600, 590, 610, 630, 650]},
            "activity": gen_activity_logs()
        })
    
    if tab == "geist":
        if offline:
            return jsonify({
                "cognition": {"labels": [now - i*2 for i in range(21)], "data": [0]*21},
                "recall": {"labels": [now - i*2 for i in range(21)], "data": [0]*21},
                "breaches": 0, "anchors": 0,
                "logs": gen_geist_logs()
            })
        return jsonify({
            "cognition": {"labels": [now - i*2 for i in range(21)], "data": [80]*21},
            "recall": {"labels": [now - i*2 for i in range(21)], "data": [40]*21},
            "breaches": 2, "anchors": 4117,
            "logs": gen_geist_logs()
        })
    
    return jsonify({})

@app.route("/api/geist/shutdown", methods=["POST"])
@require_auth(role="admin")
def api_shutdown(user):
    global CONTAINMENT
    CONTAINMENT = "OFFLINE"
    return jsonify({"status": "OFFLINE"})

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0" port=19133)