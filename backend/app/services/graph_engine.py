from pathlib import Path
from uuid import uuid4

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import GraphAsset


def generate_linear_graph(db: Session, slope: float = 2, intercept: float = 1) -> GraphAsset:
    settings = get_settings()
    output_dir = Path(settings.graph_output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    x = np.linspace(-5, 5, 100)
    y = slope * x + intercept
    filename = f"linear-{uuid4()}.png"
    path = output_dir / filename

    plt.figure(figsize=(5, 5))
    plt.axhline(0, color="#94a3b8", linewidth=1)
    plt.axvline(0, color="#94a3b8", linewidth=1)
    plt.grid(True, alpha=0.25)
    plt.plot(x, y, color="#2563eb", linewidth=2.5)
    plt.xlim(-5, 5)
    plt.ylim(-8, 8)
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()

    asset = GraphAsset(graph_type="linear", path=f"/{path}", metadata_json={"slope": slope, "intercept": intercept})
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def generate_piecewise_graph(db: Session) -> GraphAsset:
    x1 = np.linspace(-5, 0, 60)
    x2 = np.linspace(0, 5, 60)
    fig, ax = _base_axes()
    ax.plot(x1, -x1 + 1, color="#1d4ed8", linewidth=2.5)
    ax.plot(x2, 0.5 * x2 + 1, color="#dc2626", linewidth=2.5)
    return _save_graph(db, fig, "piecewise", {"interpretation": "compare rates of change across intervals"})


def generate_transformation_graph(db: Session) -> GraphAsset:
    x = np.linspace(-4, 4, 120)
    fig, ax = _base_axes()
    ax.plot(x, x**2, color="#64748b", linewidth=2, label="f(x)")
    ax.plot(x, (x - 2) ** 2 + 1, color="#1d4ed8", linewidth=2.5, label="g(x)")
    ax.legend()
    return _save_graph(db, fig, "transformation", {"interpretation": "identify horizontal and vertical shifts"})


def generate_intersection_graph(db: Session) -> GraphAsset:
    x = np.linspace(-5, 5, 120)
    fig, ax = _base_axes()
    ax.plot(x, 2 * x + 1, color="#1d4ed8", linewidth=2.5)
    ax.plot(x, -x + 4, color="#dc2626", linewidth=2.5)
    return _save_graph(db, fig, "intersection", {"interpretation": "connect intersection to shared solution"})


def generate_graph_matching(db: Session) -> GraphAsset:
    x = np.linspace(-5, 5, 120)
    fig, ax = _base_axes()
    ax.plot(x, -0.5 * x + 3, color="#1d4ed8", linewidth=2.5)
    return _save_graph(db, fig, "graph_matching", {"interpretation": "match slope and intercept to an equation"})


def generate_multi_graph_comparison(db: Session) -> GraphAsset:
    x = np.linspace(0, 10, 120)
    fig, ax = _base_axes(xlim=(0, 10), ylim=(0, 18))
    ax.plot(x, 1.2 * x + 2, color="#1d4ed8", linewidth=2.5, label="Plan A")
    ax.plot(x, 0.7 * x + 6, color="#dc2626", linewidth=2.5, label="Plan B")
    ax.legend()
    return _save_graph(db, fig, "multi_graph_comparison", {"interpretation": "compare initial value, rate, and break-even point"})


def generate_sat_graph_set(db: Session) -> list[GraphAsset]:
    return [
        generate_piecewise_graph(db),
        generate_transformation_graph(db),
        generate_intersection_graph(db),
        generate_graph_matching(db),
        generate_multi_graph_comparison(db),
    ]


def _base_axes(xlim: tuple[int, int] = (-5, 5), ylim: tuple[int, int] = (-8, 8)):
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.axhline(0, color="#94a3b8", linewidth=1)
    ax.axvline(0, color="#94a3b8", linewidth=1)
    ax.grid(True, alpha=0.25)
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    return fig, ax


def _save_graph(db: Session, fig, graph_type: str, metadata: dict) -> GraphAsset:
    settings = get_settings()
    output_dir = Path(settings.graph_output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{graph_type}-{uuid4()}.png"
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    asset = GraphAsset(graph_type=graph_type, path=f"/{path}", metadata_json=metadata)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset
