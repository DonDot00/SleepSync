#!/usr/bin/env python3
"""
generate_shortcut.py
Run this script once on your PC to create the SleepSync iOS Shortcut.
It auto-detects your local IP so the shortcut POSTs to the right address.

Usage:  python generate_shortcut.py
Output: SleepSync.shortcut  (AirDrop or email to your iPhone, tap "Add Shortcut")
"""

import plistlib
import socket
import os

# ── helpers ──────────────────────────────────────────────────────────────────

def var(name):
    """Reference to a named Shortcuts variable."""
    return {
        "Value": {"Type": "Variable", "VariableName": name},
        "WFSerializationType": "WFTokenAttachmentParameterState",
    }

def set_var(name):
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.setvariable",
        "WFWorkflowActionParameters": {"WFVariableName": name},
    }

def get_var(name):
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.getvariable",
        "WFWorkflowActionParameters": {"WFVariable": var(name)},
    }

def health_query(category_value=None):
    """
    Query Sleep Analysis health samples from the 'From' variable to now.
    category_value: HealthKit integer  3=Core/Light  4=Deep  5=REM  None=all
    """
    params = {
        "WFHealthRecordType": "Sleep Analysis",
        "WFHealthStartDate": var("From"),
        "WFHealthDocumentSortOrder": "Ascending",
    }
    if category_value is not None:
        params["WFHealthCategoryValue"] = category_value
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.queryhealthrecords",
        "WFWorkflowActionParameters": params,
    }

def calc_stats_sum():
    """Sum the Duration property of the health samples passed in."""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.statistics",
        "WFWorkflowActionParameters": {
            "WFStatisticsOperation": "Sum",
            "WFStatisticsProperty": "Duration",
        },
    }

def math_add(var_name):
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.math",
        "WFWorkflowActionParameters": {
            "WFMathOperation": "+",
            "WFMathOperand": var(var_name),
        },
    }

def math_divide(constant):
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.math",
        "WFWorkflowActionParameters": {
            "WFMathOperation": "/",
            "WFMathOperand": {
                "Value": {"string": str(constant)},
                "WFSerializationType": "WFTextTokenString",
            },
        },
    }

def get_item(specifier):  # "First Item" or "Last Item"
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.getitemfromlist",
        "WFWorkflowActionParameters": {"WFItemSpecifier": specifier},
    }

def get_property(prop):
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.properties",
        "WFWorkflowActionParameters": {"WFPropertyName": prop},
    }

def format_date(fmt="HH:mm"):
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.format.date",
        "WFWorkflowActionParameters": {
            "WFDateFormatStyle": "Custom",
            "WFDateFormat": fmt,
        },
    }

def post_json(url, field_map):
    """POST a JSON body to url. field_map: { "json_key": "VarName" }"""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
        "WFWorkflowActionParameters": {
            "WFURL": url,
            "WFHTTPMethod": "POST",
            "WFHTTPBodyType": "JSON",
            "WFJSONValues": {
                "WFSerializationType": "WFDictionaryFieldValue",
                "Value": {
                    "WFDictionaryFieldValueItems": [
                        {
                            "WFItemType": 0,
                            "WFKey": {
                                "Value": {"string": k},
                                "WFSerializationType": "WFTextTokenString",
                            },
                            "WFValue": var(v),
                        }
                        for k, v in field_map.items()
                    ]
                },
            },
        },
    }

def notify(body):
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.notification.create",
        "WFWorkflowActionParameters": {
            "WFNotificationActionTitle": "SleepSync",
            "WFNotificationActionBody": body,
            "WFNotificationActionSound": False,
        },
    }

# ── build action list ─────────────────────────────────────────────────────────

