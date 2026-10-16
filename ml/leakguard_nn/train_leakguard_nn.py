#!/usr/bin/env python3
"""
LeakGuard — Tim's OWN PyTorch neural network classifier.

Binary classification: predict Cancelled/Returned (1) vs Completed (0)
on the synthetic DATATHON transaction data.

Setup matches the 16-Oct-2026 4-model comparison EXACTLY
(ml/MODEL_COMPARISON.md on remote main):
  - 17,082 rows (Pending excluded)
  - 31 features = 8 numeric + one-hot(channel 3 / payment 5 / region 5 / segment 4 / category 6)
  - train_test_split(test_size=0.2, random_state=42, stratify=y) -> 13,665 train / 3,417 test
  - positive rate 18.26%

Model: MLP 31 -> 128 -> 64 -> 32 -> 1, BatchNorm + ReLU + Dropout,
Adam, class-weighted BCE (pos_weight), validation split, ReduceLROnPlateau,
early stopping. Metrics reported honestly on the held-out test set.
"""
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

SEED = 42
DATA = "/home/hatch/workspace/user/files"
OUT = os.path.join(os.path.expanduser("~"), "workspace", "money-leak", "ml", "leakguard_nn")
os.makedirs(OUT, exist_ok=True)

rng = np.random.RandomState(SEED)
torch.manual_seed(SEED)

NUM_COLS = ["quantity", "unit_price", "discount_pct", "unit_cost",
            "list_price", "supplier_lead_days", "revenue", "margin"]
CAT_COLS = ["channel", "payment_method", "region", "customer_segment", "category"]


def load_features():
    t = pd.read_csv(f"{DATA}/transactions.csv")
    c = pd.read_csv(f"{DATA}/customers.csv")
    p = pd.read_csv(f"{DATA}/products.csv")
    df = t[t.status != "Pending"].merge(
        p[["product_id", "category", "unit_cost", "list_price", "supplier_lead_days"]],
        on="product_id", how="left").merge(
        c[["customer_id", "region", "customer_segment"]],
        on="customer_id", how="left")
    df["revenue"] = df.quantity * df.unit_price * (1 - df.discount_pct)
    df["margin"] = df.revenue - df.quantity * df.unit_cost
    y = df.status.isin(["Cancelled", "Returned"]).astype(int).values
    X = pd.concat([df[NUM_COLS],
                   pd.get_dummies(df[CAT_COLS], dtype=float)], axis=1)
    assert X.shape[1] == 31, f"expected 31 features, got {X.shape[1]}"
    assert len(df) == 17082, f"expected 17082 rows, got {len(df)}"
    return X.values.astype(np.float32), y.astype(np.float32), list(X.columns)


class LeakGuardNet(nn.Module):
    def __init__(self, in_dim=31, dropout=0.3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 128), nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(128, 64),    nn.BatchNorm1d(64),  nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(64, 32),     nn.BatchNorm1d(32),  nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(32, 1),
        )

    def forward(self, x):
        return self.net(x).squeeze(1)


def main():
    X, y, feat_names = load_features()

    # EXACT comparison split
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)
    assert X_train_full.shape == (13665, 31) and X_test.shape == (3417, 31)

    # scale numerics (fit on train only)
    scaler = StandardScaler()
    X_train_full[:, :8] = scaler.fit_transform(X_train_full[:, :8])
    X_test[:, :8] = scaler.transform(X_test[:, :8])

    # validation carve-out from train (stratified, own seed)
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_train_full, y_train_full, test_size=0.15, random_state=7, stratify=y_train_full)

    to_t = lambda a: torch.from_numpy(a)
    train_ds = torch.utils.data.TensorDataset(to_t(X_tr), to_t(y_tr))
    loader = torch.utils.data.DataLoader(train_ds, batch_size=256, shuffle=True,
                                         generator=torch.Generator().manual_seed(SEED))
    X_val_t, y_val_t = to_t(X_val), to_t(y_val)
    X_test_t = to_t(X_test)

    model = LeakGuardNet()
    pos_weight = torch.tensor([(y_tr == 0).sum() / (y_tr == 1).sum()])
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.ReduceLROnPlateau(
        opt, mode="min", factor=0.5, patience=7)

    best_val, patience, best_state = float("inf"), 0, None
    hist = {"train_loss": [], "val_loss": []}
    MAX_EPOCHS, EARLY_STOP = 200, 20
    epochs_run = 0

    for epoch in range(MAX_EPOCHS):
        model.train()
        tl = 0.0
        for xb, yb in loader:
            opt.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            opt.step()
            tl += loss.item() * len(xb)
        tl /= len(train_ds)
        model.eval()
        with torch.no_grad():
            vl = criterion(model(X_val_t), y_val_t).item()
        hist["train_loss"].append(tl)
        hist["val_loss"].append(vl)
        sched.step(vl)
        epochs_run = epoch + 1
        if vl < best_val - 1e-6:
            best_val, patience = vl, 0
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            patience += 1
            if patience >= EARLY_STOP:
                break

    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        probs = torch.sigmoid(model(X_test_t)).numpy()
    pred = (probs >= 0.5).astype(int)
    metrics = {
        "test_accuracy": round(float(accuracy_score(y_test, pred)), 4),
        "test_precision": round(float(precision_score(y_test, pred, zero_division=0)), 4),
        "test_recall": round(float(recall_score(y_test, pred, zero_division=0)), 4),
        "test_auc": round(float(roc_auc_score(y_test, probs)), 4),
        "n_train": int(len(X_tr)), "n_val": int(len(X_val)), "n_test": int(len(X_test)),
        "positive_rate": round(float(y.mean()), 4),
        "epochs_trained": epochs_run,
        "best_val_loss": round(float(best_val), 4),
        "final_train_loss": round(float(hist["train_loss"][-1]), 4),
        "final_val_loss": round(float(hist["val_loss"][-1]), 4),
        "architecture": "31->128->64->32->1 (BatchNorm, ReLU, Dropout 0.3)",
        "seed": SEED,
    }

    # ---- save artifacts ----
    torch.save({
        "state_dict": best_state,
        "feature_names": feat_names,
        "scaler_mean": scaler.mean_, "scaler_scale": scaler.scale_,
        "num_cols": NUM_COLS, "metrics": metrics,
    }, os.path.join(OUT, "leakguard_nn.pt"))
    with open(os.path.join(OUT, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    plt.figure(figsize=(8, 5))
    plt.plot(hist["train_loss"], label="train loss")
    plt.plot(hist["val_loss"], label="val loss")
    plt.xlabel("epoch")
    plt.ylabel("BCE loss")
    plt.title(f"LeakGuard NN training curve ({epochs_run} epochs, early stopped)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(OUT, "training_curve.png"), dpi=120)
    plt.close()

    print(json.dumps(metrics, indent=2))
    print("saved to", OUT)


if __name__ == "__main__":
    main()
