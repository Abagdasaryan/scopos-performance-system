# SCOPOS Performance Evaluation System

A comprehensive performance evaluation framework for architecture/design firms, built as self-contained HTML applications with auto-calculation, weighted scoring, and executive dashboards.

## Project Structure

```
scopos-performance-system/
├── SCOPOS_Performance_System.html    # Landing page & Manager Guide
├── forms/
│   ├── CA_Performance_Evaluation.html              # Construction Administrator eval
│   └── Interior_Designer_Performance_Evaluation.html # Interior Designer eval
├── assets/
│   └── SCOPOS_Icon.png               # SCOPOS brand icon
└── README.md
```

## Features

### Evaluation Forms
- **Weighted scoring system** across 6 performance sections (technical, communication, leadership, etc.)
- **Auto-calculated** composite scores, stability ratings, and authority gate levels
- **Deficiency action plans** auto-generated from low-scoring competencies
- **CEO Dashboard** with visual indicators and promotion readiness
- **Print-optimized** layouts for formal documentation
- **Self-contained** — all styles, scripts, and images (base64-encoded) are embedded in each HTML file

### Pending Development
- [ ] **Section 7 – Right Seat Validation (GWC)** for CA form (binary Get It / Want It / Capacity assessment)
- [ ] **Section 7 – Right Seat Validation (GWC)** for Interior Designer form
- [ ] Additional role evaluation forms

## How to Use

1. Open any `.html` file directly in a browser — no server required
2. Fill in employee information and score each competency (1–5)
3. Calculations update automatically
4. Use the **Print** button or `Ctrl+P` for PDF export

## GWC Section Spec (Next Addition)

**Section 7 – Right Seat Validation (GWC)** — to be inserted after Section 6, renumbering current Section 7 (Executive Summary) to Section 8.

This is a **binary assessment** (not 1–5 scored):

| Criteria | Response | Key Indicators |
|----------|----------|----------------|
| **Get It?** | Yes / No | Understands role at deep level; connects technical decisions to project impact; grasps liability and contract implications |
| **Want It?** | Yes / No | Takes ownership without being asked; doesn't avoid hard conversations; shows genuine interest in technical depth; demonstrates pride in documentation quality |
| **Capacity?** | Yes / No | Manages multiple concurrent projects; maintains composure under pressure; demonstrates cognitive ability for role complexity; keeps pace with project rhythm |

**Right Seat Summary Options:**
- ✅ Right Person, Right Seat
- ⚠️ Right Person, Wrong Seat
- ❌ Wrong Person

**Governance Rule:** If skill ratings are adequate but GWC indicates misalignment → evaluate role fit rather than applying more training. This section is leadership-level clarity only, not for employee distribution.

## Tech Notes

- All files are standalone HTML with embedded CSS/JS
- Logo and icon are base64-encoded within each file
- No external dependencies or build tools required
- Compatible with all modern browsers

## License

Proprietary — SCOPOS internal use only.
