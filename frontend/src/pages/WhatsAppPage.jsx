import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { WAHA_BASE_URL, WAHA_API_KEY } from "../config/env.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "mr", label: "Marathi", flag: "🟠" },
];

const EVENTS = [
  {
    key: "appointmentBooked",
    label: "Appointment Booked",
    description: "Sent when a new appointment is scheduled",
    icon: "calendar_add_on",
    color: "blue",
    variables: [
      "name",
      "firstName",
      "date",
      "time",
      "doctorName",
      "appointmentType",
    ],
    allowedContentTypes: ["text"],
  },
  {
    key: "appointmentReminder",
    label: "Appointment Reminder",
    description: "Reminder sent X hours before appointment",
    icon: "alarm",
    color: "indigo",
    variables: ["name", "firstName", "date", "time", "doctorName"],
    allowedContentTypes: ["text"],
  },
  {
    key: "appointmentRescheduled",
    label: "Appointment Rescheduled",
    description: "Sent when an appointment is rescheduled to new time",
    icon: "edit_calendar",
    color: "amber",
    variables: [
      "name",
      "firstName",
      "date",
      "time",
      "doctorName",
      "appointmentType",
    ],
    allowedContentTypes: ["text"],
  },
  {
    key: "treatmentCompleted",
    label: "Treatment Completed",
    description: "Sent immediately when a treatment is marked done",
    icon: "medical_services",
    color: "orange",
    variables: [
      "name",
      "firstName",
      "treatment",
      "teethNumbers",
      "date",
      "doctorName",
    ],
    allowedContentTypes: ["text"],
  },
  {
    key: "feedbackMessage",
    label: "Feedback Message",
    description: "Send text/image/video feedback after appointment completion",
    icon: "feedback",
    color: "teal",
    variables: ["name", "firstName", "date", "doctorName"],
    allowedContentTypes: ["text"],
  },
  {
    key: "feedbackPoll",
    label: "Feedback Poll",
    description: "Send 1-5 rating poll survey after appointment completion",
    icon: "poll",
    color: "cyan",
    variables: ["name", "firstName", "date", "doctorName"],
    isFeedbackPoll: true,
    allowedContentTypes: ["poll"],
  },
  {
    key: "postCare",
    label: "Post-Care Journey",
    description: "Up to 3 scheduled messages after treatment completion",
    icon: "healing",
    color: "rose",
    variables: [
      "name",
      "firstName",
      "treatment",
      "teethNumbers",
      "date",
      "doctorName",
    ],
    isJourney: true,
    allowedContentTypes: ["text"],
  },
];

