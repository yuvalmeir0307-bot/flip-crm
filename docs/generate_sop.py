from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUTPUT = "docs/Flip_CRM_Acquisition_SOP.pdf"

# ── Palette ──────────────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#1E2A4A")
BLUE   = colors.HexColor("#2563EB")
LIGHT  = colors.HexColor("#EFF6FF")
GRAY   = colors.HexColor("#6B7280")
GREEN  = colors.HexColor("#059669")
AMBER  = colors.HexColor("#D97706")
RED    = colors.HexColor("#DC2626")
WHITE  = colors.white

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    rightMargin=0.75*inch,
    leftMargin=0.75*inch,
    topMargin=0.75*inch,
    bottomMargin=0.75*inch,
)

base = getSampleStyleSheet()

def style(name, parent="Normal", **kw):
    s = ParagraphStyle(name, parent=base[parent], **kw)
    return s

S = {
    "title":    style("title",   "Title",   fontSize=26, textColor=NAVY,
                      spaceAfter=4, alignment=TA_CENTER, fontName="Helvetica-Bold"),
    "subtitle": style("sub",     "Normal",  fontSize=11, textColor=GRAY,
                      spaceAfter=16, alignment=TA_CENTER),
    "h1":       style("h1",      "Heading1",fontSize=14, textColor=WHITE,
                      fontName="Helvetica-Bold", spaceAfter=0, spaceBefore=0),
    "h2":       style("h2",      "Heading2",fontSize=11, textColor=NAVY,
                      fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4),
    "body":     style("body",    "Normal",  fontSize=9.5, leading=14,
                      textColor=colors.HexColor("#1F2937")),
    "bullet":   style("bullet",  "Normal",  fontSize=9.5, leading=14,
                      leftIndent=16, bulletIndent=4,
                      textColor=colors.HexColor("#1F2937")),
    "sub_bullet":style("sub_b",  "Normal",  fontSize=9, leading=13,
                      leftIndent=32, bulletIndent=20,
                      textColor=colors.HexColor("#374151")),
    "note":     style("note",    "Normal",  fontSize=8.5, leading=12,
                      textColor=GRAY, leftIndent=12),
    "check":    style("check",   "Normal",  fontSize=9.5, leading=15,
                      leftIndent=12, textColor=colors.HexColor("#1F2937")),
    "warning":  style("warn",    "Normal",  fontSize=9, leading=13,
                      textColor=RED, leftIndent=12),
}

def section_header(title, color=NAVY):
    """Blue banner header for each section."""
    tbl = Table([[Paragraph(title, S["h1"])]], colWidths=[6.5*inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), color),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("ROUNDEDCORNERS", [4,4,4,4]),
    ]))
    return tbl

def divider():
    return HRFlowable(width="100%", thickness=0.5,
                      color=colors.HexColor("#E5E7EB"), spaceAfter=6, spaceBefore=6)

def b(text): return f"<b>{text}</b>"
def em(text): return f"<i>{text}</i>"

# ── Build story ───────────────────────────────────────────────────────────────
story = []

# Title block
story += [
    Spacer(1, 0.1*inch),
    Paragraph("Flip CRM", S["title"]),
    Paragraph("Acquisition Standard Operating Procedure", S["subtitle"]),
    divider(),
    Spacer(1, 0.1*inch),
]

# ── DAILY KICKOFF ─────────────────────────────────────────────────────────────
story += [
    section_header("Daily Team Kickoff — 3:00 PM"),
    Spacer(1, 6),
    Paragraph("Open the CRM together and align before anyone touches a lead.", S["body"]),
    Spacer(1, 6),
    Paragraph("• Open CRM dashboard as a team", S["bullet"]),
    Paragraph("• Review alerts, pending follow-ups, and who needs a call today", S["bullet"]),
    Paragraph("• Set daily targets: number of calls + contacts to upload", S["bullet"]),
    Paragraph("• Distribute tasks among team members", S["bullet"]),
    Spacer(1, 14),
]

# ── PART 1 ────────────────────────────────────────────────────────────────────
story += [
    section_header("Part 1 — Lead Generation  (Cold Caller / Junior)", BLUE),
    Spacer(1, 8),

    Paragraph(b("Step 1:") + "  Go to the " + b("Overview") + " tab", S["bullet"]),
    Paragraph(b("Step 2:") + "  Click " + b("Grab Agents") + " with your name", S["bullet"]),
    Paragraph(b("Step 3:") + "  Click " + b("Run Drip") + " to activate the automation", S["bullet"]),
    Spacer(1, 8),

    Paragraph(b("Step 4:") + "  Manage initial text messages", S["bullet"]),
    Paragraph("Conduct a " + b("Discovery Call") + " — collect property details and check seller motivation",
              S["sub_bullet"]),
    Spacer(1, 4),

    Paragraph(b("Transition Rule:"), S["h2"]),
    Paragraph(
        "If the agent sent a deal " + b("by text") +
        " → move immediately to a phone call (do not stay in text).",
        S["note"]
    ),
    Spacer(1, 14),
]

