Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)

If Not fso.FileExists(root & "\setup.py") Then
    MsgBox "Cannot find setup.py." & Chr(10) & Chr(10) & _
           "Make sure you extracted the ZIP first, then run Setup.vbs from inside the project folder.", _
           16, "Setup Error"
    WScript.Quit
End If

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = root
WshShell.Run "cmd /k python setup.py"