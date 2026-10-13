# NumPy Data Filtering Lab — Task 13

A clean, interactive web application for practicing NumPy Boolean conditions and Boolean indexing with two suggested datasets: **student marks** and **sales values**. It also supports your own comma-separated numbers.

## Features

- Filter using `>`, `<`, `==`, `>=`, and `<=` comparisons.
- Change the threshold and instantly see matching values.
- Explore student marks, sales values, or custom numerical data.
- View each input value, the Boolean mask, filtered output, and quick statistics.
- Export the filtered values as a CSV file.
- Responsive interface for desktop and mobile screens.
- Python + NumPy backend; built-in Python web server; no Flask, Node.js, or Jupyter Notebook.

## Requirements

- Python 3.11 or newer (Python 3.14 is supported by current NumPy releases).
- Internet access on the first run to install NumPy.

## Run on Windows (recommended)

1. Extract the ZIP file.
2. Open the extracted `numpy-data-filtering-task13` folder.
3. Double-click `run.bat`.
4. Wait for the dependency check to finish.
5. Open **http://127.0.0.1:8000** in your browser.
6. Keep the black terminal window open while using the app. Press `Ctrl+C` in that window to stop it.

## Run from PowerShell / terminal

Open PowerShell in this project folder, then run:

```powershell
py -m pip install -r requirements.txt
py app.py
```

If `py` is not available but `python` works, use:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:8000.

## How the NumPy filtering works

```python
import numpy as np

data = np.array([45, 78, 62, 91, 54, 38])
mask = data > 50        # NumPy creates a Boolean array
filtered = data[mask]   # Boolean indexing returns matching values
print(filtered)         # [78 62 91 54]
```

The app performs this operation on the Python backend. The browser sends the selected dataset, comparison operator, and threshold to `/api/filter`.

## GitHub upload

Create a **public** repository named `numpy-data-filtering-task13` (do not initialize it with a README, license, or `.gitignore` because this folder already has a README). Then run these commands from this folder:

```powershell
git init
git add .
git commit -m "Build NumPy data filtering web app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/numpy-data-filtering-task13.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. If Git says `remote origin already exists`, use `git remote set-url origin https://github.com/YOUR-USERNAME/numpy-data-filtering-task13.git` instead of `git remote add origin ...`.