# ── PART 2 ────────────────────────────────────────────────────────────────────
story += [
    section_header("Part 2 — Responding to Replies  (Opportunities Tab)", BLUE),
    Spacer(1, 8),

    Paragraph(b("Step 1:") + "  Navigate to the " + b("Opportunities") + " tab in the CRM", S["bullet"]),
    Spacer(1, 4),

    Paragraph(b("Step 2:") + "  Be available during set hours — answer calls & messages per recruitment script",
              S["bullet"]),
    Paragraph("4a.  If unavailable → schedule a callback for a time that works", S["sub_bullet"]),
    Paragraph("4b.  If potential deal detected → switch to Discovery script (use " +
              b("Potential Deal") + " column on the right)", S["sub_bullet"]),
    Spacer(1, 8),

    Paragraph(b("Step 3:") + "  After each call / message exchange — categorize the contact manually:",
              S["bullet"]),
    Spacer(1, 4),
]

# categorization table
cat_data = [
    [b("Outcome"), b("Move To")],
    ["Cooperative agent willing to share deals", "The Pool"],
    ["Not interested / not a fit", "Graveyard"],
    ["Has a potential deal", "Potential Deal"],
]
cat_tbl = Table(cat_data, colWidths=[3.5*inch, 2.8*inch])
cat_tbl.setStyle(TableStyle([
    ("BACKGROUND",    (0,0), (-1,0),  NAVY),
    ("TEXTCOLOR",     (0,0), (-1,0),  WHITE),
    ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
    ("FONTSIZE",      (0,0), (-1,-1), 9),
    ("BACKGROUND",    (0,1), (-1,1),  LIGHT),
    ("ROWBACKGROUNDS",(0,1), (-1,-1), [LIGHT, WHITE]),
    ("GRID",          (0,0), (-1,-1), 0.4, colors.HexColor("#D1D5DB")),
    ("TOPPADDING",    (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("LEFTPADDING",   (0,0), (-1,-1), 8),
]))
story += [cat_tbl, Spacer(1, 14)]

# ── MOTIVATION FILTERING ──────────────────────────────────────────────────────
story += [
    section_header("Motivation Filtering — Follow-Up Cadence", colors.HexColor("#7C3AED")),
    Spacer(1, 8),

    Paragraph(b("High Motivation") + " seller →  Phone follow-up every " +
              b("1 week") + " (regardless of price the agent quoted)", S["bullet"]),
    Paragraph(b("Low Motivation") + " seller →  Follow-up every " +
              b("4 weeks"), S["bullet"]),
    Spacer(1, 14),
]

# ── PART 3 ────────────────────────────────────────────────────────────────────
story += [
    section_header("Part 3 — Deal Analysis, Offers & Follow-Ups  (Acquisition Manager)", BLUE),
    Spacer(1, 8),

    Paragraph(b("Step 1:") + "  Deal lands in " + b("Potential Deal") +
              " from an agent → call and extract details using the Discovery script", S["bullet"]),
    Spacer(1, 8),

    Paragraph(b("Step 2:") + "  Assign a status based on the table below:", S["bullet"]),
    Spacer(1, 6),
]

# status table
status_data = [
    [b("Status"), b("Meaning"), b("Action")],
    ["Potential Deal",   "Waiting for agent to accept the deal",
     "Set an appropriate follow-up date"],
    ["Underwriting",     "Deal clarification in progress (max 10 min)",
     "Run auto-analysis per Jerry's method"],
    ["Offer Submitted",  "Offer has been sent",
     "Follow up the next day"],
    ["Counter",          "Agent/seller sent a counter-offer",
     "Review, decide, and update CRM"],
    ["Contract Signed",  "Contract executed",
     "Handoff to Dispo & TC"],
]
status_tbl = Table(status_data, colWidths=[1.55*inch, 2.55*inch, 2.2*inch])
status_tbl.setStyle(TableStyle([
    ("BACKGROUND",    (0,0), (-1,0),  NAVY),
    ("TEXTCOLOR",     (0,0), (-1,0),  WHITE),
    ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
    ("FONTSIZE",      (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS",(0,1), (-1,-1), [LIGHT, WHITE]),
    ("GRID",          (0,0), (-1,-1), 0.4, colors.HexColor("#D1D5DB")),
    ("TOPPADDING",    (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("LEFTPADDING",   (0,0), (-1,-1), 8),
    ("VALIGN",        (0,0), (-1,-1), "TOP"),
]))
story += [status_tbl, Spacer(1, 8)]

story += [
    Paragraph(
        b("Offer Benchmark:") +
        "  Hieu's ratio = 1 signed contract for every 15 offers submitted to agents.",
        S["note"]
    ),
    Spacer(1, 14),
]

# ── END OF DAY ────────────────────────────────────────────────────────────────
story += [
    section_header("End of Day Checklist", GREEN),
    Spacer(1, 8),
    Paragraph("[ ]  Every contact has a follow-up date set", S["check"]),
    Paragraph("[ ]  Every call documented in Notes", S["check"]),
    Paragraph("[ ]  Dashboard alerts cleared", S["check"]),
    Paragraph("[ ]  " + b("Reflection:") + " What worked today? What to change tomorrow?", S["check"]),
    Spacer(1, 14),
]

# ── INCIDENT REVIEW ───────────────────────────────────────────────────────────
story += [
    section_header("Incident Review  (When Something Goes Wrong)", RED),
    Spacer(1, 8),
    Paragraph(
        b("What happened") + "  →  " +
        b("What we expected") + "  →  " +
        b("What we change in the process"),
        S["body"]
    ),
    Paragraph(
        "Document every incident. Patterns that repeat 2+ times become a process update.",
        S["note"]
    ),
    Spacer(1, 8),
    divider(),
    Paragraph(em("Flip CRM Acquisition SOP · Version 1.0 · 2026"), S["note"]),
]

doc.build(story)
print(f"PDF saved: {OUTPUT}")
