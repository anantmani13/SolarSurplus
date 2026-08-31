"""
Evaluation Module for Solar Energy Models.

Generates ROC curves, confusion matrices, regression metrics,
actual vs predicted plots, and residual analysis.
"""

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    mean_absolute_percentage_error,
    roc_curve,
    auc,
    confusion_matrix,
    classification_report,
    precision_recall_curve,
    f1_score,
    accuracy_score,
)


# Set style
plt.style.use("seaborn-v0_8-darkgrid")
COLORS = {
    "primary": "#10B981",
    "secondary": "#059669",
    "accent": "#F59E0B",
    "danger": "#EF4444",
    "bg": "#1a1a2e",
    "text": "#e0e0e0",
}


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Calculate comprehensive regression metrics."""
    metrics = {
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "R2": float(r2_score(y_true, y_pred)),
        "MAPE": float(mean_absolute_percentage_error(y_true, y_pred) * 100),
    }
    print("\n📊 Regression Metrics:")
    for k, v in metrics.items():
        print(f"   {k}: {v:.4f}")
    return metrics


def classification_metrics(
    y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray = None
) -> dict:
    """Calculate classification metrics for surplus/no-surplus."""
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "f1": float(f1_score(y_true, y_pred)),
    }
    report = classification_report(y_true, y_pred, output_dict=True)
    metrics["classification_report"] = report

    if y_proba is not None:
        fpr, tpr, _ = roc_curve(y_true, y_proba)
        metrics["roc_auc"] = float(auc(fpr, tpr))

    print("\n📊 Classification Metrics:")
    print(f"   Accuracy: {metrics['accuracy']:.4f}")
    print(f"   F1 Score: {metrics['f1']:.4f}")
    if "roc_auc" in metrics:
        print(f"   ROC AUC: {metrics['roc_auc']:.4f}")

    return metrics


def plot_actual_vs_predicted(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    title: str = "Actual vs Predicted — Solar Generation",
    save_path: str = None,
):
    """Scatter plot and time series overlay of actual vs predicted."""
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))

    # Scatter plot
    ax = axes[0]
    ax.scatter(y_true, y_pred, alpha=0.3, s=10, color=COLORS["primary"])
    max_val = max(y_true.max(), y_pred.max())
    ax.plot([0, max_val], [0, max_val], "r--", linewidth=2, label="Perfect prediction")
    ax.set_xlabel("Actual")
    ax.set_ylabel("Predicted")
    ax.set_title("Scatter: Actual vs Predicted")
    ax.legend()

    # Time series overlay (first 200 points)
    ax = axes[1]
    n_show = min(200, len(y_true))
    ax.plot(range(n_show), y_true[:n_show], label="Actual", color=COLORS["primary"], linewidth=1.5)
    ax.plot(range(n_show), y_pred[:n_show], label="Predicted", color=COLORS["accent"], linewidth=1.5, alpha=0.8)
    ax.set_xlabel("Time Step")
    ax.set_ylabel("Power Output")
    ax.set_title("Time Series: Actual vs Predicted")
    ax.legend()

    fig.suptitle(title, fontsize=14, fontweight="bold")
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"[EVAL] Actual vs Predicted plot saved to {save_path}")
    plt.close()


def plot_roc_curve(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    title: str = "ROC Curve — Surplus Detection (XGBoost)",
    save_path: str = None,
):
    """Plot ROC curve with AUC score."""
    fpr, tpr, thresholds = roc_curve(y_true, y_proba)
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.plot(fpr, tpr, color=COLORS["primary"], linewidth=2.5, label=f"ROC Curve (AUC = {roc_auc:.4f})")
    ax.plot([0, 1], [0, 1], "k--", linewidth=1, alpha=0.5, label="Random Classifier")

    # Fill area under curve
    ax.fill_between(fpr, tpr, alpha=0.15, color=COLORS["primary"])

    # Mark optimal threshold (Youden's J)
    j_scores = tpr - fpr
    optimal_idx = np.argmax(j_scores)
    ax.scatter(
        fpr[optimal_idx], tpr[optimal_idx],
        s=150, c=COLORS["accent"], zorder=5, edgecolors="white",
        label=f"Optimal Threshold = {thresholds[optimal_idx]:.3f}",
    )

    ax.set_xlabel("False Positive Rate", fontsize=12)
    ax.set_ylabel("True Positive Rate", fontsize=12)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.legend(fontsize=11, loc="lower right")
    ax.grid(True, alpha=0.3)
    ax.set_xlim([-0.01, 1.01])
    ax.set_ylim([-0.01, 1.01])
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"[EVAL] ROC curve saved to {save_path}")
    plt.close()

    return roc_auc


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    labels: list = None,
    title: str = "Confusion Matrix — Surplus Detection",
    save_path: str = None,
):
    """Plot confusion matrix heatmap."""
    if labels is None:
        labels = ["No Surplus", "Surplus"]

    cm = confusion_matrix(y_true, y_pred)

    fig, ax = plt.subplots(figsize=(8, 7))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Greens",
        xticklabels=labels,
        yticklabels=labels,
        ax=ax,
        linewidths=2,
        linecolor="white",
        annot_kws={"size": 18, "weight": "bold"},
    )
    ax.set_xlabel("Predicted", fontsize=13)
    ax.set_ylabel("Actual", fontsize=13)
    ax.set_title(title, fontsize=14, fontweight="bold")
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"[EVAL] Confusion matrix saved to {save_path}")
    plt.close()

    return cm


def plot_residuals(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    title: str = "Residual Analysis",
    save_path: str = None,
):
    """Plot residual distribution and residual vs predicted."""
    residuals = y_true - y_pred

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Residual distribution
    ax = axes[0]
    ax.hist(residuals, bins=50, color=COLORS["primary"], edgecolor="white", alpha=0.8)
    ax.axvline(0, color=COLORS["danger"], linewidth=2, linestyle="--")
    ax.set_xlabel("Residual (Actual - Predicted)")
    ax.set_ylabel("Count")
    ax.set_title("Residual Distribution")

    # Residuals vs Predicted
    ax = axes[1]
    ax.scatter(y_pred, residuals, alpha=0.3, s=10, color=COLORS["secondary"])
    ax.axhline(0, color=COLORS["danger"], linewidth=2, linestyle="--")
    ax.set_xlabel("Predicted Value")
    ax.set_ylabel("Residual")
    ax.set_title("Residuals vs Predicted")

    fig.suptitle(title, fontsize=14, fontweight="bold")
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"[EVAL] Residual plot saved to {save_path}")
    plt.close()


def plot_precision_recall_curve(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    title: str = "Precision-Recall Curve — Surplus Detection",
    save_path: str = None,
):
    """Plot Precision-Recall curve."""
    precision, recall, thresholds = precision_recall_curve(y_true, y_proba)

    fig, ax = plt.subplots(figsize=(8, 7))
    ax.plot(recall, precision, color=COLORS["primary"], linewidth=2.5)
    ax.fill_between(recall, precision, alpha=0.15, color=COLORS["primary"])
    ax.set_xlabel("Recall", fontsize=12)
    ax.set_ylabel("Precision", fontsize=12)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"[EVAL] Precision-Recall curve saved to {save_path}")
    plt.close()


def generate_full_report(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_proba: np.ndarray = None,
    model_name: str = "XGBoost",
    results_dir: str = None,
    is_classification: bool = False,
) -> dict:
    """
    Generate a complete evaluation report with all plots and metrics.

    Args:
        y_true: Ground truth values
        y_pred: Predicted values
        y_proba: Predicted probabilities (for classification)
        model_name: Name for plot titles
        results_dir: Directory to save plots
        is_classification: Whether this is a classification task

    Returns:
        Dict with all computed metrics
    """
    if results_dir is None:
        results_dir = os.path.join(os.path.dirname(__file__), "..", "results")
    os.makedirs(results_dir, exist_ok=True)

    prefix = model_name.lower().replace(" ", "_")
    all_metrics = {}

    if is_classification:
        # Classification evaluation
        all_metrics = classification_metrics(y_true, y_pred, y_proba)

        plot_confusion_matrix(
            y_true, y_pred,
            title=f"Confusion Matrix — {model_name}",
            save_path=os.path.join(results_dir, f"{prefix}_confusion_matrix.png"),
        )

        if y_proba is not None:
            roc_auc = plot_roc_curve(
                y_true, y_proba,
                title=f"ROC Curve — {model_name}",
                save_path=os.path.join(results_dir, f"{prefix}_roc_curve.png"),
            )
            all_metrics["roc_auc"] = roc_auc

            plot_precision_recall_curve(
                y_true, y_proba,
                title=f"Precision-Recall — {model_name}",
                save_path=os.path.join(results_dir, f"{prefix}_precision_recall.png"),
            )
    else:
        # Regression evaluation
        all_metrics = regression_metrics(y_true, y_pred)

        plot_actual_vs_predicted(
            y_true, y_pred,
            title=f"Actual vs Predicted — {model_name}",
            save_path=os.path.join(results_dir, f"{prefix}_actual_vs_predicted.png"),
        )

        plot_residuals(
            y_true, y_pred,
            title=f"Residual Analysis — {model_name}",
            save_path=os.path.join(results_dir, f"{prefix}_residuals.png"),
        )

        # Also do binary surplus classification if regression
        # Convert to binary: surplus if predicted > median(actual)
        median_val = np.median(y_true)
        y_true_binary = (y_true > median_val).astype(int)
        y_pred_binary = (y_pred > median_val).astype(int)
        y_pred_as_proba = (y_pred - y_pred.min()) / (y_pred.max() - y_pred.min() + 1e-10)

        surplus_metrics = classification_metrics(y_true_binary, y_pred_binary, y_pred_as_proba)
        all_metrics["surplus_classification"] = surplus_metrics

        plot_roc_curve(
            y_true_binary, y_pred_as_proba,
            title=f"ROC Curve (Surplus Detection) — {model_name}",
            save_path=os.path.join(results_dir, f"{prefix}_surplus_roc.png"),
        )

        plot_confusion_matrix(
            y_true_binary, y_pred_binary,
            title=f"Confusion Matrix (Surplus) — {model_name}",
            save_path=os.path.join(results_dir, f"{prefix}_surplus_confusion.png"),
        )

    print(f"\n✅ Full evaluation report generated for {model_name} in {results_dir}/")
    return all_metrics
