# CLAUDE.md — DentalClinic_Demo

Dental Management System (DMS) for dentists. Covers appointments, treatment charting, patient history, CRM, inventory, invoicing, transactions, lab orders, and analytics reports.

---

## Tech Stack

### Backend (`dms_backend/`)
- **Node.js + Express.js** — REST API server (port 5000)
- **MongoDB Atlas** — via Mongoose ODM
- **Multer** — file uploads (temp dir `uploads/`)
- **googleapis** — Google Drive integration via OAuth2 refresh token
- **jsonwebtoken** — JWT-based authentication
- Entry: `dms_backend/index.js`
- Config: `dms_backend/config/db.js`

### Frontend (`frontend/`)
- **React 18 + Vite**
- **React Router v7** — client-side routing with protected routes
- **TailwindCSS** — utility-first styling, primary color `#137fec`, fonts Inter
- **Lucide React** — icons
- **Axios** — HTTP client via `frontend/src/services/api.js` (base: `http://localhost:5000/api`)
- **Recharts + Chart.js** — data visualization
- **React Modal** — modals

### WhatsApp Backend (`wa-backend/`)
- Separate service, not yet fully integrated

---

## Project Structure

```
DentalClinic_Demo/
├── dms_backend/
│   ├── index.js               # Express entry, CORS, routes, auth middleware wiring
│   ├── config/db.js           # Mongoose connect
│   ├── middleware/
│   │   └── auth.js            # JWT authenticate middleware
│   ├── services/
│   │   └── googleDrive.service.js  # Drive folder creation, file upload/delete/list
│   ├── models/                # 14 Mongoose models
│   ├── controllers/           # Business logic
│   ├── routes/                # API route definitions
│   └── seed.js                # Data seeding utility
├── frontend/
│   └── src/
│       ├── App.jsx            # Router setup with ProtectedRoute
│       ├── services/api.js    # Axios instance with JWT interceptor + 401 redirect
│       ├── Context/
│       │   ├── TreatmentContext.jsx   # Global treatment session state
│       │   └── AuthContext.jsx        # Auth state (token, user, login, logout)
│       ├── components/        # Layout, treatment board, report panels, inventory tabs
│       │   └── AppointmentTimeline.jsx  # Per-patient appointment history timeline
│       ├── modals/            # All modal components
│       │   └── RichTextEditorModal.jsx  # Rich text editor for notes/advice
│       └── pages/             # One file per page/feature
│           └── LoginPage.jsx  # Email/password login form
└── wa-backend/                # WhatsApp notification service
```

---

## Database Models (MongoDB Collections)

| Model | File | Key Fields |
|-------|------|-----------|
| Patient | `Patient.model.js` | patientId (auto "PID-001"), first_name, last_name, dob, gender, blood_group, contact{mobile,email,address,city}, emergency_contact, medical_history[], allergies[], reference_source, last_visit_date, total_due, dentition_type (Adult/Pedo/Mixed), drive_folders{root,clinical_notes,scans,photographs,lab_reports}, files[]{file_name,category,drive_file_id,web_view_link,mime_type,visit_id,uploaded_at} |
| User | `User.model.js` | name, email, password (plain text — no hashing yet), role (Doctor/Receptionist/Assistant), specialization, phone, is_active |
| Appointment | `Appointment.model.js` | patient_id, doctor_id, start_time, end_time, title, type, status (Scheduled/Confirmed/Checked In/In Progress/Completed/Cancelled/No Show), room_number, token_number, notes |
| Visit | `Visit.model.js` | patient_id, doctor_id, appointment_id, date, findings{soft_tissue[],tmj[],diagnosis_notes}, treatments[]{teeth_numbers,surfaces,treatment_name,cost,qty,status,consumables_used[]}, prescriptions[]{drug_name,dosage,duration,instructions}, consultation_notes[]{content(HTML),created_at}, advices[]{content(HTML),created_at} |
| Invoice | `Invoice.model.js` | invoice_id (auto "INV-2025-001"), patient_id, patient_name, patient_phone, items[]{item_id,name,type(Service/Pharmacy),quantity,rate,total}, subtotal, tax, total_amount, paid_amount, pending_amount (auto), payment_method, status (Draft/Pending/Paid/Overdue/Cancelled) |
| Transaction | `Transaction.model.js` | type (Income/Expense), category, amount, payment_method (Cash/Card/UPI/Bank Transfer/Cheque), date, party_name, invoice_id, vendor_id, notes |
| InventoryItem | `InventoryItem.model.js` | name, type (Pharmacy/Consumable/Asset), composition, manufacturer, category, stock_on_hand, min_stock_level, cost_price, selling_price, status (Good/Low/Critical/Out of Stock — auto-calculated) |
| InventoryLog | `InventoryLog.model.js` | item_id, type (Stock In/Stock Out), reason (Purchase/Treatment Usage/Sold to Patient/Expired/Adjustment/Return), quantity, reference_id, performed_by, date |
| Order | `Order.model.js` | vendor, category (Pharmacy/Consumable/General), order_date, due_date, items[]{item_id,item_name,qty,unit_cost,total_cost}, total_cost, status (Pending/Confirmed/Received/Cancelled) |
| Vendor | `Vendor.model.js` | name, type (Pharmacy/Consumable/Lab/General), contact_person, phone, email, address, gst_number |
| LabCatalogItem | `LabCatalogItem.model.js` | name, category, price, turnaround_time, preferred_vendor_id |
| LabOrder | `LabOrder.model.js` | patient_id, doctor_id, vendor_id (Lab), order_date, expected_delivery, items[]{item_name,shade,instructions,cost}, status (Sent/In Process/Received/Delivered to Patient), cost_to_clinic |
| Services | `Services.model.js` | name, cost, category, description, isActive |

