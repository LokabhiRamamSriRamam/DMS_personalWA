#!/bin/bash
# WhatsApp API Testing Script
# Usage: Replace YOUR_TOKEN with actual JWT from login

TOKEN="YOUR_JWT_TOKEN_HERE"
BASE_URL="http://localhost:5000/api/whatsapp"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        WhatsApp Logs & Messages API Testing Script          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Before running: Replace TOKEN variable with your JWT token"
echo "Get token from: Login via frontend → check localStorage['dms_token']"
echo ""

# Helper function to pretty-print JSON
pretty_print() {
  if command -v jq &> /dev/null; then
    jq '.' <<< "$1"
  else
    echo "$1"
  fi
}

# ─────────────────────────────────────────────────────────────────
# 1. GET DASHBOARD SUMMARY (KPIs)
# ─────────────────────────────────────────────────────────────────

echo ""
echo "1️⃣  GET /logs/summary — Dashboard KPIs"
echo "────────────────────────────────────────────────────────────────"
echo "Shows: Sent count, Pending count, Failed count, Recent failures"
echo ""
echo "Request:"
echo "  curl -X GET '$BASE_URL/logs/summary' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
echo "Response:"
RESPONSE=$(curl -s -X GET "$BASE_URL/logs/summary" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# ─────────────────────────────────────────────────────────────────
# 2. GET SCHEDULED MESSAGES ONLY
# ─────────────────────────────────────────────────────────────────

echo ""
echo ""
echo "2️⃣  GET /logs/scheduled — Messages Currently Pending"
echo "────────────────────────────────────────────────────────────────"
echo "Shows: All messages with status='scheduled' (queued for later)"
echo ""
echo "Request:"
echo "  curl -X GET '$BASE_URL/logs/scheduled' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
echo "Response:"
RESPONSE=$(curl -s -X GET "$BASE_URL/logs/scheduled" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# ─────────────────────────────────────────────────────────────────
# 3. GET ALL LOGS (with filters)
# ─────────────────────────────────────────────────────────────────

echo ""
echo ""
echo "3️⃣  GET /logs — All Message Logs with Filters"
echo "────────────────────────────────────────────────────────────────"
echo "Shows: All logs matching your filters"
echo ""

# 3a. All logs
echo "3a. GET ALL LOGS (no filters):"
echo "  curl -X GET '$BASE_URL/logs' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
RESPONSE=$(curl -s -X GET "$BASE_URL/logs" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# 3b. Filter by status
echo ""
echo "3b. GET FAILED MESSAGES:"
echo "  curl -X GET '$BASE_URL/logs?status=failed' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
RESPONSE=$(curl -s -X GET "$BASE_URL/logs?status=failed" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# 3c. Filter by event
echo ""
echo "3c. GET POST-CARE MESSAGES:"
echo "  curl -X GET '$BASE_URL/logs?event=postCare' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
RESPONSE=$(curl -s -X GET "$BASE_URL/logs?event=postCare" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# 3d. Filter by date
echo ""
echo "3d. GET LOGS FROM SPECIFIC DATE:"
echo "  curl -X GET '$BASE_URL/logs?dateFrom=2025-01-20&dateTo=2025-01-21' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
RESPONSE=$(curl -s -X GET "$BASE_URL/logs?dateFrom=2025-01-20&dateTo=2025-01-21" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# 3e. Combine filters
echo ""
echo "3e. GET FAILED POST-CARE MESSAGES FROM TODAY:"
echo "  curl -X GET '$BASE_URL/logs?event=postCare&status=failed&dateFrom=2025-01-20' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
RESPONSE=$(curl -s -X GET "$BASE_URL/logs?event=postCare&status=failed&dateFrom=2025-01-20" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# ─────────────────────────────────────────────────────────────────
# 4. GET JOURNEYS (post-care configuration)
# ─────────────────────────────────────────────────────────────────

echo ""
echo ""
echo "4️⃣  GET /journeys — Post-Care Journey Configurations"
echo "────────────────────────────────────────────────────────────────"
echo "Shows: All configured post-care journeys"
echo ""
echo "Request:"
echo "  curl -X GET '$BASE_URL/journeys' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
echo "Response:"
RESPONSE=$(curl -s -X GET "$BASE_URL/journeys" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# ─────────────────────────────────────────────────────────────────
# 5. GET SETTINGS
# ─────────────────────────────────────────────────────────────────

echo ""
echo ""
echo "5️⃣  GET /settings — WhatsApp Configuration"
echo "────────────────────────────────────────────────────────────────"
echo "Shows: Whether WhatsApp is enabled, event toggles, defaults"
echo ""
echo "Request:"
echo "  curl -X GET '$BASE_URL/settings' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""
echo "Response:"
RESPONSE=$(curl -s -X GET "$BASE_URL/settings" \
  -H "Authorization: Bearer $TOKEN")
pretty_print "$RESPONSE"

# ─────────────────────────────────────────────────────────────────
# QUICK TESTING SCENARIOS
# ─────────────────────────────────────────────────────────────────

echo ""
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              TESTING SCENARIOS & TROUBLESHOOTING             ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo ""
echo "🔍 SCENARIO 1: Are messages being sent?"
echo "────────────────────────────────────────────────────────────────"
echo "Run this:"
echo "  curl -s '$BASE_URL/logs/summary' -H 'Authorization: Bearer $TOKEN' | grep sent"
echo ""
echo "If you see a number > 0, messages ARE being sent ✓"
echo "If you see 0, check:"
echo "  • Is WhatsApp enabled? → /settings → enabled: true"
echo "  • Is WAAPI_BASE_URL set? → check dms_backend/.env"
echo "  • Do templates exist? → /templates?event=appointmentReminder"

echo ""
echo "🔍 SCENARIO 2: What messages are currently queued?"
echo "────────────────────────────────────────────────────────────────"
echo "Run this:"
echo "  curl -s '$BASE_URL/logs/scheduled' -H 'Authorization: Bearer $TOKEN'"
echo ""
echo "See:"
echo "  • Patient name"
echo "  • Event type"
echo "  • Phone number"
echo "  • Scheduled time (in payload.scheduledAt)"

echo ""
echo "🔍 SCENARIO 3: Why is a message failing?"
echo "────────────────────────────────────────────────────────────────"
echo "Run this:"
echo "  curl -s '$BASE_URL/logs?status=failed' -H 'Authorization: Bearer $TOKEN' | grep error"
echo ""
echo "Look for errorMessage values:"
echo "  • 'Invalid phone number format' → Patient phone missing country code"
echo "  • 'No template found' → Create active template for that event"
echo "  • 'WhatsApp is disabled' → Enable in settings"
echo "  • 'WAAPI request timeout' → WAAPI service unreachable"

echo ""
echo "🔍 SCENARIO 4: How many messages sent today?"
echo "────────────────────────────────────────────────────────────────"
echo "Run this (replace YYYY-MM-DD with today):"
echo "  curl -s '$BASE_URL/logs?dateFrom=2025-01-20&dateTo=2025-01-21&status=sent' \\"
echo "    -H 'Authorization: Bearer $TOKEN' | grep -c '_id'"

echo ""
echo "🔍 SCENARIO 5: Verify post-care journey is configured"
echo "────────────────────────────────────────────────────────────────"
echo "Run this:"
echo "  curl -s '$BASE_URL/journeys' -H 'Authorization: Bearer $TOKEN'"
echo ""
echo "You should see treatments with their message steps and delays"

echo ""
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     RESPONSE EXAMPLES                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo ""
echo "📊 Summary Response (/logs/summary):"
cat << 'EOF'
{
  "byStatus": {
    "sent": 245,
    "scheduled": 18,
    "failed": 3
  },
  "byEvent": {
    "appointmentReminder": 120,
    "postCare": 108,
    "treatmentScheduled": 20
  },
  "recentFailed": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "patientId": {
        "first_name": "Jane",
        "last_name": "Smith"
      },
      "event": "appointmentReminder",
      "to": "+919876543210",
      "errorMessage": "Invalid phone number format",
      "sentAt": "2025-01-20T09:30:00Z"
    }
  ]
}
EOF

echo ""
echo "📋 Scheduled Log Response (/logs/scheduled):"
cat << 'EOF'
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "patientId": {
      "first_name": "John",
      "last_name": "Doe"
    },
    "event": "postCare",
    "to": "+919876543210",
    "status": "scheduled",
    "payload": {
      "tenantId": "clinic123",
      "to": "+919876543210",
      "messageType": "postCare",
      "contentType": "text",
      "content": {
        "text": "Take care of your tooth. Rest for 24 hours..."
      },
      "scheduledAt": "2025-01-21T10:00:00Z"
    },
    "errorMessage": null,
    "sentAt": "2025-01-20T09:00:00Z",
    "createdAt": "2025-01-20T09:00:00Z",
    "updatedAt": "2025-01-20T09:00:00Z"
  }
]
EOF

echo ""
echo "✅ All tests ready!"
echo "Replace TOKEN='YOUR_JWT_TOKEN_HERE' and run this script"
echo ""
