import joblib

# Load the trained model + vectorizer
model = joblib.load("sentiment_model.pkl")
vectorizer = joblib.load("vectorizer.pkl")

print("🤖 MindMate Sentiment Checker (type 'quit' to exit)\n")

while True:
    # Take user input
    text = input("Enter your journal entry: ")
    if text.lower() == "quit":
        break

    # Vectorize and predict
    X = vectorizer.transform([text])
    prediction = model.predict(X)[0]

    print(f"➡ Prediction: {prediction}\n")