---

## API Endpoints

All routes prefixed with `/api`. All routes except `/api/users/register` and `/api/users/login` require `Authorization: Bearer <token>` header.

### Auth / Users (`/api/users`)
- `POST /api/users/register` — public, creates user
- `POST /api/users/login` — public, returns `{ token, user }` (JWT, 8h expiry)
- `GET /api/users/doctors` — protected, active doctors for dropdowns
- `GET /api/users` — protected, all users

### Patients (`/api/patients`)
- `GET /api/patients?search=` — list/search by name, phone, patientId
- `POST /api/patients` — create (auto-generates patientId)
- `GET /api/patients/:id`
- `PUT /api/patients/:id`
- `DELETE /api/patients/:id`

### Appointments (`/api/appointments`)
- `GET /api/appointments?date=YYYY-MM-DD` — filter by date (default today)
- `GET /api/appointments/patient/:patientId` — all appointments for a patient (sorted ascending)
- `POST /api/appointments`
- `PATCH /api/appointments/:id/status`
- `PUT /api/appointments/:id`

### Visits (`/api/visits`)
- `POST /api/visits` — creates visit, updates patient.last_visit_date
- `GET /api/visits`
- `GET /api/visits/:id`
- `GET /api/visits/patient/:id` — full patient history
- `PATCH /api/visits/:visitId/treatments/:treatmentId/status`
- `POST /api/visits/patient/:patientId/note` — add consultation note (auto find/create today's visit)
- `POST /api/visits/patient/:patientId/advice` — add advice (auto find/create today's visit)
- `PATCH /api/visits/:visitId/notes/:noteId` — edit existing consultation note
- `PATCH /api/visits/:visitId/advices/:adviceId` — edit existing advice

### Files (`/api/files`)
- `POST /api/files/upload` — multipart upload (fields: file, patient_id, category, visit_id?); uploads to Google Drive subfolder, stores record on Patient
- `GET /api/files/patient/:patientId` — list patient files grouped by category
- `DELETE /api/files/:fileRecordId` — delete from Drive + patient record (body: `{ patient_id }`)
- `POST /api/files/setup-folder/:patientId` — manually create Drive folders for existing patient

### Google Drive OAuth (root, not `/api`)
- `GET /auth/google` — browser redirect to Google consent screen (one-time setup)
- `GET /auth/google/callback` — receives code, prints `GOOGLE_REFRESH_TOKEN` to browser

### Inventory (`/api/inventory`)
- `GET /api/inventory` — stock with usage aggregation
- `POST /api/inventory`
- `PUT /api/inventory/:id` — status auto-calculated on save
- `DELETE /api/inventory/:id`
- `POST /api/inventory/adjust` — manual stock adjustment + creates log
- `GET /api/inventory/logs`
- `POST /api/inventory/orders`
- `GET /api/inventory/orders`
- `PUT /api/inventory/orders/:id` — auto-deducts inventory when status = "Received"

### Invoices & Transactions
- `GET /api/invoices`
- `GET /api/invoices/:id`
- `POST /api/invoices` — deducts pharmacy inventory, creates transaction
- `PUT /api/invoices/:id`
- `GET /api/transactions`
- `POST /api/transactions`

### Labs
- `GET /api/labs/orders`
- `POST /api/labs/orders`
- `PATCH /api/labs/orders/:id`
- `GET /api/labs/items`
- `POST /api/labs/items`

### Vendors
- `GET /api/vendors`
- `POST /api/vendors`
- `PUT /api/vendors/:id`
- `DELETE /api/vendors/:id`

### Services
- `GET /api/services` — active only
- `POST /api/services`
- `PUT /api/services/:id`

---

## Frontend Pages & Components

### Pages (`frontend/src/pages/`)

| Page | File | Description |
|------|------|-------------|
| Login | `LoginPage.jsx` | Email/password login form, calls `/api/users/login`, stores token in localStorage |
| Appointments | `AppointmentsPage.jsx` | List + Calendar view, status actions, "Start Visit" triggers TreatmentContext |
| Patients | `PatientsPage.jsx` | Directory table, search with debounce, view profile modal, add patient |
| Treatment | `Treatmentpage.jsx` | Patient card, clinical history, dental chart tabs, treatment plan board, prescriptions, lab orders, notes |
| Invoice | `InvoicePage.jsx` | Invoice list, create with live patient search, service/medicine selection, payment recording |
| Transactions | `TransactionsPage.jsx` | Statement/Income/Expense tabs, date range filters, KPI cards |
| Lab Orders | `LabOrdersPage.jsx` | Lab orders, catalog, vendor labs; create/edit modals; CSV export |
| Inventory | `InventoryPage.jsx` | 5 tabs: Stock Overview, Purchase Orders, Item List, Logs, Vendors |
| Reports | `ReportsPage.jsx` | 17 report types via left sidebar, date range filters, charts |

### Key Components (`frontend/src/components/`)

- `NavigationLayout.jsx` — sidebar + header + main layout wrapper
- `AppointmentTimeline.jsx` — per-patient appointment history; groups into past (dimmed) / next upcoming (highlighted) / later upcoming; embeds NewAppointmentModal
- `TreatmentPlanBoard.jsx` — treatment plan display (Planned/In Progress/Completed)
- `TreatmentTabs.jsx` — dental chart tab interface
- `GlobalTreatmentOverlay.jsx` — minimizable floating treatment session window
- `ReportSummary.jsx`, `ReportFinancials.jsx`, `ReportClinical.jsx`, `ReportPatients.jsx`, `ReportInventory.jsx`, `ReportNotesSection.jsx` — report panel components
- `InventoryStocks.jsx`, `InventoryItems.jsx`, `InventoryLogs.jsx`, `InventoryOrders.jsx`, `InventoryVendors.jsx` — inventory tab components

### Modals (`frontend/src/modals/`)

- `NewAppointmentModal.jsx` — create/edit appointments
- `PatientProfileModal.jsx` — view patient details
- `AddPatientModal.jsx` — quick patient registration
- `CashTransactionModal.jsx` — record cash transactions
- `AddTreatmentModal.jsx` — add treatment to plan
- `RichTextEditorModal.jsx` — rich text editor (bold/italic/underline/lists/font size) for consultation notes and advice; `type='note'|'advice'`

### Global State (`frontend/src/Context/`)

**TreatmentContext.jsx** — manages the active treatment session across pages:
- `activeTreatment` — `{id, minimized}`
- `startTreatment(id)`, `minimizeTreatment()`, `maximizeTreatment()`, `closeTreatment()`
- Used by `GlobalTreatmentOverlay` and `AppointmentsPage`

**AuthContext.jsx** — manages auth state:
- `token`, `user`, `isAuthenticated`
- `login(token, userData)` — persists to localStorage
- `logout()` — clears localStorage
- Used by `App.jsx` (`ProtectedRoute`) and `LoginPage`

---

## Core Business Workflows

1. **Authentication**: User visits app → redirected to `/login` if no token → logs in → JWT stored in localStorage → all API calls attach `Authorization: Bearer <token>` → 401 auto-redirects to `/login`
2. **Appointment → Treatment**: Appointments page → "Start Visit" → TreatmentContext → GlobalTreatmentOverlay (minimizable) → Treatmentpage (full dental chart + plan)
3. **Consultation Notes / Advice**: Treatmentpage → open RichTextEditorModal (type='note' or 'advice') → save → `POST /api/visits/patient/:id/note` or `/advice` (auto-creates today's visit if none exists)
4. **Patient Registration**: PatientsPage (Add button) or InvoicePage (live patient search, auto-create if not found)
5. **File Uploads**: Upload file via `/api/files/upload` → auto-creates Google Drive patient folder on first upload → stores drive_file_id + web_view_link on Patient.files[]
6. **Invoice Creation**: InvoicePage → search patient → add services/medicines → set quantities → record payment → auto-deducts pharmacy inventory + creates transaction
7. **Inventory Restocking**: InventoryPage → create Purchase Order → mark as Received → auto-increments stock + creates audit log
8. **Reporting**: ReportsPage → select report type → set date range → view charts/tables

---

## Known Gaps / Incomplete Features

- **Password Hashing**: Login compares plain text passwords — bcrypt not implemented yet
- **Google Drive Setup**: Requires one-time OAuth flow (`/auth/google`) to obtain `GOOGLE_REFRESH_TOKEN`; `credentials.json` file present but service-account flow replaced by OAuth2
- **WhatsApp Integration**: `wa-backend/` exists, not connected to invoice/appointment flows
- **Promotions Page**: Route placeholder, no implementation
- **Settings Page**: Route placeholder, no implementation
- **Dark Mode Toggle**: TailwindCSS dark mode configured but no UI toggle
- **Recall / Follow-up**: Report type listed in ReportsPage but logic incomplete
- **Mobile Responsiveness**: Partial — some modals and tables may break on small screens
- **Dentition Chart**: Dental chart tab UI exists, interactive tooth selection may need completion

---

## Environment Variables

### Backend (`dms_backend/.env`)
```
PORT=5000
NODE_ENV=development
MONGO_URI=                    # MongoDB Atlas connection string
JWT_SECRET=                   # Secret for signing JWTs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_DRIVE_FOLDER_ID=       # Root Drive folder for all patient folders
GOOGLE_REFRESH_TOKEN=         # Obtained via /auth/google one-time OAuth flow
```

### Frontend
- No `.env` file — API base URL hardcoded in `frontend/src/services/api.js` as `http://localhost:5000/api`

---

## Development Notes

- Backend runs on port **5000**, frontend on **5173** (Vite default)
- All routes except `/api/users/register` and `/api/users/login` are protected by JWT middleware (`middleware/auth.js`). `req.user` is set to `{ id, role, name }` after successful auth.
- `api.js` Axios interceptor auto-attaches the token from `localStorage` (`dms_token`) and redirects to `/login` on any 401 response
- Google Drive uses OAuth2 refresh token (not service account). Run `GET /auth/google` in browser once to get the refresh token, then add it to `.env` as `GOOGLE_REFRESH_TOKEN`
- Patient Drive folders are created lazily on first file upload (4 subfolders: Clinical Notes, Scans, Photographs, Lab Reports)
- Visit consultation notes and advices use rich HTML stored as-is from `contentEditable`. Each note/advice is a subdocument with its own `_id` and `created_at`
- `getOrCreateTodayVisit` in visit controller auto-finds or creates a Visit for today when adding notes/advices — no need to manually create a visit first
- Invoice creation has side effects: deducts pharmacy inventory + creates a transaction record
- Inventory item status (Good/Low/Critical/Out of Stock) is auto-calculated in a pre-save hook based on `stock_on_hand` vs `min_stock_level`
- Patient `last_visit_date` is updated automatically when a Visit is created
- `invoice_id` and `patientId` are auto-incremented strings (not ObjectId) — logic is in the controller
- `seed.js` can populate the DB with test data
