import os
import pandas as pd
import openpyxl

backend_dir = os.path.dirname(os.path.abspath(__file__))
xlsx_path = os.path.join(backend_dir, "Mission_10h40m_Telemetry.xlsx")
csv_path = os.path.join(backend_dir, "Mission_10h40m_Telemetry.csv")

print("--- Telemetry Verification ---")
print(f"Checking Excel file: {xlsx_path}")
assert os.path.exists(xlsx_path), f"Excel file {xlsx_path} missing!"

wb = openpyxl.load_workbook(xlsx_path, read_only=True)
sheet_names = wb.sheetnames
print(f"Sheet names found ({len(sheet_names)}): {sheet_names}")
expected_sheets = ["Mission_Telemetry", "Mission Summary", "Power Allocation", "Battery Analysis", "Fuel Cell Analysis", "Engine Analysis"]
for sheet in expected_sheets:
    assert sheet in sheet_names, f"Expected sheet '{sheet}' missing!"
wb.close()

print(f"Checking CSV dataset: {csv_path}")
assert os.path.exists(csv_path), f"CSV file {csv_path} missing!"

df = pd.read_csv(csv_path)
print(f"Total Rows: {len(df):,}")
print(f"Total Columns: {len(df.columns)}")
assert len(df) == 38400, f"Expected 38,400 rows, got {len(df)}"
assert len(df.columns) >= 40, f"Expected 40+ columns, got {len(df.columns)}"

print(f"First timestamp: {df['Time (hh:mm:ss)'].iloc[0]}")
print(f"Last timestamp: {df['Time (hh:mm:ss)'].iloc[-1]}")
assert df['Time (hh:mm:ss)'].iloc[0] == "00:00:00", f"First timestamp should be 00:00:00, got {df['Time (hh:mm:ss)'].iloc[0]}"
assert df['Time (hh:mm:ss)'].iloc[-1] == "10:39:59", f"Last timestamp should be 10:39:59, got {df['Time (hh:mm:ss)'].iloc[-1]}"

print("SUCCESS: Master dataset verification passed perfectly!")
