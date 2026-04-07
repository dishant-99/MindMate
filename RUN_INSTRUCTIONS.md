# Step-by-Step Instructions to Run main.py

## Step 1: Open PowerShell in the project folder
- Press `Windows Key + X` and select "Windows PowerShell" or "Terminal"
- Navigate to your project folder:
  ```
  cd "C:\Users\Dishant\OneDrive\Desktop\mindmate-ml"
  ```

## Step 2: Activate the virtual environment
```
.\venv\Scripts\Activate.ps1
```

If you get an execution policy error, run this first:
```
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then try activating again.

## Step 3: Verify everything is installed
```
pip list
```
You should see `huggingface_hub`, `joblib`, `scikit-learn`, `numpy`, and `pandas` in the list.

If any are missing, install them:
```
pip install -r requirements.txt
```

## Step 4: Run the script
```
python main.py
```

## That's it! 

The script will:
1. Load your ML model files (sentiment_model.pkl and vectorizer.pkl)
2. Ask you questions based on yesterday's mood/journal
3. Let you enter answers
4. Ask for today's journal entry
5. Predict your mood and give suggestions
6. Save everything to today.json

---

## Troubleshooting

**If you get "ModuleNotFoundError":**
- Make sure you activated the venv (Step 2)
- You should see `(venv)` at the start of your PowerShell prompt

**If the venv doesn't work:**
- Delete it: `Remove-Item -Recurse -Force venv`
- Create new: `python -m venv venv`
- Activate: `.\venv\Scripts\Activate.ps1`
- Install: `pip install -r requirements.txt`

**If you get errors about missing .pkl files:**
- Make sure `sentiment_model.pkl` and `vectorizer.pkl` are in the same folder as `main.py`


