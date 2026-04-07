import os
import sys
from typing import Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.base import BaseEstimator


def load_dataset(csv_path: str) -> pd.DataFrame:
    """
    Load the dataset from a CSV file and perform minimal cleaning.

    Expected columns: "Sentence" and "Label".
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at: {csv_path}")

    dataframe = pd.read_csv(csv_path)

    required_columns = {"Sentence", "Label"}
    if not required_columns.issubset(set(dataframe.columns)):
        raise ValueError(
            f"CSV must contain columns {required_columns}. Found: {list(dataframe.columns)}"
        )

    dataframe = dataframe.dropna(subset=["Sentence", "Label"])
    dataframe["Sentence"] = dataframe["Sentence"].astype(str).str.strip()
    dataframe["Label"] = dataframe["Label"].astype(str).str.strip().str.lower()

    return dataframe


def split_data(dataframe: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Split into train/test sets with stratification on the label.
    """
    texts = dataframe["Sentence"].values
    labels = dataframe["Label"].values

    return train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
        shuffle=True,
    )


def train_vectorizer(train_texts: np.ndarray) -> TfidfVectorizer:
    """
    Fit a TF-IDF vectorizer on the training texts.
    """
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words=None,  # keep negations like "not", "no"
        ngram_range=(1, 2),
        max_features=20000,
        min_df=2,
        sublinear_tf=True,
    )
    vectorizer.fit(train_texts)
    return vectorizer


def train_model(train_features, train_labels) -> LogisticRegression:
    """
    Train a Logistic Regression classifier for text classification.
    """
    classifier = LogisticRegression(
        solver="liblinear",
        max_iter=5000,
        C=2.0,
        n_jobs=None,
    )
    classifier.fit(train_features, train_labels)
    return classifier


def evaluate_model(model: BaseEstimator, features, labels) -> None:
    """
    Print evaluation metrics.
    """
    predictions = model.predict(features)
    print("\nEvaluation Results:")
    print("Accuracy:", f"{accuracy_score(labels, predictions):.4f}")
    print("\nClassification Report:")
    print(classification_report(labels, predictions))
    print("Confusion Matrix:")
    print(confusion_matrix(labels, predictions))


def save_artifacts(model: BaseEstimator, vectorizer: TfidfVectorizer, output_dir: str) -> Tuple[str, str]:
    """
    Save the trained model and vectorizer to disk.
    Returns paths to the saved artifacts.
    """
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "sentiment_model.pkl")
    vectorizer_path = os.path.join(output_dir, "vectorizer.pkl")
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    return model_path, vectorizer_path


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Default dataset path: file placed alongside this script
    default_dataset_filename = "student_sentiment_dataset_full(Phase 1).csv"
    dataset_path = os.path.join(script_dir, default_dataset_filename)

    if len(sys.argv) > 1:
        # Allow overriding the dataset path via CLI: python train_model.py <path_to_csv>
        dataset_path = sys.argv[1]

    print(f"Loading dataset from: {dataset_path}")
    df = load_dataset(dataset_path)

    print(f"Loaded {len(df)} rows. Label distribution:\n{df['Label'].value_counts()}\n")

    X_train_texts, X_test_texts, y_train, y_test = split_data(df)

    print("Training TF-IDF vectorizer...")
    vectorizer = train_vectorizer(X_train_texts)
    X_train_features = vectorizer.transform(X_train_texts)
    X_test_features = vectorizer.transform(X_test_texts)

    print("Training Logistic Regression classifier...")
    model = train_model(X_train_features, y_train)

    print("Evaluating on training set:")
    evaluate_model(model, X_train_features, y_train)
    print("\nEvaluating on test set:")
    evaluate_model(model, X_test_features, y_test)

    print("\nSaving artifacts...")
    model_path, vectorizer_path = save_artifacts(model, vectorizer, script_dir)
    print(f"Saved model to: {model_path}")
    print(f"Saved vectorizer to: {vectorizer_path}")


if __name__ == "__main__":
    main()


