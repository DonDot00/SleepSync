MsgBox "Starting REM - two terminal windows will open."

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.Run "cmd /k cd /d """ & root & "\backend"" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
WshShell.Run "cmd /k cd /d """ & root & "\frontend"" && npm run dev"