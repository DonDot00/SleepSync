Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
setupPath = root & "\setup.py"

If Not fso.FileExists(setupPath) Then
    MsgBox "Cannot find setup.py." & Chr(10) & Chr(10) & _
           "Looked in: " & root & Chr(10) & Chr(10) & _
           "Make sure you extracted the ZIP before running Setup.vbs.", _
           16, "Setup Error"
    WScript.Quit
End If

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /k python """ & setupPath & """"