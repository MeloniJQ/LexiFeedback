"""
Shared timestamp-serialization helper.

Every model stores timestamps via datetime.utcnow() — a NAIVE datetime that
is UTC, but carries no timezone marker of its own. Calling plain
`.isoformat()` on it produces a string like "2025-09-29T14:23:45" with no
"Z"/offset suffix.

That matters because JavaScript's `new Date(...)` parses an ISO string with
a time component but NO timezone marker as LOCAL time, not UTC. So a
timestamp that was actually 14:23 UTC would be displayed as if 14:23 were
already the viewer's local time, instead of being converted to their real
local time — silently off by exactly that viewer's UTC offset. This is why
times shown on the frontend (e.g. Session Feedback History) didn't match
the user's actual local clock.

Fix: explicitly mark these as UTC when serializing, by appending "Z". Every
model's to_dict() should use this instead of calling .isoformat() directly.
"""


def to_iso_utc(dt):
    if dt is None:
        return None
    return dt.isoformat() + "Z"