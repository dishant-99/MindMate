# Quick Fix - Two Ways to Run

## Option 1: Use Python directly (NO activation needed!)
Just run:
```
.\venv\Scripts\python.exe main.py
```

This works without activating the venv!

---

## Option 2: If you want to activate the venv

Try this command in PowerShell:
```
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\venv\Scripts\Activate.ps1
python main.py
```

The `-Scope Process` means it only affects your current PowerShell window, so it's safer.

---

## Easiest Solution (Recommended):
Just use Option 1 - no activation needed! Run:
```
.\venv\Scripts\python.exe main.py
```


