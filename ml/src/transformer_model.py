"""
Transformer Model for Solar Generation Forecasting (PyTorch).

Encoder-Decoder Transformer with positional encoding for
time series prediction — upgrade path from LSTM.

Status: Phase 2 — experimental improvement over LSTM.
"""

import math
import torch
import torch.nn as nn
import numpy as np


class PositionalEncoding(nn.Module):
    """Sinusoidal positional encoding for sequence position awareness."""

    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # (1, max_len, d_model)
        self.register_buffer("pe", pe)

    def forward(self, x):
        # x: (batch, seq_len, d_model)
        x = x + self.pe[:, : x.size(1), :]
        return self.dropout(x)


class SolarTransformer(nn.Module):
    """
    Encoder-Decoder Transformer for solar time series forecasting.

    Architecture:
        Input Embedding → Positional Encoding →
        Transformer Encoder (N layers) →
        Linear Projection → Output
    """

    def __init__(
        self,
        input_size: int,
        d_model: int = 128,
        nhead: int = 8,
        num_encoder_layers: int = 4,
        dim_feedforward: int = 256,
        dropout: float = 0.1,
        output_size: int = 1,
    ):
        super().__init__()

        self.d_model = d_model

        # Input embedding: project features to d_model dimensions
        self.input_projection = nn.Linear(input_size, d_model)
        self.pos_encoder = PositionalEncoding(d_model, dropout=dropout)

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,
            activation="gelu",
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer, num_layers=num_encoder_layers
        )

        # Output head
        self.output_head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, output_size),
        )

    def forward(self, x):
        """
        Args:
            x: (batch, seq_len, input_size)
        Returns:
            predictions: (batch,)
        """
        # Project input to model dimensions
        x = self.input_projection(x) * math.sqrt(self.d_model)
        x = self.pos_encoder(x)

        # Create causal mask (for autoregressive behavior)
        seq_len = x.size(1)
        causal_mask = nn.Transformer.generate_square_subsequent_mask(seq_len).to(x.device)

        # Encode
        encoded = self.transformer_encoder(x, mask=causal_mask)

        # Take last timestep output
        last_hidden = encoded[:, -1, :]
        output = self.output_head(last_hidden)
        return output.squeeze(-1)


class TransformerTrainer:
    """
    Training manager for the Solar Transformer.
    Mirrors the LSTMTrainer API for easy swapping.
    """

    def __init__(
        self,
        input_size: int,
        d_model: int = 128,
        nhead: int = 8,
        num_layers: int = 4,
        dropout: float = 0.1,
        learning_rate: float = 1e-4,
        seq_length: int = 24,
        batch_size: int = 64,
        device: str = None,
    ):
        if device is None:
            self.device = torch.device(
                "mps" if torch.backends.mps.is_available()
                else "cuda" if torch.cuda.is_available()
                else "cpu"
            )
        else:
            self.device = torch.device(device)

        self.seq_length = seq_length
        self.batch_size = batch_size
        self.input_size = input_size

        self.model = SolarTransformer(
            input_size=input_size,
            d_model=d_model,
            nhead=nhead,
            num_encoder_layers=num_layers,
            dropout=dropout,
        ).to(self.device)

        self.criterion = nn.MSELoss()
        self.optimizer = torch.optim.AdamW(
            self.model.parameters(), lr=learning_rate, weight_decay=1e-4
        )
        self.scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            self.optimizer, T_max=100
        )

        total_params = sum(p.numel() for p in self.model.parameters())
        print(f"[TRANSFORMER] Model parameters: {total_params:,}")
        print(f"[TRANSFORMER] Using device: {self.device}")

    # Training and prediction methods follow the same pattern as LSTMTrainer
    # See lstm_model.py for the full implementation pattern


if __name__ == "__main__":
    print("🔮 Transformer model defined (Phase 2 — experimental)")
    print("   Use SolarTransformer for improved long-range forecasting")
    print("   Swap in TransformerTrainer in place of LSTMTrainer")
