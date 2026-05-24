---
title: Setting Up Clinical Data
journey: Management
order: 9
tags: [clinical data, treatments, diagnoses, findings, catalog, bulk upload, import, settings]
keywords: how to add treatments, import diagnoses, add clinical findings, bulk upload treatments, dental library, ICD code
video:
---

## Setting Up Your Clinical Data

Clinical Data is the backbone of your treatment workflow. It powers the drop-down lists your doctors see when charting a visit — the findings they record, the diagnoses they confirm, and the treatments they plan.

There are three catalogs to set up:

| Catalog | What it is | Example |
|---|---|---|
| **Clinical Findings** | Observations recorded during examination | "Periodontal Pocket ≥ 5 mm", "Gingival Bleeding" |
| **Diagnoses** | Confirmed clinical conclusions (optional ICD-10 code) | "Irreversible Pulpitis (K04.0)", "Dental Caries – Dentin (K02.1)" |
| **Suggested Treatments** | Standard procedures with default costs | "Root Canal Treatment – Molar ₹6,000", "Scaling & Polishing ₹1,200" |

Go to **Settings → Clinical Data** to manage all three.

---

### Choosing How to Add Items

Click **"Add [Findings / Diagnoses / Suggested Treatments]"** to open the chooser. Pick the method that suits your situation:

---

#### Import from Library *(Recommended for new clinics)*

The fastest way to get started. We ship a curated dental starter catalog — 44 treatments, 25 diagnoses, and 29 clinical findings — pre-categorised by specialty (Endodontic, Periodontal, Restorative, etc.).

**How it works:**
1. Click **Import from Library** in the chooser.
2. The library page opens, pre-filtered to the active catalog tab.
3. Use the search bar, category chips, or quick-filter tags (Popular, Pediatric, Cosmetic) to find what you need.
4. Check the items you want. Click any row to expand it and edit the name, cost, or ICD code before importing.
5. Items already in your catalog appear greyed out — they can't be re-imported.
6. Click **Import N items**. A progress indicator runs through each POST. On completion, you'll see a summary ("Imported 12. 0 skipped.").

You can return to the library anytime to add more.

---

#### Add One *(Quick, ad-hoc)*

For a single item you need right now.

1. Click **Add One** in the chooser.
2. Fill in the name (required), cost (treatments only), ICD code (diagnoses only), category, and description.
3. Click **Save**. The item appears immediately in the list.

---

#### Quick Entry *(5–20 items)*

An inline spreadsheet that opens directly on the Settings page — no page navigation needed.

1. Click **Quick Entry** in the chooser. The page shows an orange table above the existing list.
2. Click **Add Row** for each item. Fill in the columns inline.
3. When done, click **Add All Items (N)**. Rows with empty names are skipped automatically.
4. Click **Cancel Quick Entry** to discard without saving.

**Columns by tab:**
- Findings: Name, Category, Description
- Diagnoses: Name, ICD Code, Category, Description
- Treatments: Name, Cost (₹), Category, Description

---

#### Bulk Upload *(50+ items or migration)*

Upload a CSV / Excel file or connect a Google Sheet. Ideal when migrating from another system.

**Step-by-step (File upload):**

1. Click **Bulk Upload** in the chooser.
2. Download the **sample sheet** to get the exact column format.
3. Fill in your data (row 1 = headers, row 2 onward = data).
4. Drag-and-drop your file onto the drop zone, or click to browse. A 5-row preview appears.
5. Review the preview. Click **Import**.
6. The result screen shows Imported / Skipped / Total. Any row-level errors appear in a table with the row number, column name, bad value, and plain-English reason.
7. Fix errors in your sheet and re-upload — already-imported rows are skipped automatically (duplicate detection by name).

**Step-by-step (Google Sheets):**

1. Open your Google Sheet. Row 1 must contain the column headers shown in the modal.
2. Click **Share → General access → Anyone with the link (Viewer)**.
3. Copy the URL and paste it in the modal.
4. Click **Import**.

**Required columns per tab:**

| Tab | Required | Optional |
|---|---|---|
| Findings | name | category, description |
| Diagnoses | name | code, category, description |
| Treatments | name | cost, category, description |

---

### After Setup

All three catalogs can be mixed at any time — import from the library first, then add a few extras with Quick Entry. Changes take effect immediately in the treatment charting flow.

To delete an item, find it in the list and click the trash icon. Deletion is permanent. If you accidentally delete something, re-add it manually or re-import from the library.

---

### Common Questions

**Can I edit an item after adding it?**
Not from the Settings list currently — only deletion is available. Re-add with the corrected details or use Quick Entry to add the corrected version, then delete the old one.

**What if I import a duplicate?**
The library greyed-out items indicate what's already in your catalog. The bulk upload skips exact-name duplicates automatically. Quick Entry and "Add One" will return a duplicate error from the server if the name already exists.

**Does the library price match what I should charge?**
The default costs in the library are typical Indian market ranges for reference only. Always adjust prices to match your clinic's fee schedule before or after importing.
