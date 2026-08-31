"""
XGBoost Model for Solar Generation Prediction.

Trains XGBRegressor with hyperparameter tuning,
generates feature importance plots, and supports
binary classification for surplus detection.
"""

import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import RandomizedSearchCV
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score,
)
import matplotlib.pyplot as plt
import joblib


class SolarXGBoost:
    """XGBoost model for solar power generation prediction."""

    def __init__(self, task: str = "regression"):
        """
        Args:
            task: "regression" for power output prediction,
                  "classification" for surplus/no-surplus binary task
        """
        self.task = task
        self.model = None
        self.best_params = None

    def _get_param_distributions(self) -> dict:
        """Hyperparameter search space for RandomizedSearchCV."""
        return {
            "n_estimators": [100, 200, 300, 500, 800],
            "learning_rate": [0.01, 0.05, 0.1, 0.15, 0.2],
            "max_depth": [3, 4, 5, 6, 8, 10],
            "subsample": [0.6, 0.7, 0.8, 0.9, 1.0],
            "colsample_bytree": [0.6, 0.7, 0.8, 0.9, 1.0],
            "min_child_weight": [1, 3, 5, 7],
            "gamma": [0, 0.1, 0.2, 0.3],
            "reg_alpha": [0, 0.01, 0.1, 1.0],
            "reg_lambda": [0.5, 1.0, 1.5, 2.0],
        }

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray = None,
        y_val: np.ndarray = None,
        tune_hyperparams: bool = True,
        n_iter: int = 50,
    ) -> dict:
        """
        Train the XGBoost model.

        Args:
            tune_hyperparams: If True, run RandomizedSearchCV
            n_iter: Number of random hyperparameter combinations to try

        Returns:
            Dict with training metrics
        """
        if self.task == "classification":
            base_model = xgb.XGBClassifier(
                objective="binary:logistic",
                eval_metric="logloss",
                use_label_encoder=False,
                random_state=42,
            )
        else:
            base_model = xgb.XGBRegressor(
                objective="reg:squarederror",
                eval_metric="rmse",
                random_state=42,
            )

        if tune_hyperparams:
            print("[XGB] Running hyperparameter tuning...")
            search = RandomizedSearchCV(
                base_model,
                param_distributions=self._get_param_distributions(),
                n_iter=n_iter,
                cv=3,
                scoring="neg_mean_squared_error" if self.task == "regression" else "roc_auc",
                random_state=42,
                verbose=1,
                n_jobs=-1,
            )
            search.fit(X_train, y_train)
            self.model = search.best_estimator_
            self.best_params = search.best_params_
            print(f"[XGB] Best params: {self.best_params}")
        else:
            base_model.set_params(
                n_estimators=300,
                learning_rate=0.1,
                max_depth=6,
                subsample=0.8,
                colsample_bytree=0.8,
            )
            eval_set = [(X_train, y_train)]
            if X_val is not None:
                eval_set.append((X_val, y_val))

            base_model.fit(
                X_train,
                y_train,
                eval_set=eval_set,
                verbose=50,
            )
            self.model = base_model

        # Training metrics
        y_pred_train = self.model.predict(X_train)
        metrics = {
            "train_rmse": float(np.sqrt(mean_squared_error(y_train, y_pred_train))),
            "train_mae": float(mean_absolute_error(y_train, y_pred_train)),
            "train_r2": float(r2_score(y_train, y_pred_train)),
        }

        if X_val is not None:
            y_pred_val = self.model.predict(X_val)
            metrics["val_rmse"] = float(np.sqrt(mean_squared_error(y_val, y_pred_val)))
            metrics["val_mae"] = float(mean_absolute_error(y_val, y_pred_val))
            metrics["val_r2"] = float(r2_score(y_val, y_pred_val))

        print(f"[XGB] Training metrics: {json.dumps(metrics, indent=2)}")
        return metrics

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Generate predictions."""
        if self.model is None:
            raise RuntimeError("Model not trained yet. Call train() first.")
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Generate probability predictions (classification only)."""
        if self.task != "classification":
            raise ValueError("predict_proba only available for classification task")
        return self.model.predict_proba(X)

    def get_feature_importance(self, feature_names: list = None) -> pd.DataFrame:
        """Get feature importance as a sorted DataFrame."""
        importance = self.model.feature_importances_
        if feature_names is None:
            feature_names = [f"f{i}" for i in range(len(importance))]

        df = pd.DataFrame({
            "feature": feature_names[:len(importance)],
            "importance": importance,
        }).sort_values("importance", ascending=False)

        return df

    def plot_feature_importance(
        self,
        feature_names: list = None,
        top_n: int = 20,
        save_path: str = None,
    ):
        """Plot top N feature importances."""
        df = self.get_feature_importance(feature_names)
        df_top = df.head(top_n)

        fig, ax = plt.subplots(figsize=(10, 8))
        ax.barh(
            range(len(df_top)),
            df_top["importance"].values,
            color="#10B981",
            edgecolor="#059669",
        )
        ax.set_yticks(range(len(df_top)))
        ax.set_yticklabels(df_top["feature"].values)
        ax.invert_yaxis()
        ax.set_xlabel("Feature Importance (Gain)")
        ax.set_title(f"Top {top_n} Feature Importances — XGBoost Solar Model")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches="tight")
            print(f"[XGB] Feature importance plot saved to {save_path}")
        plt.close()

    def save_model(self, save_dir: str):
        """Save the trained model."""
        os.makedirs(save_dir, exist_ok=True)
        model_path = os.path.join(save_dir, "xgboost_solar.json")
        self.model.save_model(model_path)
        print(f"[XGB] Model saved to {model_path}")

        # Save best params
        if self.best_params:
            params_path = os.path.join(save_dir, "xgboost_best_params.json")
            with open(params_path, "w") as f:
                json.dump(self.best_params, f, indent=2)

    def load_model(self, model_path: str):
        """Load a trained model from file."""
        if self.task == "classification":
            self.model = xgb.XGBClassifier()
        else:
            self.model = xgb.XGBRegressor()
        self.model.load_model(model_path)
        print(f"[XGB] Model loaded from {model_path}")


if __name__ == "__main__":
    from data_preparation import prepare_full_pipeline

    # Run full pipeline
    data = prepare_full_pipeline()

    # Train XGBoost regressor
    xgb_model = SolarXGBoost(task="regression")
    metrics = xgb_model.train(
        data["X_train"],
        data["y_train"],
        data["X_val"],
        data["y_val"],
        tune_hyperparams=True,
        n_iter=30,
    )

    # Evaluate on test set
    y_pred = xgb_model.predict(data["X_test"])
    test_rmse = np.sqrt(mean_squared_error(data["y_test"], y_pred))
    test_r2 = r2_score(data["y_test"], y_pred)
    print(f"\n✅ Test RMSE: {test_rmse:.4f}")
    print(f"✅ Test R²: {test_r2:.4f}")

    # Save
    save_dir = os.path.join(os.path.dirname(__file__), "..", "saved_models")
    xgb_model.save_model(save_dir)
    xgb_model.plot_feature_importance(
        save_path=os.path.join(os.path.dirname(__file__), "..", "results", "feature_importance.png")
    )
