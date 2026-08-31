"""
LSTM Model for Solar Generation Time Series Forecasting (PyTorch).

Implements a multi-layer LSTM with dropout, learning rate scheduling,
and early stopping. Supports sliding-window sequence creation.
"""

import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import matplotlib.pyplot as plt


class SolarDataset(Dataset):
    """
    PyTorch Dataset for sliding window time series sequences.
    Creates input-output pairs: X[t-seq_len:t] → y[t]
    """

    def __init__(self, features: np.ndarray, targets: np.ndarray, seq_length: int = 24):
        self.seq_length = seq_length
        self.features = torch.FloatTensor(features)
        self.targets = torch.FloatTensor(targets)

    def __len__(self):
        return len(self.features) - self.seq_length

    def __getitem__(self, idx):
        x = self.features[idx : idx + self.seq_length]
        y = self.targets[idx + self.seq_length]
        return x, y


class SolarLSTM(nn.Module):
    """
    LSTM model for solar power generation forecasting.

    Architecture:
        Input → LSTM (2 layers, hidden=128) → Dropout → Linear → Output
    """

    def __init__(
        self,
        input_size: int,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
        output_size: int = 1,
    ):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_size, 64)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(64, output_size)

    def forward(self, x):
        # x shape: (batch, seq_len, input_size)
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)

        lstm_out, _ = self.lstm(x, (h0, c0))
        # Take only the last time step
        last_output = lstm_out[:, -1, :]
        out = self.dropout(last_output)
        out = self.relu(self.fc1(out))
        out = self.fc2(out)
        return out.squeeze(-1)


