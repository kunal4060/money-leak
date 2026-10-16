# Cancel/return classifier — 4-model comparison

Same data, same split for every model: 17,082 transactions (Pending excluded),
31 features (8 numeric + one-hot channel / payment / region / segment / category),
`train_test_split(test_size=0.2, random_state=42, stratify=y)` → 13,665 train / 3,417 test.
Positive ("bad") rate: 18.26%.

| Model | Accuracy | Precision | Recall | AUC |
|---|---|---|---|---|
| LogisticRegression | 0.817 | 0.00 | 0.00 | **0.508** ← highest |
| XGBoost (pipeline baseline) | 0.820 | 0.33 | 0.00 | 0.490 |
| RandomForest (300 trees) | 0.816 | 0.00 | 0.00 | 0.501 |
| MLPClassifier (64→32, 300 iters) | 0.692 | 0.162 | 0.165 | 0.487 |

## Conclusion

**Negative result confirmed across 4 model families.** All AUCs sit at 0.49–0.51 —
a coin flip; nothing beat 0.55. LR / RF / XGBoost collapse to predicting the majority
class (recall 0.00, accuracy ≈ base rate). The MLP is the only one that attempts
positive predictions (recall 0.165) but has the *worst* ranking ability, and it hit
`max_iter` without converging — which itself says there is nothing to converge to.

This is not a model-selection problem: the synthetic generator assigned
Cancelled/Returned labels essentially at random (bad rate ≈ 18% uniform across all
feature slices), so there is nothing to learn. Risk scores therefore stay out of the
dashboard's decision path — `web/public/data/risk.json` holds schema placeholders only,
and the Methodology page documents this openly.