const COLOR_MAP = {
  blue: {
    card: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
  },
  green: {
    card: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-900/40",
  },
  purple: {
    card: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    icon: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
  },
  orange: {
    card: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    icon: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
  },
  amber: {
    card: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  cyan: {
    card: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800",
    icon: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
  },
  teal: {
    card: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
    icon: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/40",
  },
  rose: {
    card: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
    icon: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
  },
  indigo: {
    card: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    icon: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
  },
  violet: {
    card: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
    icon: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
  },
};

const CONTENT_TYPES = [
  {
    type: "text",
    label: "Text",
    icon: "text_fields",
    desc: "Plain message with variables",
  },
  {
    type: "image",
    label: "Image",
    icon: "image",
    desc: "Photo with optional caption",
  },
  {
    type: "video",
    label: "Video",
    icon: "videocam",
    desc: "Video with optional caption",
  },
  {
    type: "document",
    label: "Document",
    icon: "description",
    desc: "PDF, DOCX, etc.",
  },
  {
    type: "audio",
    label: "Audio",
    icon: "mic",
    desc: "Voice note or audio file",
  },
  {
    type: "location",
    label: "Location",
    icon: "location_on",
    desc: "Clinic address pin",
  },
  { type: "poll", label: "Poll", icon: "poll", desc: "Survey / feedback poll" },
];

const ACCEPT_MAP = {
  image: "image/*",
  video: "video/*",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx",
  audio: "audio/*",
  sticker: "image/webp",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const TIPS = [
  {
    title: "Always include a do-not-reply instruction",
    content: "Add 'do not reply' or 'for queries, call {{clinicNumber}}' in messages to manage patient expectations and avoid confusion.",
  },
  {
    title: "Tailor feedback responses by rating",
    content: "If ratings ≥ 3, send a Google Maps link to your clinic. If < 3, send an apology message with an invitation to discuss concerns.",
  },
  {
    title: "Avoid duplicate completion messages",
    content: "If you want to send a feedback message at appointment completion, disable the treatment completed message to avoid redundancy.",
  },
];

const SAMPLE_DATA = {
  name: "Priya Mehta",
  firstName: "Priya",
  date: "24 Apr 2026",
  time: "10:30 AM",
  doctorName: "Dr. Kapoor",
  appointmentType: "Consultation",
  invoiceId: "INV-2026-042",
  amount: "₹2,500",
  paidAmount: "₹2,000",
  pendingAmount: "₹500",
  paymentMethod: "Cash",
  treatment: "Root Canal",
  teethNumbers: "11, 12",
  drug: "Amoxicillin 500mg",
  dosage: "1 tablet twice daily",
  duration: "5 days",
  instructions: "Take after meals",
  prescriptionUrl: "https://res.cloudinary.com/.../prescription-123.pdf",
};

function replacePlaceholders(str) {
  if (typeof str !== "string") return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE_DATA[k] ?? `{{${k}}}`);
}

const MAX_CONTENT_SIZE = 5 * 1024 * 1024;

// ─── WhatsApp text formatter ──────────────────────────────────────────────────
// Parses WhatsApp markdown into React elements.
// Supports: *bold*, _italic_, ~strikethrough~, `monospace`, line breaks.
// Emojis are plain Unicode — already render correctly in browsers.

function parseWAInline(text) {
  // Order matters: monospace first (no nesting), then bold, italic, strikethrough
  const rules = [
    {
      re: /`([^`]+)`/g,
      wrap: (s, i) => (
        <code
          key={i}
          className="font-mono bg-black/10 dark:bg-white/10 px-0.5 rounded text-[0.9em]"
        >
          {s}
        </code>
      ),
    },
    {
      re: /\*([^*]+)\*/g,
      wrap: (s, i) => (
        <strong key={i} className="font-bold">
          {s}
        </strong>
      ),
    },
    {
      re: /_([^_]+)_/g,
      wrap: (s, i) => (
        <em key={i} className="italic">
          {s}
        </em>
      ),
    },
    {
      re: /~([^~]+)~/g,
      wrap: (s, i) => (
        <span key={i} className="line-through">
          {s}
        </span>
      ),
    },
  ];

  // Apply rules sequentially by splitting on each pattern
  let parts = [text];

  for (const { re, wrap } of rules) {
    const next = [];
    for (const part of parts) {
      if (typeof part !== "string") {
        next.push(part);
        continue;
      }
      let lastIndex = 0;
      let match;
      re.lastIndex = 0;
      while ((match = re.exec(part)) !== null) {
        if (match.index > lastIndex)
          next.push(part.slice(lastIndex, match.index));
        next.push(wrap(match[1], `${match.index}-${re.lastIndex}`));
        lastIndex = re.lastIndex;
      }
      if (lastIndex < part.length) next.push(part.slice(lastIndex));
    }
    parts = next;
  }

  return parts;
}

// Tips toolbar component — displays best practices with vertical scrolling
function TipsToolbar() {
  const [showTips, setShowTips] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowTips(!showTips)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">lightbulb</span>
        <span className="text-sm font-medium">Best Practices</span>
      </button>

      {showTips && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="h-60 overflow-y-auto space-y-0">
            {TIPS.map((tip, idx) => (
              <div
                key={idx}
                className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  {idx + 1}. {tip.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {tip.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Renders a full WA text body: splits on \n, applies inline formatting per line
function WAText({ text }) {
  if (!text)
    return (
      <span className="text-slate-400 italic text-sm">Message preview…</span>
    );

  const withVars = replacePlaceholders(text);
  const lines = withVars.split("\n");

  return (
    <span className="text-sm text-slate-800 dark:text-white leading-relaxed break-words">
      {lines.map((line, i) => (
        <span key={i}>
          {parseWAInline(line)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${value ? "bg-[#137fec]" : "bg-slate-300 dark:bg-slate-600"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

function VariableChips({ variables, onInsert }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-xs text-slate-400 self-center">Insert:</span>
      {variables.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(v)}
          className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-[#137fec] font-mono border border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
        >
          {`{{${v}}}`}
        </button>
      ))}
    </div>
  );
}

function TextareaWithVars({
  value,
  onChange,
  variables,
  placeholder,
  rows = 5,
}) {
  const ref = useRef(null);
  function insert(varName) {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart,
      e = el.selectionEnd;
    const tag = `{{${varName}}}`;
    const next = value.slice(0, s) + tag + value.slice(e);
    onChange(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(s + tag.length, s + tag.length);
    }, 0);
  }
  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec] resize-none"
      />
      <VariableChips variables={variables} onInsert={insert} />
    </div>
  );
}

// ─── Media uploader (returns uploaded media object) ───────────────────────────

function MediaUploader({
  accept,
  label,
  currentUrl,
  currentName,
  onUploaded,
  eventKey,
  lang,
  contentType,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > MAX_CONTENT_SIZE) {
      setError("File exceeds 5 MB limit.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tags", `whatsapp,${eventKey},${lang},${contentType}`);
      const res = await api.post("/whatsapp/media", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
        {label}{" "}
        <span className="normal-case font-normal text-slate-400">
          (max 5 MB)
        </span>
      </label>
      {currentUrl ? (
        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {contentType === "image" ? (
            <img
              src={currentUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <span className="material-symbols-outlined text-slate-400 flex-shrink-0">
              attach_file
            </span>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">
            {currentName || currentUrl}
          </p>
          <button
            type="button"
            onClick={() => onUploaded(null)}
            className="text-slate-400 hover:text-red-500"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ) : (
        <label
          className={`flex items-center gap-2 p-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploading ? "border-blue-300 bg-blue-50 dark:bg-blue-900/10" : "border-slate-300 dark:border-slate-600 hover:border-[#137fec] hover:bg-blue-50/50"}`}
        >
          <span
            className={`material-symbols-outlined text-sm ${uploading ? "text-blue-500" : "text-slate-400"}`}
          >
            {uploading ? "hourglass_empty" : "upload"}
          </span>
          <span className="text-xs text-slate-500">
            {uploading ? "Uploading…" : "Click to upload"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Content-type-specific editor panels ─────────────────────────────────────

function TextEditor({ content, onChange, variables }) {
  return (
    <div className="space-y-2">
      <TextareaWithVars
        value={content.text || ""}
        onChange={(v) => onChange({ ...content, text: v })}
        variables={variables}
        placeholder="Type your message here…"
        rows={6}
      />
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 dark:text-slate-500">
        <span>
          <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">
            *bold*
          </span>{" "}
          bold
        </span>
        <span>
          <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">
            _italic_
          </span>{" "}
          italic
        </span>
        <span>
          <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">
            ~strike~
          </span>{" "}
          strikethrough
        </span>
        <span>
          <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">
            `code`
          </span>{" "}
          monospace
        </span>
        <span>Enter = new line · emojis ✅ supported</span>
      </div>
    </div>
  );
}

function ImageEditor({ content, onChange, variables, eventKey, lang }) {
  return (
    <div className="space-y-3">
      <MediaUploader
        accept="image/*"
        label="Image"
        currentUrl={content.url}
        currentName={content._fileName}
        onUploaded={(m) =>
          onChange(
            m
              ? {
                  ...content,
                  url: m.url,
                  mimetype: m.mimeType,
                  _fileName: m.fileName,
                }
              : { ...content, url: "", _fileName: "" },
          )
        }
        eventKey={eventKey}
        lang={lang}
        contentType="image"
      />
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Caption (optional)
        </label>
        <TextareaWithVars
          value={content.caption || ""}
          onChange={(v) => onChange({ ...content, caption: v })}
          variables={variables}
          placeholder="Add caption…"
          rows={3}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={content.viewOnce || false}
          onChange={(e) => onChange({ ...content, viewOnce: e.target.checked })}
          className="accent-[#137fec]"
        />
        View once
      </label>
    </div>
  );
}

function VideoEditor({ content, onChange, variables, eventKey, lang }) {
  return (
    <div className="space-y-3">
      <MediaUploader
        accept="video/*"
        label="Video"
        currentUrl={content.url}
        currentName={content._fileName}
        onUploaded={(m) =>
          onChange(
            m
              ? {
                  ...content,
                  url: m.url,
                  mimetype: m.mimeType || "video/mp4",
                  _fileName: m.fileName,
                }
              : { ...content, url: "", _fileName: "" },
          )
        }
        eventKey={eventKey}
        lang={lang}
        contentType="video"
      />
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Caption (optional)
        </label>
        <TextareaWithVars
          value={content.caption || ""}
          onChange={(v) => onChange({ ...content, caption: v })}
          variables={variables}
          placeholder="Add caption…"
          rows={3}
        />
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={content.gifPlayback || false}
            onChange={(e) =>
              onChange({ ...content, gifPlayback: e.target.checked })
            }
            className="accent-[#137fec]"
          />
          Loop as GIF
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={content.ptv || false}
            onChange={(e) => onChange({ ...content, ptv: e.target.checked })}
            className="accent-[#137fec]"
          />
          Video note (circle)
        </label>
      </div>
    </div>
  );
}

function DocumentEditor({ content, onChange, variables, eventKey, lang }) {
  return (
    <div className="space-y-3">
      <MediaUploader
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        label="Document"
        currentUrl={content.url}
        currentName={content.fileName}
        onUploaded={(m) =>
          onChange(
            m
              ? {
                  ...content,
                  url: m.url,
                  mimetype: m.mimeType || "application/pdf",
                  fileName: m.fileName,
                }
              : { ...content, url: "", fileName: "" },
          )
        }
        eventKey={eventKey}
        lang={lang}
        contentType="document"
      />
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          File name shown to recipient
        </label>
        <input
          type="text"
          value={content.fileName || ""}
          onChange={(e) => onChange({ ...content, fileName: e.target.value })}
          placeholder="Invoice_April.pdf"
          className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Caption (optional)
        </label>
        <TextareaWithVars
          value={content.caption || ""}
          onChange={(v) => onChange({ ...content, caption: v })}
          variables={variables}
          placeholder="Your invoice for {{date}}…"
          rows={3}
        />
      </div>
    </div>
  );
}

function AudioEditor({ content, onChange, eventKey, lang }) {
  return (
    <div className="space-y-3">
      <MediaUploader
        accept="audio/*"
        label="Audio file"
        currentUrl={content.url}
        currentName={content._fileName}
        onUploaded={(m) =>
          onChange(
            m
              ? {
                  ...content,
                  url: m.url,
                  mimetype: m.mimeType || "audio/ogg; codecs=opus",
                  _fileName: m.fileName,
                }
              : { ...content, url: "", _fileName: "" },
          )
        }
        eventKey={eventKey}
        lang={lang}
        contentType="audio"
      />
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={content.ptt || false}
          onChange={(e) => onChange({ ...content, ptt: e.target.checked })}
          className="accent-[#137fec]"
        />
        Send as voice note (push-to-talk waveform)
      </label>
    </div>
  );
}

function LocationEditor({ content, onChange, variables }) {
  const f = (field, val) => onChange({ ...content, [field]: val });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={content.degreesLatitude || ""}
            onChange={(e) => f("degreesLatitude", parseFloat(e.target.value))}
            placeholder="19.0760"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={content.degreesLongitude || ""}
            onChange={(e) => f("degreesLongitude", parseFloat(e.target.value))}
            placeholder="72.8777"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Location name
        </label>
        <TextareaWithVars
          value={content.name || ""}
          onChange={(v) => f("name", v)}
          variables={variables}
          placeholder="Smile Dental Clinic"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Address
        </label>
        <input
          type="text"
          value={content.address || ""}
          onChange={(e) => f("address", e.target.value)}
          placeholder="123 Main St, Mumbai"
          className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
        />
      </div>
    </div>
  );
}

function PollEditor({ content, onChange, variables }) {
  const setName = (v) => onChange({ ...content, name: v });
  const setCount = (v) => onChange({ ...content, selectableCount: Number(v) });
  const setOption = (i, v) => {
    const vals = [...(content.values || [])];
    vals[i] = v;
    onChange({ ...content, values: vals });
  };
  const addOption = () =>
    onChange({ ...content, values: [...(content.values || []), ""] });
  const delOption = (i) => {
    const vals = (content.values || []).filter((_, idx) => idx !== i);
    onChange({ ...content, values: vals });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Poll question
        </label>
        <TextareaWithVars
          value={content.name || ""}
          onChange={setName}
          variables={variables}
          placeholder="Rate your experience today"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Options
        </label>
        <div className="space-y-2">
          {(content.values || [""]).map((val, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={val}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
              />
              {(content.values || []).length > 2 && (
                <button
                  type="button"
                  onClick={() => delOption(i)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <span className="material-symbols-outlined text-sm">
                    close
                  </span>
                </button>
              )}
            </div>
          ))}
          {(content.values || []).length < 12 && (
            <button
              type="button"
              onClick={addOption}
              className="text-xs text-[#137fec] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span> Add
              option
            </button>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Selectable answers
        </label>
        <select
          value={content.selectableCount || 1}
          onChange={(e) => setCount(e.target.value)}
          className="w-32 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} choice{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── WhatsApp preview per content type ───────────────────────────────────────

function WAPreview({ contentType, content }) {
  const c = content || {};
  return (
    <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[90%] shadow-sm ml-auto">
      {contentType === "text" && (
        <p className="break-words">
          <WAText text={c.text} />
        </p>
      )}

      {contentType === "image" && (
        <div>
          {c.url ? (
            <img
              src={c.url}
              alt=""
              className="rounded-xl max-h-40 w-full object-cover mb-1.5"
            />
          ) : (
            <div className="w-full h-28 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-slate-400 text-3xl">
                image
              </span>
            </div>
          )}
          {c.caption && (
            <p className="break-words">
              <WAText text={c.caption} />
            </p>
          )}
        </div>
      )}

      {contentType === "video" && (
        <div>
          <div className="w-full h-28 rounded-xl bg-slate-800 flex items-center justify-center mb-1.5 relative overflow-hidden">
            <span className="material-symbols-outlined text-white text-4xl opacity-80">
              play_circle
            </span>
            {c.url && (
              <p className="absolute bottom-1.5 left-2 text-white text-[9px] opacity-70 truncate max-w-[90%]">
                {c._fileName || "video"}
              </p>
            )}
          </div>
          {c.caption && (
            <p className="break-words">
              <WAText text={c.caption} />
            </p>
          )}
        </div>
      )}

      {contentType === "document" && (
        <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-xl p-2.5 min-w-[160px]">
          <span className="material-symbols-outlined text-red-500 text-2xl flex-shrink-0">
            description
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {c.fileName || "document.pdf"}
            </p>
            {c.caption && (
              <p className="text-[10px] text-slate-500 break-words">
                <WAText text={c.caption} />
              </p>
            )}
          </div>
        </div>
      )}

      {contentType === "audio" && (
        <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-xl p-2.5 min-w-[160px]">
          <div className="w-8 h-8 rounded-full bg-[#137fec] flex items-center justify-center flex-shrink-0">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: 16 }}
            >
              {c.ptt ? "mic" : "music_note"}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-0.5 mb-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-[#137fec] opacity-60"
                  style={{ height: `${6 + Math.sin(i * 1.2) * 5}px` }}
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              {c.ptt ? "Voice note" : "Audio"} · 0:15
            </p>
          </div>
        </div>
      )}

      {contentType === "location" && (
        <div className="min-w-[160px]">
          <div className="w-full h-28 rounded-xl overflow-hidden mb-1.5 relative bg-[#e8f5e9]">
            {/* Simple map-like grid */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(#c8e6c9 1px,transparent 1px),linear-gradient(90deg,#c8e6c9 1px,transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <span className="material-symbols-outlined text-red-500 text-3xl drop-shadow">
                  location_on
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {c.name || "Clinic Location"}
          </p>
          {c.address && (
            <p className="text-[10px] text-slate-500 mt-0.5">{c.address}</p>
          )}
        </div>
      )}

      {contentType === "poll" && (
        <div className="min-w-[180px]">
          <div className="flex items-start gap-1.5 mb-2">
            <span
              className="material-symbols-outlined text-[#137fec] flex-shrink-0"
              style={{ fontSize: 16 }}
            >
              bar_chart
            </span>
            <p className="text-sm font-semibold text-slate-800 dark:text-white break-words">
              <WAText text={c.name || "Poll question"} />
            </p>
          </div>
          <div className="space-y-1.5">
            {(c.values?.length ? c.values : ["Option 1", "Option 2"])
              .filter(Boolean)
              .map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white/60 dark:bg-white/10 rounded-lg px-2.5 py-1.5"
                >
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {v}
                  </span>
                </div>
              ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Select {c.selectableCount || 1} ·{" "}
            {c.values?.filter(Boolean).length || 2} options
          </p>
        </div>
      )}
      <p className="text-[9px] text-right text-slate-500 dark:text-[#8696a0] mt-1">
        {new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        <span className="text-blue-400">✓✓</span>
      </p>
    </div>
  );
}

// ─── WhatsApp phone mockup (sticky sidebar) ───────────────────────────────────

function PhonePreview({ contentType, content }) {
  return (
    <div className="rounded-[2rem] overflow-hidden border-4 border-slate-800 dark:border-slate-600 shadow-2xl bg-slate-800 dark:bg-slate-600 w-full max-w-[280px] mx-auto">
      {/* Status bar */}
      <div className="bg-slate-900 flex items-center justify-between px-4 py-1.5">
        <span className="text-white text-[10px]">9:41</span>
        <div className="flex gap-1 items-center">
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: 11 }}
          >
            signal_cellular_alt
          </span>
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: 11 }}
          >
            wifi
          </span>
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: 11 }}
          >
            battery_full
          </span>
        </div>
      </div>
      {/* WA header */}
      <div className="bg-[#075e54] px-3 py-2.5 flex items-center gap-2.5">
        <button type="button" className="text-white opacity-80">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            arrow_back
          </span>
        </button>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: 16 }}
          >
            storefront
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">
            Smile Clinic
          </p>
          <p className="text-green-300 text-[10px] leading-tight">online</p>
        </div>
        <div className="flex gap-2 text-white opacity-80">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            videocam
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            call
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-[#e5ddd5] dark:bg-[#0d1418] px-3 py-4 min-h-[280px] flex flex-col gap-2">
        {/* Date chip */}
        <div className="self-center bg-white/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 text-[10px] px-2.5 py-0.5 rounded-full">
          TODAY
        </div>

        {/* Incoming stub */}
        <div className="self-start max-w-[80%]">
          <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Hi, confirming my appointment 🦷
            </p>
            <p className="text-[9px] text-right text-slate-400 mt-0.5">
              9:40 AM
            </p>
          </div>
        </div>

        {/* Outgoing: clinic's template */}
        <div className="self-end max-w-[85%]">
          <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm">
            <WAPreview contentType={contentType} content={content} />
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-[#f0f2f5] dark:bg-[#1f2c34] px-2 py-2 flex items-center gap-2">
        <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-3 py-1.5 flex items-center gap-1">
          <span
            className="material-symbols-outlined text-slate-400"
            style={{ fontSize: 15 }}
          >
            mood
          </span>
          <span className="text-[11px] text-slate-400 flex-1">
            Type a message
          </span>
          <span
            className="material-symbols-outlined text-slate-400"
            style={{ fontSize: 15 }}
          >
            attach_file
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#075e54] flex items-center justify-center flex-shrink-0">
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: 15 }}
          >
            mic
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Single-language editor ───────────────────────────────────────────────────

// ─── Feedback Poll Editor (poll type only) ──────────────────────────────────

function FeedbackPollLangEditor({
  lang,
  event,
  template,
  onSaved,
  defaultRatingOptions,
}) {
  const [content, setContent] = useState(
    template?.content || { values: defaultRatingOptions },
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent(template?.content || { values: defaultRatingOptions });
  }, [template?._id, lang, defaultRatingOptions]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        event: event.key,
        language: lang,
        contentType: "poll",
        content: {
          name: content.name || "",
          values: content.values || defaultRatingOptions,
          selectableCount: 1,
        },
        isActive: true,
      };
      let saved;
      if (template?._id) {
        saved = (await api.put(`/whatsapp/templates/${template._id}`, payload))
          .data;
      } else {
        saved = (await api.post("/whatsapp/templates", payload)).data;
      }
      onSaved(lang, saved);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const isValid = () => !!content.name?.trim();
  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
      {/* ── Left: poll editor ── */}
      <div className="space-y-5">
        {/* Type pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-base text-slate-500">
              poll
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Poll
            </span>
          </div>
          <span className="text-xs text-slate-400">(Fixed for feedback)</span>
        </div>

        {/* Poll question editor */}
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Poll question
              </label>
              <textarea
                value={content.name || ""}
                onChange={(e) =>
                  setContent({ ...content, name: e.target.value })
                }
                placeholder="How satisfied are you with your treatment?"
                rows={2}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Rating options (fixed)
              </label>
              <div className="space-y-2">
                {(content.values || defaultRatingOptions).map((val, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300"
                  >
                    {val}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                These 5 rating options are standardized for all feedback polls.
              </p>
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isValid()}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-colors bg-[#137fec] text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200 dark:shadow-none"
        >
          {saving
            ? "Saving…"
            : template
              ? "✓ Update template"
              : "Save template"}
        </button>

        {template && (
          <p className="text-center text-xs text-green-600 dark:text-green-400">
            ✓ Template saved — last updated{" "}
            {new Date(template.updatedAt).toLocaleDateString("en-IN")}
          </p>
        )}
      </div>

      {/* ── Right: poll preview ── */}
      <div className="lg:sticky lg:top-6">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-center mb-3">
          Preview — {langLabel}
        </p>
        <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm">
          {content.name ? (
            <p className="text-sm text-slate-800 dark:text-white mb-2">
              <strong>{content.name}</strong>
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic mb-2">
              Poll question will appear here
            </p>
          )}
          <div className="space-y-1.5">
            {(content.values || defaultRatingOptions).map((val, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-1.5 rounded-lg bg-white/50 dark:bg-black/20 text-xs text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-black/30 transition-colors"
              >
                {val}
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Interactive poll message
        </p>
      </div>
    </div>
  );
}

// ─── Generic LangEditor (for other event types) ──────────────────────────────

function LangEditor({ lang, event, template, onSaved }) {
  const existingType = template?.contentType || null;
  const [selectedType, setSelectedType] = useState(existingType);
  const [content, setContent] = useState(template?.content || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedType(template?.contentType || null);
    setContent(template?.content || {});
  }, [template?._id, lang]);

  function handleTypeSelect(type) {
    setSelectedType(type);
    setContent({});
  }

  async function handleSave() {
    if (!selectedType) return;
    setSaving(true);
    try {
      const payload = {
        event: event.key,
        language: lang,
        contentType: selectedType,
        content,
        isActive: true,
      };
      let saved;
      if (template?._id) {
        saved = (await api.put(`/whatsapp/templates/${template._id}`, payload))
          .data;
      } else {
        saved = (await api.post("/whatsapp/templates", payload)).data;
      }
      onSaved(lang, saved);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const isValid = () => {
    if (!selectedType) return false;
    switch (selectedType) {
      case "text":
        return !!content.text?.trim();
      case "image":
        return !!content.url;
      case "video":
        return !!content.url;
      case "document":
        return !!content.url;
      case "audio":
        return !!content.url;
      case "location":
        return !!(content.degreesLatitude && content.degreesLongitude);
      case "poll":
        return !!(
          content.name?.trim() &&
          (content.values || []).filter(Boolean).length >= 2
        );
      default:
        return true;
    }
  };

  const ctInfo = CONTENT_TYPES.find((c) => c.type === selectedType);
  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label;

  // Step 1: pick content type
  if (!selectedType) {
    return (
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          What type of message do you want to send in{" "}
          <strong className="text-slate-700 dark:text-slate-200">
            {langLabel}
          </strong>
          ?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {CONTENT_TYPES.filter((ct) => event.allowedContentTypes?.includes(ct.type)).map((ct) => (
            <button
              key={ct.type}
              type="button"
              onClick={() => handleTypeSelect(ct.type)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#137fec] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-[#137fec] transition-colors">
                  {ct.icon}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {ct.label}
              </span>
              <span className="text-xs text-slate-400 leading-tight">
                {ct.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: editor + sticky phone preview side by side
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
      {/* ── Left: form ── */}
      <div className="space-y-5">
        {/* Type pill + change */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-base text-slate-500">
              {ctInfo.icon}
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {ctInfo.label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedType(null)}
            className="text-xs text-slate-400 hover:text-[#137fec] underline underline-offset-2 transition-colors"
          >
            Change type
          </button>
        </div>

        {/* Type-specific form */}
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
          {selectedType === "text" && (
            <TextEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
            />
          )}
          {selectedType === "image" && (
            <ImageEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
              eventKey={event.key}
              lang={lang}
            />
          )}
          {selectedType === "video" && (
            <VideoEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
              eventKey={event.key}
              lang={lang}
            />
          )}
          {selectedType === "document" && (
            <DocumentEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
              eventKey={event.key}
              lang={lang}
            />
          )}
          {selectedType === "audio" && (
            <AudioEditor
              content={content}
              onChange={setContent}
              eventKey={event.key}
              lang={lang}
            />
          )}
          {selectedType === "location" && (
            <LocationEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
            />
          )}
          {selectedType === "poll" && (
            <PollEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
            />
          )}
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isValid()}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-colors bg-[#137fec] text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200 dark:shadow-none"
        >
          {saving
            ? "Saving…"
            : template
              ? "✓ Update template"
              : "Save template"}
        </button>

        {template && (
          <p className="text-center text-xs text-green-600 dark:text-green-400">
            ✓ Template saved — last updated{" "}
            {new Date(template.updatedAt).toLocaleDateString("en-IN")}
          </p>
        )}
      </div>

      {/* ── Right: sticky phone preview ── */}
      <div className="lg:sticky lg:top-6">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-center mb-3">
          Preview — {langLabel}
        </p>
        <PhonePreview contentType={selectedType} content={content} />
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Sample data used for variables
        </p>
      </div>
    </div>
  );
}

// ─── Template Editor for an event — 3 language tabs ──────────────────────────

function TemplateEditor({
  event,
  templatesByLang,
  onBack,
  onSaved,
  settings,
  onSettingChange,
}) {
  const colors = COLOR_MAP[event.color];
  const [activeLang, setActiveLang] = useState("en");
  const eventSettings = settings.events?.[event.key] || {
    enabled: false,
    delayMinutes: 0,
  };

  return (
    <div className="space-y-5">
      {/* Back + badge */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">
            arrow_back
          </span>{" "}
          Back to messages
        </button>
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full border ${colors.card}`}
        >
          <span className={`material-symbols-outlined text-sm ${colors.icon}`}>
            {event.icon}
          </span>
          <span className={`text-xs font-medium ${colors.icon}`}>
            {event.label}
          </span>
        </div>
      </div>

      {/* Enable + delay */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            Enable this notification
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automatically send when this event occurs
          </p>
        </div>
        <div className="flex items-center gap-4">
          {eventSettings.enabled &&
            (event.key === "appointmentReminder" ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Send
                </span>
                <input
                  type="number"
                  min="1"
                  value={eventSettings.hoursBeforeAppointment ?? 24}
                  onChange={(e) =>
                    onSettingChange(
                      event.key,
                      "hoursBeforeAppointment",
                      Number(e.target.value),
                    )
                  }
                  className="w-16 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  hours before appointment
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Delay
                </span>
                <input
                  type="number"
                  min="0"
                  value={eventSettings.delayMinutes ?? 0}
                  onChange={(e) =>
                    onSettingChange(
                      event.key,
                      "delayMinutes",
                      Number(e.target.value),
                    )
                  }
                  className="w-16 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  min
                </span>
              </div>
            ))}
          <Toggle
            value={eventSettings.enabled}
            onChange={(v) => onSettingChange(event.key, "enabled", v)}
          />
        </div>
      </div>

      {/* Language tabs */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Configure per language
        </p>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGES.map((l) => {
            const has = !!templatesByLang[l.code];
            const isActive = activeLang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setActiveLang(l.code)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  isActive
                    ? "border-[#137fec] bg-blue-50 dark:bg-blue-900/20 text-[#137fec]"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
                {has ? (
                  <span
                    className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"
                    title="Template saved"
                  />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"
                    title="No template yet"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700" />

      {/* Per-language editor */}
      <LangEditor
        key={activeLang}
        lang={activeLang}
        event={event}
        template={templatesByLang[activeLang] || null}
        onSaved={onSaved}
      />
    </div>
  );
}

// ─── Journey Editor ───────────────────────────────────────────────────────────

const DELAY_UNITS = ["minutes", "hours", "days"];
const JOURNEY_VARIABLES = ["name", "treatment", "date"];

// ─── Per-step full-featured editor ───────────────────────────────────────────
// Reuses LangEditor for each language — content type picker, media upload,
// variable insertion, WA formatting, live preview.

function JourneyStepEditor({
  idx,
  msg,
  onDelayChange,
  onLangChange,
  onRemove,
}) {
  const [activeLang, setActiveLang] = useState("en");

  // Fake event object matching LangEditor's expectations
  const fakeEvent = { key: "postCare", variables: JOURNEY_VARIABLES };

  // Build a fake "template" object from msg.languages[lang] so LangEditor
  // can load existing content on mount
  function templateForLang(lang) {
    const v = msg.languages?.[lang];
    if (!v?.contentType || !v.content || Object.keys(v.content).length === 0)
      return null;
    return { contentType: v.contentType, content: v.content };
  }

  // LangEditor calls onSaved(lang, saved) — here we intercept and lift to parent
  function handleSaved(lang, saved) {
    onLangChange(lang, {
      contentType: saved.contentType,
      content: saved.content,
    });
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      {/* Step header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#137fec] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
            {idx + 1}
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Step {idx + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Delay */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Send after treatment completion
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={msg.delay?.value || 0}
              onChange={(e) =>
                onDelayChange("delay.value", Number(e.target.value))
              }
              className="w-20 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
            />
            <select
              value={msg.delay?.unit || "hours"}
              onChange={(e) => onDelayChange("delay.unit", e.target.value)}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
            >
              {DELAY_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Language tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Message per language
          </label>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit mb-4">
            {LANGUAGES.map((l) => {
              const v = msg.languages?.[l.code];
              const hasContent =
                v?.contentType === "text"
                  ? v?.content?.text?.trim()
                  : v?.content &&
                    Object.keys(v.content).some(
                      (k) => !["_fileName"].includes(k) && v.content[k],
                    );
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setActiveLang(l.code)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeLang === l.code
                      ? "bg-white dark:bg-slate-700 text-[#137fec] shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <span>{l.flag}</span>
                  {l.label}
                  {hasContent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Full LangEditor for the active language — reuses content type picker,
              variable chips, media upload, WA preview */}
          <StepLangEditor
            key={`${idx}-${activeLang}`}
            lang={activeLang}
            event={fakeEvent}
            existing={templateForLang(activeLang)}
            onSaved={handleSaved}
          />
        </div>
      </div>
    </div>
  );
}

// Thin wrapper around LangEditor that doesn't call the API on save —
// instead it calls onSaved immediately with the local content so the
// parent JourneyEditor can collect all steps before doing one API call.
function StepLangEditor({ lang, event, existing, onSaved }) {
  const existingType = existing?.contentType || null;
  const [selectedType, setSelectedType] = useState(existingType);
  const [content, setContent] = useState(existing?.content || {});

  useEffect(() => {
    setSelectedType(existing?.contentType || null);
    setContent(existing?.content || {});
  }, [lang]);

  const ctInfo = CONTENT_TYPES.find((c) => c.type === selectedType);
  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label;

  // Propagate changes upward immediately on every content change
  useEffect(() => {
    if (selectedType) {
      onSaved(lang, { contentType: selectedType, content });
    }
  }, [content, selectedType]);

  if (!selectedType) {
    return (
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Choose message type for{" "}
          <strong className="text-slate-700 dark:text-slate-200">
            {langLabel}
          </strong>
          :
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
          {CONTENT_TYPES.filter((ct) => event.allowedContentTypes?.includes(ct.type)).map((ct) => (
            <button
              key={ct.type}
              type="button"
              onClick={() => {
                setSelectedType(ct.type);
                setContent({});
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#137fec] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-[#137fec] transition-colors">
                  {ct.icon}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {ct.label}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {ct.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5 items-start">
      {/* Left: form */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-sm text-slate-500">
              {ctInfo.icon}
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {ctInfo.label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedType(null);
              setContent({});
            }}
            className="text-xs text-slate-400 hover:text-[#137fec] underline underline-offset-2"
          >
            Change
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
          {selectedType === "text" && (
            <TextEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
            />
          )}
          {selectedType === "image" && (
            <ImageEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
              eventKey={event.key}
              lang={lang}
            />
          )}
          {selectedType === "video" && (
            <VideoEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
              eventKey={event.key}
              lang={lang}
            />
          )}
          {selectedType === "document" && (
            <DocumentEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
              eventKey={event.key}
              lang={lang}
            />
          )}
          {selectedType === "audio" && (
            <AudioEditor
              content={content}
              onChange={setContent}
              eventKey={event.key}
              lang={lang}
            />
          )}
          {selectedType === "location" && (
            <LocationEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
            />
          )}
          {selectedType === "poll" && (
            <PollEditor
              content={content}
              onChange={setContent}
              variables={event.variables}
            />
          )}
        </div>
      </div>

      {/* Right: preview */}
      <div className="lg:sticky lg:top-6">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-center mb-2">
          Preview · {langLabel}
        </p>
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="bg-[#075e54] px-3 py-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: 13 }}
              >
                storefront
              </span>
            </div>
            <p className="text-white text-xs font-medium">Smile Clinic</p>
          </div>
          <div className="bg-[#e5ddd5] dark:bg-[#0d1418] p-3 min-h-[80px]">
            <div className="ml-auto max-w-[90%]">
              <WAPreview contentType={selectedType} content={content} />
            </div>
          </div>
        </div>
        <p className="text-center text-[9px] text-slate-400 mt-1">
          Sample data for preview
        </p>
      </div>
    </div>
  );
}

function JourneyEditor({ onBack, settings, onSettingChange }) {
  const [journeys, setJourneys] = useState([]);
  const [treatmentNames, setTreatmentNames] = useState([]); // from Services collection
  const [activeJourney, setActiveJourney] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const eventSettings = settings.events?.postCare || {
    enabled: false,
    delayMinutes: 0,
  };

  useEffect(() => {
    Promise.all([
      api.get("/whatsapp/journeys"),
      api.get("/whatsapp/journeys/treatments"),
    ])
      .then(([jRes, tRes]) => {
        setJourneys(jRes.data);
        setTreatmentNames(tRes.data); // [{ name, category }]
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Treatments that don't yet have a journey configured
  const unconfigured = treatmentNames.filter(
    (t) =>
      !journeys.find(
        (j) => j.treatmentName.toLowerCase() === t.name.toLowerCase(),
      ),
  );

  function startNewJourney(name) {
    if (!name) return;
    setActiveJourney({ treatmentName: name, enabled: true, messages: [] });
    setSelectedTreatment("");
  }

  function selectJourney(j) {
    setActiveJourney({
      ...j,
      messages: j.messages.map((m) => ({ ...m, template: { ...m.template } })),
    });
  }

  function addStep() {
    setActiveJourney((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `msg_${Date.now()}`,
          delay: { value: 1, unit: "hours" },
          languages: {
            en: { contentType: "text", content: {} },
            hi: { contentType: "text", content: {} },
            mr: { contentType: "text", content: {} },
          },
        },
      ],
    }));
  }

  function updateStep(idx, field, value) {
    setActiveJourney((prev) => {
      const msgs = [...prev.messages];
      if (field.includes(".")) {
        const [a, b] = field.split(".");
        msgs[idx] = { ...msgs[idx], [a]: { ...msgs[idx][a], [b]: value } };
      } else {
        msgs[idx] = { ...msgs[idx], [field]: value };
      }
      return { ...prev, messages: msgs };
    });
  }

  // Update a single language variant (contentType + content) for a step
  function updateLangContent(idx, lang, langData) {
    setActiveJourney((prev) => {
      const msgs = [...prev.messages];
      msgs[idx] = {
        ...msgs[idx],
        languages: { ...msgs[idx].languages, [lang]: langData },
      };
      return { ...prev, messages: msgs };
    });
  }

  function removeStep(idx) {
    setActiveJourney((prev) => ({
      ...prev,
      messages: prev.messages.filter((_, i) => i !== idx),
    }));
  }

  async function saveJourney() {
    if (!activeJourney) return;
    setSaving(true);
    try {
      let saved;
      if (activeJourney._id) {
        saved = (
          await api.put(
            `/whatsapp/journeys/${activeJourney._id}`,
            activeJourney,
          )
        ).data;
        setJourneys((prev) =>
          prev.map((j) => (j._id === saved._id ? saved : j)),
        );
      } else {
        saved = (await api.post("/whatsapp/journeys", activeJourney)).data;
        setJourneys((prev) => [saved, ...prev]);
      }
      setActiveJourney(saved);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteJourney(id) {
    if (!confirm("Delete this journey?")) return;
    await api.delete(`/whatsapp/journeys/${id}`).catch(() => {});
    setJourneys((prev) => prev.filter((j) => j._id !== id));
    if (activeJourney?._id === id) setActiveJourney(null);
  }

  // Calculate cumulative delay for timeline preview
  function getCumulativeLabel(messages, upToIdx) {
    let total = 0;
    for (let i = 0; i <= upToIdx; i++) {
      const m = messages[i];
      const ms =
        (m.delay?.value || 0) *
        ({ minutes: 60000, hours: 3600000, days: 86400000 }[m.delay?.unit] ||
          3600000);
      total += ms;
    }
    const h = Math.floor(total / 3600000);
    const d = Math.floor(h / 24);
    if (d > 0) return `+${d}d ${h % 24 > 0 ? (h % 24) + "h" : ""}`.trim();
    if (h > 0) return `+${h}h`;
    return `+${Math.floor(total / 60000)}min`;
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
        >
          <span className="material-symbols-outlined text-base">
            arrow_back
          </span>{" "}
          Back to messages
        </button>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
          <span className="material-symbols-outlined text-sm text-rose-600 dark:text-rose-400">
            healing
          </span>
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
            Post-Care Journey
          </span>
        </div>
      </div>

      {/* Global postCare toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            Enable post-care journeys
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automatically send scheduled messages after treatments are completed
          </p>
        </div>
        <Toggle
          value={eventSettings.enabled}
          onChange={(v) => onSettingChange("postCare", "enabled", v)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* ── Left: treatment list ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Treatments
          </p>

          {loading ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Loading treatments…
            </p>
          ) : (
            <>
              {/* Configured journeys */}
              {journeys.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1">
                    Configured
                  </p>
                  {journeys.map((j) => (
                    <div
                      key={j._id}
                      onClick={() => selectJourney(j)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${
                        activeJourney?._id === j._id
                          ? "border-[#137fec] bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                          {j.treatmentName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {j.messages?.length || 0} step
                          {j.messages?.length !== 1 ? "s" : ""} ·{" "}
                          <span
                            className={
                              j.enabled ? "text-green-500" : "text-slate-400"
                            }
                          >
                            {j.enabled ? "Active" : "Disabled"}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteJourney(j._id);
                        }}
                        className="text-slate-400 hover:text-red-500 ml-2 flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Unconfigured treatments from Services */}
              {unconfigured.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1">
                    Add post-care for
                  </p>
                  {unconfigured.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => startNewJourney(t.name)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-[#137fec] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                          {t.name}
                        </p>
                        <p className="text-xs text-slate-400">{t.category}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-sm flex-shrink-0">
                        add_circle
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {journeys.length === 0 && unconfigured.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No treatments found.
                  <br />
                  Add treatments via the Treatment Plan in a patient visit
                  first.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Right: journey builder ── */}
        {activeJourney ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                  {activeJourney.treatmentName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeJourney.messages.length} step
                  {activeJourney.messages.length !== 1 ? "s" : ""} in this
                  journey
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Enabled</span>
                <Toggle
                  value={activeJourney.enabled}
                  onChange={(v) =>
                    setActiveJourney((p) => ({ ...p, enabled: v }))
                  }
                />
              </div>
            </div>

            {/* Steps + timeline preview side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-6 items-start">
              {/* Steps */}
              <div className="space-y-4">
                {activeJourney.messages.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600">
                      add_circle
                    </span>
                    <p className="text-sm text-slate-400 mt-2">
                      No steps yet. Add the first message below.
                    </p>
                  </div>
                )}

                {activeJourney.messages.map((msg, idx) => (
                  <JourneyStepEditor
                    key={msg.id}
                    idx={idx}
                    msg={msg}
                    onDelayChange={(field, value) =>
                      updateStep(idx, field, value)
                    }
                    onLangChange={(lang, langData) =>
                      updateLangContent(idx, lang, langData)
                    }
                    onRemove={() => removeStep(idx)}
                  />
                ))}

                {/* Add step */}
                <button
                  type="button"
                  onClick={addStep}
                  disabled={activeJourney?.messages?.length >= 3}
                  className={`w-full py-3 rounded-2xl border-2 border-dashed text-sm flex items-center justify-center gap-2 transition-colors ${
                    activeJourney?.messages?.length >= 3
                      ? "border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                      : "border-slate-300 dark:border-slate-600 text-slate-500 hover:border-[#137fec] hover:text-[#137fec]"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    add
                  </span>{" "}
                  Add step {activeJourney?.messages?.length >= 3 && "(max 3)"}
                </button>

                {/* Save */}
                <button
                  type="button"
                  onClick={saveJourney}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-[#137fec] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-200 dark:shadow-none"
                >
                  {saving
                    ? "Saving…"
                    : activeJourney._id
                      ? "✓ Update journey"
                      : "Save journey"}
                </button>
              </div>

              {/* Timeline preview */}
              <div className="lg:sticky lg:top-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Timeline Preview
                </p>
                <div className="space-y-0">
                  {/* Treatment completed node */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <span
                          className="material-symbols-outlined text-white"
                          style={{ fontSize: 14 }}
                        >
                          check
                        </span>
                      </div>
                      {activeJourney.messages.length > 0 && (
                        <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 min-h-[24px]" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                        Treatment completed
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Journey starts now
                      </p>
                    </div>
                  </div>

                  {activeJourney.messages.map((msg, idx) => {
                    const isLast = idx === activeJourney.messages.length - 1;
                    const enLang = msg.languages?.en;
                    const ct = enLang?.contentType || "text";
                    const hasMedia = ct !== "text";
                    // Best preview text across all languages
                    const previewText =
                      enLang?.content?.text ||
                      msg.languages?.hi?.content?.text ||
                      msg.languages?.mr?.content?.text ||
                      enLang?.content?.caption ||
                      "";
                    const ctIcon =
                      CONTENT_TYPES.find((c) => c.type === ct)?.icon ||
                      "text_fields";
                    return (
                      <div key={msg.id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-[#137fec] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                            {idx + 1}
                          </div>
                          {!isLast && (
                            <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 min-h-[24px]" />
                          )}
                        </div>
                        <div className="pb-4 min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-[#137fec]">
                            {getCumulativeLabel(activeJourney.messages, idx)}
                          </p>
                          <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-xl rounded-tl-sm px-2.5 py-1.5 mt-1 max-w-full">
                            {hasMedia && (
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-0.5">
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: 10 }}
                                >
                                  {ctIcon}
                                </span>
                                {ct}
                              </p>
                            )}
                            {previewText ? (
                              <p className="text-xs text-slate-800 dark:text-white break-words line-clamp-2">
                                <WAText text={previewText} />
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                No message set
                              </p>
                            )}
                          </div>
                          {/* Language coverage dots */}
                          <div className="flex gap-1 mt-1">
                            {LANGUAGES.map((l) => {
                              const v = msg.languages?.[l.code];
                              const has =
                                v?.contentType === "text"
                                  ? v?.content?.text?.trim()
                                  : v?.content &&
                                    Object.keys(v.content).some(
                                      (k) => v.content[k],
                                    );
                              return has ? (
                                <span
                                  key={l.code}
                                  className="text-[9px] text-slate-400"
                                >
                                  {l.flag}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-700 mb-3">
              healing
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select a treatment from the left,
              <br />
              or create a new journey above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirmation popup ───────────────────────────────────────────────────────

function ConfirmToggleModal({
  eventKey,
  newValue,
  eventLabel,
  willDisable,
  onConfirm,
  onCancel,
}) {
  const turning = newValue ? "Enable" : "Disable";
  const color = newValue
    ? "bg-green-600 hover:bg-green-700"
    : "bg-red-500 hover:bg-red-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1a2634] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${newValue ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}
        >
          <span
            className={`material-symbols-outlined text-2xl ${newValue ? "text-green-600" : "text-red-500"}`}
          >
            {newValue ? "toggle_on" : "toggle_off"}
          </span>
        </div>

        {/* Title + body */}
        <div className="text-center">
          <p className="text-base font-bold text-slate-800 dark:text-white">
            {turning} "{eventLabel}"?
          </p>
          {newValue && willDisable.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This will automatically{" "}
                <span className="font-semibold text-red-500">disable</span>:
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-0.5">
                {willDisable.map((l) => (
                  <li
                    key={l}
                    className="flex items-center justify-center gap-1"
                  >
                    <span
                      className="material-symbols-outlined text-red-400"
                      style={{ fontSize: 14 }}
                    >
                      remove_circle
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-2">
                Only one post-visit message can be active at a time.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {newValue
                ? "Patients will start receiving this message automatically."
                : "Patients will no longer receive this message."}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${color}`}
          >
            {turning}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event card (single) ──────────────────────────────────────────────────────

function EventCard({
  event,
  evConfig,
  byLang,
  onToggle,
  onConfigure,
}) {
  const colors = COLOR_MAP[event.color];
  const enabled = evConfig?.enabled ?? false;

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
        enabled
          ? `${colors.card} shadow-sm`
          : "bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? colors.iconBg : "bg-slate-100 dark:bg-slate-700"}`}
      >
        <span
          className={`material-symbols-outlined ${enabled ? colors.icon : "text-slate-400 dark:text-slate-500"}`}
        >
          {event.icon}
        </span>
      </div>

      {/* Info — clickable to configure */}
      <button
        type="button"
        onClick={() => onConfigure(event.key)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`text-sm font-semibold ${enabled ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
          >
            {event.label}
          </p>
          {enabled && (
            <span className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {event.description}
        </p>

        {/* Language / journey badges */}
        {!event.isJourney && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {LANGUAGES.map((l) => {
              const tmpl = byLang[l.code];
              const ct = CONTENT_TYPES.find(
                (c) => c.type === tmpl?.contentType,
              );
              return (
                <span
                  key={l.code}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border flex items-center gap-0.5 ${
                    tmpl
                      ? "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                      : "bg-transparent border-dashed border-slate-200 dark:border-slate-700 text-slate-400"
                  }`}
                >
                  {l.flag}
                  {tmpl && ct && (
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 9 }}
                    >
                      {ct.icon}
                    </span>
                  )}
                  {tmpl ? "✓" : ""}
                </span>
              );
            })}
          </div>
        )}
      </button>

      {/* Configure chevron */}
      <button
        type="button"
        onClick={() => onConfigure(event.key)}
        className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 flex-shrink-0"
      >
        <span className="material-symbols-outlined text-sm">settings</span>
      </button>

      {/* Toggle */}
      <button
        type="button"
        onClick={() => onToggle(event.key, !enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-[#137fec]" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

// ─── Feedback Poll Config Editor ─────────────────────────────────────────────

function FeedbackPollConfigEditor({
  event,
  settings,
  onSettingChange,
  onBack,
}) {
  const colors = COLOR_MAP[event.color];
  const eventSettings = settings.events?.[event.key] || {
    enabled: false,
    delayMinutes: 15,
    pollTemplateId: null,
  };

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: "",
    options: ["1 - Very Unhappy", "2 - Unhappy", "3 - Neutral", "4 - Happy", "5 - Very Happy"],
  });
  const [responses, setResponses] = useState({
    rating1: { contentType: "text", content: { text: "" }, isEnabled: true },
    rating2: { contentType: "text", content: { text: "" }, isEnabled: true },
    rating3: { contentType: "text", content: { text: "" }, isEnabled: true },
    rating4: { contentType: "text", content: { text: "" }, isEnabled: true },
    rating5: { contentType: "text", content: { text: "" }, isEnabled: true },
  });
  const [expandedRating, setExpandedRating] = useState(null);

  const getTenantId = () => {
    try {
      const token = localStorage.getItem("dms_token");
      if (!token) return null;
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const decoded = JSON.parse(atob(parts[1]));
      return decoded.tenantId || decoded.userId;
    } catch (e) {
      console.error("Error decoding tenant:", e);
      return null;
    }
  };

  const tenantId = getTenantId();

  useEffect(() => {
    const load = async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const dmsResp = await api.get("/feedback/poll-templates");
        if (dmsResp.data && dmsResp.data.length > 0) {
          const template = dmsResp.data[0];
          setPollForm({
            question: template.name,
            options: template.options,
          });
          // NOTE: don't call onSettingChange here — it triggers parent re-render → infinite loop
        }

        const wahaResp = await fetch(`${WAHA_BASE_URL}/waha/tenant-feedback/${tenantId}`, {
          headers: { 'X-Api-Key': WAHA_API_KEY }
        });
        console.log('[WAHA Load] status:', wahaResp.status);
        if (wahaResp.ok) {
          const wahaData = await wahaResp.json();
          console.log('[WAHA Load] response data:', wahaData);
          const wahaTemplates = wahaData.templates || wahaData; // support both shapes
          if (wahaTemplates && Array.isArray(wahaTemplates)) {
            // Use functional updater to avoid stale closure over `responses`
            setResponses(prev => {
              const newResponses = { ...prev };
              wahaTemplates.forEach((resp) => {
                if (resp.rating >= 1 && resp.rating <= 5) {
                  newResponses[`rating${resp.rating}`] = {
                    contentType: resp.contentType,
                    content: resp.content,
                    isEnabled: resp.isEnabled !== false,
                  };
                }
              });
              return newResponses;
            });
          }
        }
      } catch (err) {
        console.error("Error loading poll data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let templateId = eventSettings.pollTemplateId;

      // 1. Save core poll config to DMS (no feedbackResponses)
      const dmsPayload = {
        name: pollForm.question,
        options: pollForm.options,
        sendDelayMinutes: eventSettings.delayMinutes ?? 15,
        isActive: true,
      };

      if (!templateId) {
        const createResp = await api.post("/feedback/poll-templates", dmsPayload);
        templateId = createResp.data._id;
        onSettingChange(event.key, "pollTemplateId", templateId);
      } else {
        await api.put(`/feedback/poll-templates/${templateId}`, dmsPayload);
      }

      // 2. Bulk-save all 5 rating responses directly to WAHA
      if (tenantId) {
        const wahaPayload = {
          templates: [1, 2, 3, 4, 5].map(rating => {
            const resp = responses[`rating${rating}`];
            return {
              rating,
              contentType: resp.contentType,
              content: resp.content,
              isEnabled: resp.isEnabled !== false,
            };
          })
        };
        console.log('[WAHA Save] posting to:', `${WAHA_BASE_URL}/waha/tenant-feedback/${tenantId}`);
        console.log('[WAHA Save] payload:', JSON.stringify(wahaPayload, null, 2));
        const wahaRes = await fetch(`${WAHA_BASE_URL}/waha/tenant-feedback/${tenantId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
          body: JSON.stringify(wahaPayload),
        });
        const wahaResBody = await wahaRes.json().catch(() => null);
        console.log('[WAHA Save] response status:', wahaRes.status, 'body:', wahaResBody);
        if (!wahaRes.ok) throw new Error(`Failed to save to WAHA: ${JSON.stringify(wahaResBody)}`);
      }

      alert("Poll configuration saved successfully!");
    } catch (err) {
      console.error("Error saving poll:", err);
      alert("Error saving poll: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const RATING_COLORS = {
    1: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    2: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    3: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    4: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    5: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  };

  const RATING_LABELS = {
    1: "Very Unhappy",
    2: "Unhappy",
    3: "Neutral",
    4: "Happy",
    5: "Very Happy",
  };

  return (
    <div className="space-y-5">
      {/* Back + badge */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">
            arrow_back
          </span>{" "}
          Back to messages
        </button>
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full border ${colors.card}`}
        >
          <span className={`material-symbols-outlined text-sm ${colors.icon}`}>
            {event.icon}
          </span>
          <span className={`text-xs font-medium ${colors.icon}`}>
            {event.label}
          </span>
        </div>
      </div>

      {/* Main config card */}
      <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        {/* Enable toggle + delay */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              Enable feedback poll
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Auto-send 1-5 rating poll when appointment is completed
            </p>
          </div>
          <div className="flex items-center gap-4">
            {eventSettings.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Delay
                </span>
                <input
                  type="number"
                  min="0"
                  value={eventSettings.delayMinutes ?? 0}
                  onChange={(e) =>
                    onSettingChange(event.key, "delayMinutes", Number(e.target.value))
                  }
                  className="w-16 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  min
                </span>
              </div>
            )}
            <Toggle
              value={eventSettings.enabled}
              onChange={(v) => onSettingChange(event.key, "enabled", v)}
            />
          </div>
        </div>

        {/* Poll config (visible when enabled) */}
        {eventSettings.enabled && (
          <div className="border-t border-slate-200 dark:border-slate-600 pt-4 space-y-4">
            {/* Poll question */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Poll Question
              </label>
              <textarea
                value={pollForm.question}
                onChange={(e) =>
                  setPollForm({ ...pollForm, question: e.target.value })
                }
                placeholder="e.g., How satisfied were you with your treatment?"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                rows={2}
              />
            </div>

            {/* Response messages (collapsible accordions) */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Response Messages (sent after patient votes)
              </p>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const ratingKey = `rating${rating}`;
                  const resp = responses[ratingKey];
                  const isExpanded = expandedRating === rating;

                  return (
                    <div
                      key={ratingKey}
                      className={`border rounded-lg overflow-hidden ${RATING_COLORS[rating]}`}
                    >
                      {/* Accordion header */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRating(isExpanded ? null : rating)
                        }
                        className="w-full flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              rating === 1 ? "bg-red-500" :
                              rating === 2 ? "bg-orange-500" :
                              rating === 3 ? "bg-yellow-500" :
                              rating === 4 ? "bg-blue-500" :
                              "bg-green-500"
                            }`}
                          >
                            {rating}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {RATING_LABELS[rating]}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {resp.contentType.charAt(0).toUpperCase() + resp.contentType.slice(1)}
                            </p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">
                          {isExpanded ? "expand_less" : "expand_more"}
                        </span>
                      </button>

                      {/* Accordion content */}
                      {isExpanded && (
                        <div className="border-t border-inherit p-3 space-y-3 bg-black/2.5 dark:bg-white/2.5">
                          {/* Enable toggle */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              Enabled
                            </span>
                            <Toggle
                              value={resp.isEnabled}
                              onChange={(v) => {
                                setResponses({
                                  ...responses,
                                  [ratingKey]: { ...resp, isEnabled: v },
                                });
                              }}
                            />
                          </div>

                          {/* Content type selector */}
                          {/* <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Response Type
                            </label>
                            <select
                              value={resp.contentType}
                              onChange={(e) => {
                                const newType = e.target.value;
                                const newContent =
                                  newType === "text"
                                    ? { text: "" }
                                    : newType === "image" || newType === "video"
                                    ? { url: "", caption: "" }
                                    : newType === "document"
                                    ? { url: "", fileName: "", caption: "" }
                                    : newType === "location"
                                    ? {
                                        degreesLatitude: 0,
                                        degreesLongitude: 0,
                                        name: "",
                                        address: "",
                                      }
                                    : { text: "" };

                                setResponses({
                                  ...responses,
                                  [ratingKey]: {
                                    ...resp,
                                    contentType: newType,
                                    content: newContent,
                                  },
                                });
                              }}
                              className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                            >
                              <option value="text">Text Message</option>
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                              <option value="document">Document</option>
                              <option value="location">Location</option>
                            </select>
                          </div> */}

                          {/* Content fields (type-specific) */}
                          {resp.contentType === "text" && (
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Message
                              </label>
                              <textarea
                                value={resp.content.text || ""}
                                onChange={(e) => {
                                  setResponses({
                                    ...responses,
                                    [ratingKey]: {
                                      ...resp,
                                      content: { text: e.target.value },
                                    },
                                  });
                                }}
                                placeholder="Enter response message..."
                                className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                rows={2}
                              />
                            </div>
                          )}

                          {(resp.contentType === "image" ||
                            resp.contentType === "video") && (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  URL
                                </label>
                                <input
                                  type="url"
                                  value={resp.content.url || ""}
                                  onChange={(e) => {
                                    setResponses({
                                      ...responses,
                                      [ratingKey]: {
                                        ...resp,
                                        content: {
                                          ...resp.content,
                                          url: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  placeholder="https://example.com/image.jpg"
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Caption (optional)
                                </label>
                                <input
                                  type="text"
                                  value={resp.content.caption || ""}
                                  onChange={(e) => {
                                    setResponses({
                                      ...responses,
                                      [ratingKey]: {
                                        ...resp,
                                        content: {
                                          ...resp.content,
                                          caption: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  placeholder="Optional caption..."
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                />
                              </div>
                            </>
                          )}

                          {resp.contentType === "document" && (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  URL
                                </label>
                                <input
                                  type="url"
                                  value={resp.content.url || ""}
                                  onChange={(e) => {
                                    setResponses({
                                      ...responses,
                                      [ratingKey]: {
                                        ...resp,
                                        content: {
                                          ...resp.content,
                                          url: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  placeholder="https://example.com/document.pdf"
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  File Name
                                </label>
                                <input
                                  type="text"
                                  value={resp.content.fileName || ""}
                                  onChange={(e) => {
                                    setResponses({
                                      ...responses,
                                      [ratingKey]: {
                                        ...resp,
                                        content: {
                                          ...resp.content,
                                          fileName: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  placeholder="document.pdf"
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Caption (optional)
                                </label>
                                <input
                                  type="text"
                                  value={resp.content.caption || ""}
                                  onChange={(e) => {
                                    setResponses({
                                      ...responses,
                                      [ratingKey]: {
                                        ...resp,
                                        content: {
                                          ...resp.content,
                                          caption: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  placeholder="Optional caption..."
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                />
                              </div>
                            </>
                          )}

                          {resp.contentType === "location" && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Latitude
                                  </label>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={resp.content.degreesLatitude || 0}
                                    onChange={(e) => {
                                      setResponses({
                                        ...responses,
                                        [ratingKey]: {
                                          ...resp,
                                          content: {
                                            ...resp.content,
                                            degreesLatitude: parseFloat(
                                              e.target.value
                                            ),
                                          },
                                        },
                                      });
                                    }}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Longitude
                                  </label>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={resp.content.degreesLongitude || 0}
                                    onChange={(e) => {
                                      setResponses({
                                        ...responses,
                                        [ratingKey]: {
                                          ...resp,
                                          content: {
                                            ...resp.content,
                                            degreesLongitude: parseFloat(
                                              e.target.value
                                            ),
                                          },
                                        },
                                      });
                                    }}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Location Name
                                </label>
                                <input
                                  type="text"
                                  value={resp.content.name || ""}
                                  onChange={(e) => {
                                    setResponses({
                                      ...responses,
                                      [ratingKey]: {
                                        ...resp,
                                        content: {
                                          ...resp.content,
                                          name: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  placeholder="Our Clinic"
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Address
                                </label>
                                <input
                                  type="text"
                                  value={resp.content.address || ""}
                                  onChange={(e) => {
                                    setResponses({
                                      ...responses,
                                      [ratingKey]: {
                                        ...resp,
                                        content: {
                                          ...resp.content,
                                          address: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  placeholder="123 Main St, City"
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full bg-[#137fec] text-white rounded-lg px-4 py-2.5 font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Poll Configuration"}
            </button>
          </div>
        )}
      </div>

      {/* Info box */}
      {!eventSettings.enabled && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
          <span
            className="material-symbols-outlined text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5"
            style={{ fontSize: 20 }}
          >
            info
          </span>
          <div className="space-y-1 text-sm text-cyan-700 dark:text-cyan-300">
            <p>
              <strong>Enable feedback polls</strong> to automatically send a 1-5 rating survey
              to patients after appointment completion. Configure the poll question and automatic
              reply messages for each rating.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feedback Follow-up Messages Editor ──────────────────────────────────────

const FEEDBACK_RATINGS = [
  {
    key: "excellent",
    label: "5 - Excellent",
    rating: 5,
    color:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
  {
    key: "good",
    label: "4 - Good",
    rating: 4,
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  {
    key: "neutral",
    label: "3 - Neutral",
    rating: 3,
    color:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  },
  {
    key: "poor",
    label: "2 - Poor",
    rating: 2,
    color:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  },
  {
    key: "very_poor",
    label: "1 - Very Poor",
    rating: 1,
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  },
];

function FeedbackFollowUpEditor({ onBack, onSaved, feedbackTemplates = {} }) {
  const [selectedRating, setSelectedRating] = useState("excellent");
  const [formData, setFormData] = useState({
    contentType: "text",
    content: { text: "" },
    isEnabled: true,
    sendDelay: 0,
  });
  const [saving, setSaving] = useState(false);

  const currentRating = FEEDBACK_RATINGS.find((r) => r.key === selectedRating);
  const currentTemplate = feedbackTemplates[selectedRating];

  function selectRating(key) {
    setSelectedRating(key);
    const template = feedbackTemplates[key];
    if (template) {
      setFormData({
        contentType: template.contentType,
        content: template.content || {},
        isEnabled: template.isEnabled,
        sendDelay: template.sendDelay || 0,
      });
    } else {
      setFormData({
        contentType: "text",
        content: { text: "" },
        isEnabled: true,
        sendDelay: 0,
      });
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = {
        feedbackType: selectedRating,
        rating: currentRating.rating,
        contentType: formData.contentType,
        content: formData.content,
        isEnabled: formData.isEnabled,
        sendDelay: formData.sendDelay,
      };

      // Save to DMS
      let result;
      if (currentTemplate?._id) {
        result = await api.put(
          `/feedback/templates/${selectedRating}`,
          payload,
        );
      } else {
        result = await api.post("/feedback/templates", payload);
      }

      // POST to WAAPI (optional — if WAAPI backend is running)
      try {
        const waapiUrl = WAHA_BASE_URL;
        const tenantId = "clinic-001"; // TODO: get from auth context
        await fetch(
          `${waapiUrl}/feedback/${tenantId}/template/${selectedRating}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
      } catch (waapiErr) {
        console.warn("WAAPI save skipped (not available):", waapiErr);
      }

      onSaved(selectedRating, result.data);
      alert("Follow-up message saved");
    } catch (err) {
      alert("Failed to save: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this follow-up message?")) return;
    try {
      setSaving(true);
      await api.delete(`/feedback/templates/${selectedRating}`);
      onSaved(selectedRating, null);
      alert("Follow-up message deleted");
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Feedback Follow-up Messages
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Configure response messages for each rating
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left: Rating selector */}
          <div className="space-y-2">
            {FEEDBACK_RATINGS.map((rating) => {
              const has = !!feedbackTemplates[rating.key];
              const isActive = selectedRating === rating.key;
              return (
                <button
                  key={rating.key}
                  onClick={() => selectRating(rating.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                    isActive
                      ? "border-[#137fec] bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <p
                      className={`font-medium text-sm ${isActive ? "text-[#137fec]" : "text-slate-700 dark:text-slate-300"}`}
                    >
                      {rating.label}
                    </p>
                    {has && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        ✓ Configured
                      </p>
                    )}
                  </div>
                  {has && (
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Message editor */}
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
              <div
                className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${currentRating.color}`}
              >
                <span className="material-symbols-outlined">star</span>
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">
                  {currentRating.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Follow-up message
                </p>
              </div>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Enable auto-response
              </span>
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 rounded border-slate-300 text-[#137fec] cursor-pointer"
              />
            </div>

            {/* Content type selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Message type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: "text", label: "Text", icon: "text_fields" },
                  { type: "image", label: "Image", icon: "image" },
                  { type: "document", label: "Document", icon: "description" },
                  { type: "location", label: "Location", icon: "location_on" },
                ].map((ct) => (
                  <button
                    key={ct.type}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        contentType: ct.type,
                        content: {},
                      }))
                    }
                    className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                      formData.contentType === ct.type
                        ? "border-[#137fec] bg-blue-50 dark:bg-blue-900/20 text-[#137fec]"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {ct.icon}
                    </span>
                    <span className="text-sm font-medium">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message content */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Message content
              </label>
              {formData.contentType === "text" && (
                <textarea
                  value={formData.content.text || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: { text: e.target.value },
                    }))
                  }
                  placeholder="Enter your follow-up message..."
                  rows={4}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                />
              )}
              {formData.contentType === "image" && (
                <input
                  type="text"
                  value={formData.content.url || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: { url: e.target.value },
                    }))
                  }
                  placeholder="Image URL"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              )}
              {formData.contentType === "document" && (
                <input
                  type="text"
                  value={formData.content.url || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: { url: e.target.value },
                    }))
                  }
                  placeholder="Document URL"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              )}
              {formData.contentType === "location" && (
                <div className="space-y-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.content.degreesLatitude || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: {
                          ...prev.content,
                          degreesLatitude: Number(e.target.value),
                        },
                      }))
                    }
                    placeholder="Latitude"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.content.degreesLongitude || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: {
                          ...prev.content,
                          degreesLongitude: Number(e.target.value),
                        },
                      }))
                    }
                    placeholder="Longitude"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={formData.content.name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: { ...prev.content, name: e.target.value },
                      }))
                    }
                    placeholder="Location name"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Send delay */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Send delay (milliseconds)
              </label>
              <input
                type="number"
                min="0"
                value={formData.sendDelay}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sendDelay: Number(e.target.value),
                  }))
                }
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Wait this long after patient responds (0 = immediate)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#137fec] text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : currentTemplate
                    ? "Update message"
                    : "Save message"}
              </button>
              {currentTemplate && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Messages tab layout ──────────────────────────────────────────────────────

function MessagesTab({
  events,
  settings,
  templatesByLangFor,
  onToggle,
  onConfigure,
}) {
  const appointmentEvents = events.filter((e) => !e.isJourney && e.key !== "postCare");
  const journeyEvent = events.find((e) => e.isJourney);

  return (
    <div className="space-y-6">
      {/* ── Tips toolbar ── */}
      <div className="flex justify-end">
        <TipsToolbar />
      </div>

      {/* ── Message events ── */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Messages
        </p>
        {appointmentEvents.map((event) => (
          <EventCard
            key={event.key}
            event={event}
            evConfig={settings.events?.[event.key]}
            byLang={templatesByLangFor(event.key)}
            onToggle={onToggle}
            onConfigure={onConfigure}
          />
        ))}
      </section>

      {/* ── Post-care journey ── */}
      {journeyEvent && (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Post-Care Journey
          </p>

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <span
              className="material-symbols-outlined text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5"
              style={{ fontSize: 16 }}
            >
              info
            </span>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              Configure per-treatment message journeys. Each journey supports{" "}
              <strong>up to 3 scheduled steps</strong> sent after treatment
              completion. Runs independently of the post-visit message above.
            </p>
          </div>

          <EventCard
            event={journeyEvent}
            evConfig={settings.events?.[journeyEvent.key]}
            byLang={{}}
            onToggle={onToggle}
            onConfigure={onConfigure}
          />
        </section>
      )}
    </div>
  );
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  scheduled:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};
const EVENT_LABELS = Object.fromEntries(EVENTS.map((e) => [e.key, e.label]));

function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState({ event: "", status: "" });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filter.event) params.event = filter.event;
      if (filter.status) params.status = filter.status;
      const [logsRes, summaryRes] = await Promise.all([
        api.get("/whatsapp/logs", { params }),
        api.get("/whatsapp/logs/summary"),
      ]);
      setLogs(logsRes.data);
      setSummary(summaryRes.data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
              Sent
            </p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {summary.byStatus?.sent || 0}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
              Pending
            </p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {summary.byStatus?.scheduled || 0}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
              Failed
            </p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
              {summary.byStatus?.failed || 0}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              Total
            </p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {(summary.byStatus?.sent || 0) +
                (summary.byStatus?.scheduled || 0) +
                (summary.byStatus?.failed || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filter.event}
          onChange={(e) => {
            setFilter((p) => ({ ...p, event: e.target.value }));
          }}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
        >
          <option value="">All Events</option>
          {EVENTS.map((e) => (
            <option key={e.key} value={e.key}>
              {e.label}
            </option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => {
            setFilter((p) => ({ ...p, status: e.target.value }));
          }}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <button
          onClick={load}
          className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          No messages logged yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {[
                  "Patient",
                  "Event",
                  "Phone",
                  "Status",
                  "Scheduled At",
                  "Sent At",
                  "Error",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {logs.map((log) => (
                <tr
                  key={log._id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                    {log.patientId
                      ? `${log.patientId.first_name} ${log.patientId.last_name || ""}`.trim()
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    {EVENT_LABELS[log.event] || log.event}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {log.to}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status] || ""}`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                    {log.status === "scheduled" && log.payload?.scheduledAt
                      ? new Date(log.payload.scheduledAt).toLocaleString(
                          "en-IN",
                          { dateStyle: "short", timeStyle: "short" },
                        )
                      : log.status === "scheduled"
                        ? "Pending calculation"
                        : "—"}
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td
                    className="py-3 text-xs text-red-500 max-w-[160px] truncate"
                    title={log.errorMessage}
                  >
                    {log.errorMessage || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  enabled: false,
  defaultLanguage: "en",
  fallbackLanguage: "en",
  events: Object.fromEntries(
    EVENTS.map((e) =>
      e.key === "appointmentReminder"
        ? [e.key, { enabled: false, hoursBeforeAppointment: 24 }]
        : [e.key, { enabled: false, delayMinutes: 0 }],
    ),
  ),
};

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("messages");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeEditor, setActiveEditor] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null); // { eventKey, newValue }

  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  async function loadSettings() {
    try {
      const res = await api.get("/whatsapp/settings");
      if (res.data && Object.keys(res.data).length > 0) {
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS,
          ...res.data,
          events: { ...DEFAULT_SETTINGS.events, ...res.data.events },
        }));
      }
    } catch (_) {}
  }

  async function loadTemplates() {
    try {
      const [whatsappRes, feedbackRes] = await Promise.all([
        api.get("/whatsapp/templates").catch(() => ({ data: [] })),
        api.get("/feedback/templates").catch(() => ({ data: [] })),
      ]);
      setTemplates([...(whatsappRes.data || []), ...(feedbackRes.data || [])]);
    } catch (_) {}
  }

  async function saveSettings(updated) {
    const toSave = updated || settings;
    setSavingSettings(true);
    try {
      const response = await api.put("/whatsapp/settings", toSave);
      // Merge response with DEFAULT_SETTINGS to ensure all events are present
      if (response.data) {
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS,
          ...response.data,
          events: { ...DEFAULT_SETTINGS.events, ...response.data.events },
        }));
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSavingSettings(false);
    }
  }

  function updateEventSetting(eventKey, field, value) {
    const defaultConfig =
      eventKey === "appointmentReminder"
        ? { enabled: false, hoursBeforeAppointment: 24 }
        : { enabled: false, delayMinutes: 0 };

    const newEvents = {
      ...settings.events,
      [eventKey]: {
        ...(settings.events[eventKey] || defaultConfig),
        [field]: value,
      },
    };

    const updated = { ...settings, events: newEvents };

    // Save to backend
    setSavingSettings(true);
    api
      .put("/whatsapp/settings", updated)
      .then((response) => {
        if (response.data) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...response.data,
            events: { ...DEFAULT_SETTINGS.events, ...response.data.events },
          });
        }
      })
      .catch((err) => alert(err.response?.data?.error || "Failed to save"))
      .finally(() => setSavingSettings(false));
  }

  function handleTemplateSaved(lang, saved) {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t._id === saved._id);
      if (idx >= 0) {
        const u = [...prev];
        u[idx] = saved;
        return u;
      }
      return [saved, ...prev];
    });
  }

  function templatesByLangFor(eventKey) {
    const result = {};
    LANGUAGES.forEach((l) => {
      const t = templates.find(
        (t) => t.event === eventKey && t.language === l.code && t.isActive,
      );
      if (t) result[l.code] = t;
    });
    return result;
  }

  const activeEvent = EVENTS.find((e) => e.key === activeEditor);
  const tabs = [
    { key: "messages", label: "Messages", icon: "chat" },
    { key: "settings", label: "Settings", icon: "settings" },
    { key: "logs", label: "Logs", icon: "history" },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400">
              chat
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              WhatsApp
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Automated patient messaging
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {settings.enabled ? "Messaging on" : "Messaging off"}
          </span>
          <Toggle
            value={settings.enabled}
            onChange={(v) => {
              const u = { ...settings, enabled: v };
              setSettings(u);
              saveSettings(u);
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setActiveTab(t.key);
              setActiveEditor(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-white dark:bg-slate-700 text-[#137fec] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {t.icon}
            </span>{" "}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-[#1a2634] rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        {/* ── Event cards ── */}
        {activeTab === "messages" && !activeEditor && (
          <MessagesTab
            events={EVENTS}
            settings={settings}
            templatesByLangFor={templatesByLangFor}
            onToggle={(eventKey, newValue) => {
              setConfirmToggle({ eventKey, newValue });
            }}
            onConfigure={(eventKey) => setActiveEditor(eventKey)}
          />
        )}

        {/* ── Feedback Follow-up Editor (COMMENTED OUT) ── */}
        {/*
        {activeTab === 'messages' && activeEditor === 'feedbackFollowUp' && (
          <FeedbackFollowUpEditor
            onBack={() => setActiveEditor(null)}
            onSaved={(rating, saved) => {
              setTemplates(prev => {
                if (!saved) {
                  return prev.filter(t => !(t.feedbackType === rating && !t.event));
                }
                const idx = prev.findIndex(t => t.feedbackType === rating && !t.event);
                if (idx >= 0) { const u = [...prev]; u[idx] = saved; return u; }
                return [saved, ...prev];
              });
            }}
            feedbackTemplates={(() => {
              const result = {};
              FEEDBACK_RATINGS.forEach(r => {
                const t = templates.find(t => t.feedbackType === r.key && !t.event);
                if (t) result[r.key] = t;
              });
              return result;
            })()}
          />
        )}
        */}

        {/* ── Template editor, Feedback editor, or Journey editor ── */}
        {activeTab === "messages" &&
          activeEditor &&
          activeEditor !== "feedbackFollowUp" &&
          activeEvent &&
          (activeEvent.isFeedbackPoll ? (
            <FeedbackPollConfigEditor
              event={activeEvent}
              settings={settings}
              onSettingChange={updateEventSetting}
              onBack={() => setActiveEditor(null)}
            />
          ) : activeEvent.isJourney ? (
            <JourneyEditor
              onBack={() => setActiveEditor(null)}
              settings={settings}
              onSettingChange={updateEventSetting}
            />
          ) : (
            <TemplateEditor
              event={activeEvent}
              templatesByLang={templatesByLangFor(activeEditor)}
              settings={settings}
              onSettingChange={updateEventSetting}
              onBack={() => setActiveEditor(null)}
              onSaved={handleTemplateSaved}
            />
          ))}

        {/* ── Settings ── */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Default Language
                </label>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      defaultLanguage: e.target.value,
                    }))
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Fallback Language
                </label>
                <select
                  value={settings.fallbackLanguage}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      fallbackLanguage: e.target.value,
                    }))
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => saveSettings()}
              disabled={savingSettings}
              className="px-5 py-2.5 bg-[#137fec] text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {savingSettings ? "Saving…" : "Save Settings"}
            </button>
          </div>
        )}

        {/* ── Logs ── */}
        {activeTab === "logs" && <LogsPanel />}
      </div>

      {/* ── Confirmation popup ── */}
      {confirmToggle &&
        (() => {
          const event = EVENTS.find((e) => e.key === confirmToggle.eventKey);
          const turning = confirmToggle.newValue;

          return (
            <ConfirmToggleModal
              eventKey={confirmToggle.eventKey}
              newValue={turning}
              eventLabel={event?.label || confirmToggle.eventKey}
              willDisable={[]}
              onConfirm={() => {
                updateEventSetting(confirmToggle.eventKey, "enabled", turning);
                setConfirmToggle(null);
              }}
              onCancel={() => setConfirmToggle(null)}
            />
          );
        })()}
    </div>
  );
}