class LSTMTrainer:
    """
    Training manager for the LSTM model with early stopping
    and learning rate scheduling.
    """

    def __init__(
        self,
        input_size: int,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
        learning_rate: float = 1e-3,
        seq_length: int = 24,
        batch_size: int = 64,
        device: str = None,
    ):
        if device is None:
            self.device = torch.device("mps" if torch.backends.mps.is_available()
                                       else "cuda" if torch.cuda.is_available()
                                       else "cpu")
        else:
            self.device = torch.device(device)

        print(f"[LSTM] Using device: {self.device}")

        self.seq_length = seq_length
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.input_size = input_size

        self.model = SolarLSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
        ).to(self.device)

        self.criterion = nn.MSELoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=learning_rate)
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode="min", factor=0.5, patience=5
        )

        self.train_losses = []
        self.val_losses = []

    def _create_dataloader(
        self, features: np.ndarray, targets: np.ndarray, shuffle: bool = False
    ) -> DataLoader:
        dataset = SolarDataset(features, targets, self.seq_length)
        return DataLoader(dataset, batch_size=self.batch_size, shuffle=shuffle)

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        epochs: int = 100,
        patience: int = 15,
    ) -> dict:
        """
        Train the LSTM model with early stopping.

        Args:
            epochs: Maximum number of training epochs
            patience: Early stopping patience (epochs without improvement)

        Returns:
            Dict with training history and final metrics
        """
        train_loader = self._create_dataloader(X_train, y_train, shuffle=True)
        val_loader = self._create_dataloader(X_val, y_val, shuffle=False)

        best_val_loss = float("inf")
        best_model_state = None
        patience_counter = 0

        print(f"[LSTM] Training for up to {epochs} epochs (patience={patience})...")
        print(f"[LSTM] Model parameters: {sum(p.numel() for p in self.model.parameters()):,}")

        for epoch in range(epochs):
            # --- Training ---
            self.model.train()
            train_loss = 0.0
            n_batches = 0

            for X_batch, y_batch in train_loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)

                self.optimizer.zero_grad()
                predictions = self.model(X_batch)
                loss = self.criterion(predictions, y_batch)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
                self.optimizer.step()

                train_loss += loss.item()
                n_batches += 1

            avg_train_loss = train_loss / max(n_batches, 1)
            self.train_losses.append(avg_train_loss)

            # --- Validation ---
            self.model.eval()
            val_loss = 0.0
            n_val_batches = 0

            with torch.no_grad():
                for X_batch, y_batch in val_loader:
                    X_batch = X_batch.to(self.device)
                    y_batch = y_batch.to(self.device)
                    predictions = self.model(X_batch)
                    loss = self.criterion(predictions, y_batch)
                    val_loss += loss.item()
                    n_val_batches += 1

            avg_val_loss = val_loss / max(n_val_batches, 1)
            self.val_losses.append(avg_val_loss)

            # Learning rate scheduling
            self.scheduler.step(avg_val_loss)

            # Early stopping
            if avg_val_loss < best_val_loss:
                best_val_loss = avg_val_loss
                best_model_state = {k: v.cpu().clone() for k, v in self.model.state_dict().items()}
                patience_counter = 0
            else:
                patience_counter += 1

            if (epoch + 1) % 10 == 0 or patience_counter == 0:
                lr = self.optimizer.param_groups[0]["lr"]
                print(
                    f"  Epoch {epoch+1}/{epochs} | "
                    f"Train Loss: {avg_train_loss:.6f} | "
                    f"Val Loss: {avg_val_loss:.6f} | "
                    f"LR: {lr:.6f} | "
                    f"{'✓ Best' if patience_counter == 0 else f'Patience: {patience_counter}/{patience}'}"
                )

            if patience_counter >= patience:
                print(f"[LSTM] Early stopping at epoch {epoch + 1}")
                break

        # Restore best model
        if best_model_state:
            self.model.load_state_dict(best_model_state)
            self.model.to(self.device)

        return {
            "best_val_loss": best_val_loss,
            "epochs_trained": epoch + 1,
            "train_losses": self.train_losses,
            "val_losses": self.val_losses,
        }

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Generate predictions for input features."""
        self.model.eval()
        dataset = SolarDataset(X, np.zeros(len(X)), self.seq_length)
        loader = DataLoader(dataset, batch_size=self.batch_size, shuffle=False)

        predictions = []
        with torch.no_grad():
            for X_batch, _ in loader:
                X_batch = X_batch.to(self.device)
                preds = self.model(X_batch)
                predictions.append(preds.cpu().numpy())

        return np.concatenate(predictions)

    def plot_training_history(self, save_path: str = None):
        """Plot training and validation loss curves."""
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.plot(self.train_losses, label="Training Loss", color="#10B981", linewidth=2)
        ax.plot(self.val_losses, label="Validation Loss", color="#F59E0B", linewidth=2)
        ax.set_xlabel("Epoch")
        ax.set_ylabel("MSE Loss")
        ax.set_title("LSTM Training History — Solar Generation Forecasting")
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches="tight")
            print(f"[LSTM] Training history plot saved to {save_path}")
        plt.close()

    def save_model(self, save_dir: str):
        """Save model state dict."""
        os.makedirs(save_dir, exist_ok=True)
        model_path = os.path.join(save_dir, "lstm_solar.pt")
        torch.save({
            "model_state_dict": self.model.state_dict(),
            "input_size": self.input_size,
            "hidden_size": self.model.hidden_size,
            "num_layers": self.model.num_layers,
            "seq_length": self.seq_length,
        }, model_path)
        print(f"[LSTM] Model saved to {model_path}")

    def load_model(self, model_path: str):
        """Load model state dict."""
        checkpoint = torch.load(model_path, map_location=self.device, weights_only=True)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.to(self.device)
        print(f"[LSTM] Model loaded from {model_path}")


if __name__ == "__main__":
    from data_preparation import prepare_full_pipeline

    data = prepare_full_pipeline()

    # Use scaled (non-PCA) data for LSTM — LSTM handles dimensionality internally
    trainer = LSTMTrainer(
        input_size=data["X_train_scaled"].shape[1],
        hidden_size=128,
        num_layers=2,
        dropout=0.2,
        learning_rate=1e-3,
        seq_length=24,
        batch_size=64,
    )

    history = trainer.train(
        data["X_train_scaled"],
        data["y_train"],
        data["X_val_scaled"],
        data["y_val"],
        epochs=100,
        patience=15,
    )

    # Save
    save_dir = os.path.join(os.path.dirname(__file__), "..", "saved_models")
    results_dir = os.path.join(os.path.dirname(__file__), "..", "results")
    os.makedirs(results_dir, exist_ok=True)

    trainer.save_model(save_dir)
    trainer.plot_training_history(os.path.join(results_dir, "lstm_training_history.png"))

    print(f"\n✅ LSTM Training complete!")
    print(f"   Best validation loss: {history['best_val_loss']:.6f}")
    print(f"   Epochs trained: {history['epochs_trained']}")