def build_actions(endpoint):
    """
    HealthKit sleep category integers (watchOS 9+):
      3 = AsleepCore (light)   4 = AsleepDeep   5 = AsleepREM
    """
    return [
        # Step 1: set the look-back window (18 h covers last night)
        {"WFWorkflowActionIdentifier": "is.workflow.actions.date",
         "WFWorkflowActionParameters": {}},
        {"WFWorkflowActionIdentifier": "is.workflow.actions.adjustdate",
         "WFWorkflowActionParameters": {
             "WFAdjustOperation": "Subtract",
             "WFDuration": {
                 "Value": {"Magnitude": 18, "Unit": "hr"},
                 "WFSerializationType": "WFQuantityFieldValue",
             },
         }},
        set_var("From"),

        # Step 2: deep sleep duration in seconds -> divide by 60 -> minutes
        health_query(4),
        calc_stats_sum(),
        math_divide(60),
        set_var("DeepMins"),

        # Step 3: REM sleep
        health_query(5),
        calc_stats_sum(),
        math_divide(60),
        set_var("RemMins"),

        # Step 4: core / light sleep
        health_query(3),
        calc_stats_sum(),
        math_divide(60),
        set_var("LightMins"),

        # Step 5: total = Deep + REM + Light
        get_var("DeepMins"),
        math_add("RemMins"),
        math_add("LightMins"),
        set_var("TotalMins"),

        # Step 6: bedtime = start of first sleep sample
        health_query(None),
        set_var("AllSamples"),
        get_var("AllSamples"),
        get_item("First Item"),
        get_property("Start Date"),
        format_date("HH:mm"),
        set_var("Bedtime"),

        # Step 7: wake time = end of last sleep sample
        get_var("AllSamples"),
        get_item("Last Item"),
        get_property("End Date"),
        format_date("HH:mm"),
        set_var("WakeTime"),

        # Step 8: POST to REM backend
        post_json(endpoint, {
            "bedtime":       "Bedtime",
            "wake_time":     "WakeTime",
            "total_minutes": "TotalMins",
            "deep_minutes":  "DeepMins",
            "rem_minutes":   "RemMins",
            "light_minutes": "LightMins",
        }),

        # Step 9: confirm
        notify("Sleep data synced to SleepSync"),
    ]

# ── detect local IP ───────────────────────────────────────────────────────────

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None

# ── main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ip = get_local_ip()
    if not ip:
        print("Could not auto-detect your local IP.")
        ip = input("Enter it manually (e.g. 192.168.1.45): ").strip()

    endpoint = f"http://{ip}:8000/sleep/apple-health"

    shortcut_dict = {
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowHasShortcutInputVariables": False,
        "WFWorkflowIcon": {
            "WFWorkflowIconStartColor": 431817727,
            "WFWorkflowIconGlyphNumber": 59505,
        },
        "WFWorkflowInputContentItemClasses": [],
        "WFWorkflowActions": build_actions(endpoint),
        "WFWorkflowTypes": [],
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowImportQuestions": [],
    }

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "SleepSync.shortcut")
    with open(out, "wb") as f:
        plistlib.dump(shortcut_dict, f, fmt=plistlib.FMT_BINARY)

    sep = "-" * 50
    print(f"\nEndpoint baked in: {endpoint}")
    print(f"Created: {out}")
    print(f"""
{sep}
 INSTALL ON YOUR IPHONE
{sep}
 Option A - AirDrop (fastest):
   Right-click SleepSync.shortcut in File Explorer
   > Show more options > Send to > your iPhone
   Accept on iPhone > tap "Add Shortcut"

 Option B - Email to yourself:
   Attach SleepSync.shortcut and send to yourself
   Open the attachment on iPhone > tap "Add Shortcut"

 If "Add Untrusted Shortcut" appears instead:
   Settings > Shortcuts > Allow Untrusted Shortcuts > enable
   Then re-open the file.

{sep}
 AUTOMATE IT (runs when your morning alarm goes off)
{sep}
   Shortcuts app > Automation tab > +
   > Personal Automation > When my alarm stops
   > New Blank Automation > Add Action
   > Run Shortcut > SleepSync > Done

{sep}
 IF ANY ACTIONS SHOW A WARNING AFTER INSTALLING
{sep}
 Apple occasionally changes parameter names between iOS versions.
 If a "Find Health Samples" step shows an error:
   Tap it > re-select Sleep Analysis as the record type
   For the filtered ones: add a filter where Value = Asleep Deep,
   Asleep REM, or Asleep Core respectively.
 The URL and all variable names are already filled in correctly.
{sep}
""")