"""
Data Preparation Module for Solar Generation Forecasting.

Handles dataset loading, cleaning, feature engineering,
PCA dimensionality reduction, and train/val/test splitting.
"""

import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import PCA
import joblib


def load_dataset(data_dir: str = None) -> pd.DataFrame:
    """
    Load the Kaggle SolarGeneration dataset from the raw data directory.
    Attempts to find any CSV file in the raw directory.
    """
    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "raw")

    csv_files = [f for f in os.listdir(data_dir) if f.endswith(".csv")]
    if not csv_files:
        raise FileNotFoundError(
            f"No CSV files found in {data_dir}. "
            "Please download the dataset from Kaggle and place it here."
        )

    df = pd.read_csv(os.path.join(data_dir, csv_files[0]))
    print(f"[DATA] Loaded {csv_files[0]}: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"[DATA] Columns: {list(df.columns)}")
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the dataset:
    - Parse datetime columns
    - Handle missing values via forward fill + interpolation
    - Remove duplicate rows
    - Sort by timestamp
    """
    df = df.copy()

    # Try to detect and parse datetime column
    datetime_cols = []
    for col in df.columns:
        if any(kw in col.lower() for kw in ["date", "time", "timestamp", "dt"]):
            datetime_cols.append(col)

    if datetime_cols:
        dt_col = datetime_cols[0]
        df[dt_col] = pd.to_datetime(df[dt_col], errors="coerce")
        df = df.sort_values(dt_col).reset_index(drop=True)
        df = df.set_index(dt_col)
        print(f"[CLEAN] Set '{dt_col}' as datetime index")

    # Remove duplicates
    before = len(df)
    df = df.drop_duplicates()
    print(f"[CLEAN] Removed {before - len(df)} duplicate rows")

    # Handle missing values
    missing = df.isnull().sum()
    if missing.any():
        print(f"[CLEAN] Missing values:\n{missing[missing > 0]}")
        # Forward fill then backward fill for time series continuity
        df = df.ffill().bfill()
        # Interpolate any remaining NaN (numeric columns)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].interpolate(method="linear")

    print(f"[CLEAN] Final shape: {df.shape}")
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create temporal and lag features for solar forecasting:
    - Hour, day of week, month, season (cyclical sin/cos encoding)
    - Lag features (t-1, t-2, ..., t-24)
    - Rolling statistics (mean, std over windows)
    """
    df = df.copy()

    # Temporal features from index
    if isinstance(df.index, pd.DatetimeIndex):
        df["hour"] = df.index.hour
        df["day_of_week"] = df.index.dayofweek
        df["month"] = df.index.month
        df["day_of_year"] = df.index.dayofyear

        # Cyclical encoding (sin/cos) to capture periodicity
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
        df["doy_sin"] = np.sin(2 * np.pi * df["day_of_year"] / 365)
        df["doy_cos"] = np.cos(2 * np.pi * df["day_of_year"] / 365)

        print("[FEAT] Added temporal features (hour, month, doy — sin/cos encoded)")
    else:
        print("[FEAT] Warning: Index is not DatetimeIndex, skipping temporal features")

    # Detect the target column (power output)
    target_candidates = [
        c for c in df.columns
        if any(kw in c.lower() for kw in ["power", "generation", "output", "yield", "energy", "kwh", "kw"])
    ]
    target_col = target_candidates[0] if target_candidates else df.columns[0]
    print(f"[FEAT] Target column detected: '{target_col}'")

    # Lag features
    for lag in [1, 2, 3, 6, 12, 24]:
        df[f"{target_col}_lag_{lag}"] = df[target_col].shift(lag)

    # Rolling statistics
    for window in [3, 6, 12, 24]:
        df[f"{target_col}_rolling_mean_{window}"] = (
            df[target_col].rolling(window=window, min_periods=1).mean()
        )
        df[f"{target_col}_rolling_std_{window}"] = (
            df[target_col].rolling(window=window, min_periods=1).std()
        )

    print(f"[FEAT] Added lag features (1,2,3,6,12,24) and rolling stats (3,6,12,24)")

    # Drop rows with NaN from lagging
    before = len(df)
    df = df.dropna()
    print(f"[FEAT] Dropped {before - len(df)} rows with NaN from lag creation")

    return df, target_col


def apply_scaling(
    X_train: np.ndarray,
    X_val: np.ndarray,
    X_test: np.ndarray,
    save_dir: str = None,
) -> tuple:
    """
    Apply StandardScaler normalization to feature matrices.
    Fits on training data only (prevents data leakage).
    """
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    if save_dir:
        os.makedirs(save_dir, exist_ok=True)
        joblib.dump(scaler, os.path.join(save_dir, "scaler.pkl"))
        print(f"[SCALE] Saved scaler to {save_dir}/scaler.pkl")

    print(f"[SCALE] Applied StandardScaler: mean={scaler.mean_[:3]}... std={scaler.scale_[:3]}...")
    return X_train_scaled, X_val_scaled, X_test_scaled, scaler


def apply_pca(
    X_train: np.ndarray,
    X_val: np.ndarray,
    X_test: np.ndarray,
    n_components: float = 0.95,
    save_dir: str = None,
) -> tuple:
    """
    Apply PCA for dimensionality reduction.
    n_components=0.95 means retain 95% of variance.
    """
    pca = PCA(n_components=n_components)
    X_train_pca = pca.fit_transform(X_train)
    X_val_pca = pca.transform(X_val)
    X_test_pca = pca.transform(X_test)

    print(f"[PCA] Reduced {X_train.shape[1]} features → {X_train_pca.shape[1]} components")
    print(f"[PCA] Explained variance ratio (cumulative): {pca.explained_variance_ratio_.cumsum()[-1]:.4f}")

    if save_dir:
        os.makedirs(save_dir, exist_ok=True)
        joblib.dump(pca, os.path.join(save_dir, "pca.pkl"))
        print(f"[PCA] Saved PCA to {save_dir}/pca.pkl")

    return X_train_pca, X_val_pca, X_test_pca, pca


def temporal_train_val_test_split(
    df: pd.DataFrame,
    target_col: str,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
) -> tuple:
    """
    Split data preserving temporal order (no shuffling).
    Default: 70% train, 15% validation, 15% test.
    """
    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    feature_cols = [c for c in df.columns if c != target_col]

    X_train = df.iloc[:train_end][feature_cols].values
    y_train = df.iloc[:train_end][target_col].values
    X_val = df.iloc[train_end:val_end][feature_cols].values
    y_val = df.iloc[train_end:val_end][target_col].values
    X_test = df.iloc[val_end:][feature_cols].values
    y_test = df.iloc[val_end:][target_col].values

    print(f"[SPLIT] Train: {X_train.shape[0]}, Val: {X_val.shape[0]}, Test: {X_test.shape[0]}")
    return X_train, y_train, X_val, y_val, X_test, y_test, feature_cols


def prepare_full_pipeline(
    data_dir: str = None,
    n_pca_components: float = 0.95,
    save_dir: str = None,
) -> dict:
    """
    Run the full data preparation pipeline:
    1. Load → 2. Clean → 3. Engineer features →
    4. Split → 5. Scale → 6. PCA

    Returns a dict with all processed data and fitted transformers.
    """
    if save_dir is None:
        save_dir = os.path.join(os.path.dirname(__file__), "..", "saved_models")

    # 1. Load
    df = load_dataset(data_dir)

    # 2. Clean
    df = clean_data(df)

    # 3. Feature engineering
    df, target_col = engineer_features(df)

    # 4. Temporal split
    X_train, y_train, X_val, y_val, X_test, y_test, feature_cols = (
        temporal_train_val_test_split(df, target_col)
    )

    # 5. Scaling
    X_train_s, X_val_s, X_test_s, scaler = apply_scaling(
        X_train, X_val, X_test, save_dir=save_dir
    )

    # 6. PCA
    X_train_pca, X_val_pca, X_test_pca, pca = apply_pca(
        X_train_s, X_val_s, X_test_s,
        n_components=n_pca_components,
        save_dir=save_dir,
    )

    return {
        "X_train": X_train_pca,
        "X_val": X_val_pca,
        "X_test": X_test_pca,
        "y_train": y_train,
        "y_val": y_val,
        "y_test": y_test,
        "feature_cols": feature_cols,
        "target_col": target_col,
        "scaler": scaler,
        "pca": pca,
        "df": df,
        # Also keep non-PCA scaled data for models that handle dimensionality themselves
        "X_train_scaled": X_train_s,
        "X_val_scaled": X_val_s,
        "X_test_scaled": X_test_s,
    }


if __name__ == "__main__":
    result = prepare_full_pipeline()
    print(f"\n✅ Pipeline complete!")
    print(f"   Training samples: {result['X_train'].shape}")
    print(f"   Features after PCA: {result['X_train'].shape[1]}")
    print(f"   Target: {result['target_col']}")
