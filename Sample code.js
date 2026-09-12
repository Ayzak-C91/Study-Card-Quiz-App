import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Upload, Plus, Trash2, ChevronLeft, ChevronRight, Check, Shuffle, RotateCcw, FileText, ArrowLeft, Pencil, Layers, CheckSquare, Square } from "lucide-react";

/* ---------- localStorage-backed shim matching the artifact storage API ---------- */
/* (only used outside claude.ai, where window.storage doesn't exist) */
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(key);
      return raw === null ? null : { key, value: raw };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
  };
}

/* ---------- seed deck, parsed from the uploaded Gemini file ---------- */
const SEED_RAW = `[
    {
        "question": "1. Where are hematopoietic stem cells primarily produced in the bone marrow?",
        "options": ["A) Pelvis", "B) Scapula", "C) Skull", "D) Clavicle"],
        "answer": "A" 
    },
    {
        "question": "2. Approximately what fraction of blood cells in the human body are red blood cells (RBCs)?",
        "options": ["A) 3 out of 10", "B) 5 out of 10", "C) 8 out of 10", "D) 9 out of 10"],
        "answer": "C" 
    },
    {
        "question": "3. What is the typical lifecycle duration of a red blood cell?",
        "options": ["A) 1-2 weeks", "B) 3-4 months", "C) 6-8 months", "D) 1 year"],
        "answer": "B" 
    },
    {
        "question": "4. What is the normal hemoglobin reference range for adult males?",
        "options": ["A) 10.0-12.0 g/dL", "B) 12.0-15.5 g/dL", "C) 13.5-17.5 g/dL", "D) 18.0-22.0 g/dL"],
        "answer": "C" 
    },
    {
        "question": "5. What is the normal hematocrit reference range for adult females?",
        "options": ["A) 20-30%", "B) 36-48%", "C) 50-60%", "D) 65-70%"],
        "answer": "B" 
    },
    {
        "question": "6. Which blood cell line is primarily responsible for immune defense and fighting infection?",
        "options": ["A) Erythrocytes", "B) Thrombocytes", "C) Leukocytes", "D) Megakaryocytes"],
        "answer": "C" 
    },
    {
        "question": "7. What protein inside cells stores iron and is used to indirectly measure iron levels in the blood?",
        "options": ["A) Albumin", "B) Ferritin", "C) Myoglobin", "D) Globulin"],
        "answer": "B" 
    },
    {
        "question": "8. What diagnostic test is considered the most definitive for diagnosing Iron Deficiency Anemia (IDA)?",
        "options": ["A) Complete Blood Count", "B) Peripheral Blood Smear", "C) Bone Marrow Aspiration", "D) Schilling Test"],
        "answer": "C" 
    },
    {
        "question": "9. Oral iron supplements (such as ferrous sulfate) commonly cause which characteristic side effect?",
        "options": ["A) Metallic taste and constipation", "B) Sweet taste and diarrhea", "C) Bright red stools", "D) Hair growth"],
        "answer": "A" 
    },
    {
        "question": "10. Which injection method is used for administering IM Iron Dextran to avoid skin staining and pain/irritation?",
        "options": ["A) Z-track method", "B) Intravenous push", "C) Subcutaneous pinch", "D) Intra-arterial method"],
        "answer": "A" 
    },
    {
        "question": "11. What color does a patient's stool typically turn when taking oral iron preparations?",
        "options": ["A) White", "B) Red", "C) Black", "D) Yellow"],
        "answer": "C" 
    },
    {
        "question": "12. Which vitamin should be taken with iron supplements to increase absorption?",
        "options": ["A) Vitamin A", "B) Vitamin C", "C) Vitamin D", "D) Vitamin K"],
        "answer": "B" 
    },
    {
        "question": "13. Patients should avoid taking iron supplements concurrently with which substances because they decrease absorption?",
        "options": ["A) Milk, antacids, and calcium", "B) Citrus fruits and juices", "C) Lean red meats", "D) Vitamin C supplements"],
        "answer": "A" 
    },
    {
        "question": "14. What term describes a decrease in all three blood cell lines (RBCs, WBCs, and platelets) seen in Aplastic Anemia?",
        "options": ["A) Polycythemia", "B) Pancytopenia", "C) Thrombocythemia", "D) Leukocytosis"],
        "answer": "B" 
    },
    {
        "question": "15. What aggressive medical treatment is used in aplastic anemia to prevent the patient's lymphocytes from destroying stem cells?",
        "options": ["A) Antithymocyte globulin and cyclosporine", "B) Heparin and protamine sulfate", "C) Vitamin B12 injections", "D) Iron chelation therapy"],
        "answer": "A" 
    },
    {
        "question": "16. Megaloblastic anemia is caused by a deficiency of vitamin B12 or which other essential nutrient?",
        "options": ["A) Calcium", "B) Folic acid", "C) Potassium", "D) Sodium"],
        "answer": "B" 
    },
    {
        "question": "17. Which substance normally secreted by gastric mucosa cells binds with dietary vitamin B12 so it can be absorbed in the ileum?",
        "options": ["A) Hydrochloric acid", "B) Intrinsic factor", "C) Pepsinogen", "D) Bile salts"],
        "answer": "B" 
    },
    {
        "question": "18. What specific type of megaloblastic anemia results from the absence of intrinsic factor?",
        "options": ["A) Iron deficiency anemia", "B) Pernicious anemia", "C) Aplastic anemia", "D) Sickle cell anemia"],
        "answer": "B" 
    },
    {
        "question": "19. Which diagnostic test uses a small oral dose of radioactive vitamin B12 followed by a large parenteral non-radioactive dose to check for malabsorption?",
        "options": ["A) Schilling test", "B) Bone marrow biopsy", "C) Peripheral blood smear", "D) Intrinsic factor antibody test"],
        "answer": "A" 
    },
    {
        "question": "20. What is the long-term maintenance therapy schedule for Vitamin B12 injections in patients with pernicious anemia?",
        "options": ["A) Daily", "B) Weekly", "C) Monthly", "D) Yearly"],
        "answer": "C" 
    },
    {
        "question": "21. What tongue manifestation is classically assessed in patients with pernicious anemia or iron deficiency anemia?",
        "options": ["A) Black, hairy tongue", "B) Smooth, red, and sore tongue (glossitis)", "C) White patched tongue", "D) Dry, cracked geographical tongue"],
        "answer": "B" 
    },
    {
        "question": "22. What skin manifestation involving patchy loss of pigmentation is commonly assessed in patients with pernicious anemia?",
        "options": ["A) Vitiligo", "B) Jaundice", "C) Purpura", "D) Petechiae"],
        "answer": "A" 
    },
    {
        "question": "23. Which environmental factor can trigger a Sickle Cell crisis due to decreased oxygen pressure?",
        "options": ["A) Swimming in warm water", "B) Climbing or flying to high altitudes", "C) Consuming high-protein meals", "D) Sleeping on an orthopedic mattress"],
        "answer": "B" 
    },
    {
        "question": "24. What facial bone structural change is characteristic of beta-thalassemia due to bone marrow expansion?",
        "options": ["A) Moon face", "B) Chipmunk face", "C) Lion face", "D) Buffalo hump"],
        "answer": "B" 
    },
    {
        "question": "25. Which medication is an iron-chelating agent prescribed to remove excess iron from organs in thalassemia patients receiving regular blood transfusions?",
        "options": ["A) Deferoxamine", "B) Furosemide", "C) Hydroxyurea", "D) Prednisone"],
        "answer": "A" 
    },
    {
        "question": "26. Why might furosemide be administered midway through a blood transfusion for a patient with thalassemia?",
        "options": ["A) To prevent fluid congestion/overload", "B) To increase iron absorption", "C) To lower platelet counts", "D) To prevent allergic reactions"],
        "answer": "A" 
    },
    {
        "question": "27. What symptom is notably common and unique in individuals with Polycythemia Vera, especially after taking a hot shower?",
        "options": ["A) Numbness", "B) Itchiness", "C) Dizziness", "D) Joint pain"],
        "answer": "B" 
    },
    {
        "question": "28. What platelet count threshold defines Primary Thrombocythemia (Essential Thrombocythemia)?",
        "options": ["A) Greater than 100,000/mm3", "B) Greater than 300,000/mm3", "C) Consistently greater than 600,000/mm3", "D) Greater than 1,000,000/mm3"],
        "answer": "C" 
    },
    {
        "question": "29. What term describes the painful burning, warmth, and redness in localized distal extremities experienced in thrombocythemia?",
        "options": ["A) Erythromelalgia", "B) Raynaud's phenomenon", "C) Koilonychia", "D) Glossitis"],
        "answer": "A" 
    },
    {
        "question": "30. Which oral chemotherapeutic medication is effective in lowering platelet counts in primary thrombocythemia?",
        "options": ["A) Hydroxyurea (Hydrea)", "B) Digoxin", "C) Warfarin", "D) Furosemide"],
        "answer": "A" 
    },
    {
        "question": "31. At what platelet count level can spontaneous, potentially fatal CNS or GI hemorrhages occur?",
        "options": ["A) Less than 50,000/mm3", "B) Less than 20,000/mm3", "C) Less than 10,000/mm3", "D) Less than 5,000/mm3"],
        "answer": "D" 
    },
    {
        "question": "32. What type of nursing intervention or stool softener is recommended to prevent constipation and avoid the Valsalva maneuver in thrombocytopenic patients?",
        "options": ["A) Lactulose / stool softeners", "B) Enemas and rectal suppositories", "C) High-fiber diet with hard manual disimpaction", "D) Regular use of harsh stimulant laxatives"],
        "answer": "A" 
    },
    {
        "question": "33. The acute form of Idiopathic Thrombocytopenic Purpura (ITP) frequently appears how long after a viral illness in children?",
        "options": ["A) 1 to 6 days", "B) 1 to 6 weeks", "C) 6 to 12 months", "D) Exactly 2 years"],
        "answer": "B" 
    },
    {
        "question": "34. In ITP, bleeding from mucosal surfaces (GI, pulmonary) is classified as what type of purpura, carrying a greater risk for intracranial bleeding?",
        "options": ["A) Dry purpura", "B) Wet purpura", "C) Secondary purpura", "D) Benign purpura"],
        "answer": "B" 
    },
    {
        "question": "35. Which vaccines should be administered 2 to 3 weeks before a scheduled splenectomy to prevent post-splenectomy sepsis?",
        "options": ["A) Pneumovax, Haemophilus influenzae B, and meningococcal vaccines", "B) BCG and Hepatitis B vaccines", "C) Tetanus toxoid and rabies vaccines", "D) MMR and Varicella vaccines"],
        "answer": "A" 
    },
    {
        "question": "36. Hemophilia A is an X-linked inherited bleeding disorder caused by a deficiency or defect in which clotting factor?",
        "options": ["A) Factor V", "B) Factor VIII", "C) Factor IX", "D) Factor XIII"],
        "answer": "B" 
    },
    {
        "question": "37. Hemophilia B (Christmas disease) is caused by a deficiency or defect in which clotting factor?",
        "options": ["A) Factor VII", "B) Factor VIII", "C) Factor IX", "D) Factor X"],
        "answer": "C" 
    },
    {
        "question": "38. What synthetic vasopressin analog induces a transient rise in factor VIII levels and is useful in mild hemophilia A and von Willebrand's disease?",
        "options": ["A) Desmopressin (DDAVP)", "B) Aminocaproic acid", "C) Phytonadione", "D) Protamine sulfate"],
        "answer": "A" 
    },
    {
        "question": "39. In von Willebrand's disease, laboratory tests typically show a normal platelet count alongside which findings?",
        "options": ["A) Prolonged bleeding time and slightly prolonged PTT", "B) Shortened bleeding time and normal PTT", "C) Decreased PT and normal INR", "D) Elevated fibrinogen levels"],
        "answer": "A" 
    },
    {
        "question": "40. With the exception of factor VIII, where are most blood coagulation factors synthesized in the body?",
        "options": ["A) Kidneys", "B) Spleen", "C) Liver", "D) Bone marrow"],
        "answer": "C" 
    },
    {
        "question": "41. What medication is administered orally or subcutaneously to quickly correct a vitamin K deficiency?",
        "options": ["A) Phytonadione (Mephyton)", "B) Protamine sulfate", "C) Deferoxamine", "D) Hydroxyurea"],
        "answer": "A" 
    },
    {
        "question": "42. What complex condition is characterized by the formation of massive tiny clots in the microcirculation, depleting platelets and clotting factors?",
        "options": ["A) Disseminated Intravascular Coagulopathy (DIC)", "B) Polycythemia Vera", "C) Essential Thrombocythemia", "D) Von Willebrand's Disease"],
        "answer": "A" 
    },
    {
        "question": "43. Which blood product is given in DIC to specifically replace fibrinogen and factors V and VII?",
        "options": ["A) Cryoprecipitate", "B) Packed Red Blood Cells", "C) Platelet concentrate", "D) Albumin solution"],
        "answer": "A" 
    },
    {
        "question": "44. What reversal agent is prescribed for warfarin (coumarin derivative) toxicity?",
        "options": ["A) Vitamin K", "B) Protamine sulfate", "C) Calcium gluconate", "D) Naloxone"],
        "answer": "A" 
    },
    {
        "question": "45. What medication is used to promptly reverse the effects of heparin toxicity?",
        "options": ["A) Protamine sulfate", "B) Vitamin K", "C) Iron dextran", "D) Furosemide"],
        "answer": "A" 
    },
    {
        "question": "46. What serious immunologic complication of heparin therapy causes a falling platelet count below 100,000/mL after more than 5 days of use?",
        "options": ["A) Heparin-induced thrombocytopenia (HIT)", "B) Idiopathic thrombocytopenic purpura", "C) Thrombotic thrombocytopenic purpura", "D) Primary thrombocythemia"],
        "answer": "A" 
    },
    {
        "question": "47. According to drug interaction guidelines, which vitamin or supplement decreases the anticoagulant effect of oral anticoagulants?",
        "options": ["A) Vitamin C", "B) Vitamin E", "C) Garlic", "D) Gingko"],
        "answer": "A" 
    },
    {
        "question": "48. What is the normal serum iron reference range for adult males?",
        "options": ["A) 20-50 mcg/dL", "B) 60-180 mcg/dL (or 14-32 µmol/L)", "C) 200-300 mcg/dL", "D) 350-500 mcg/dL"],
        "answer": "B" 
    },
    {
        "question": "49. What is the normal reference percentage for a Reticulocyte count?",
        "options": ["A) 0.5% - 1.5%", "B) 3.0% - 5.0%", "C) 10.0% - 15.0%", "D) 20.0% - 25.0%"],
        "answer": "A" 
    },
    {
        "question": "50. What inheritance pattern characterizes the transmission of Thalassemia disorders?",
        "options": ["A) Autosomal recessive trait", "B) X-linked dominant trait", "C) Autosomal dominant trait", "D) Y-linked trait"],
        "answer": "A" 
    }
]`;
const SEED_TITLE = "NCM 215A · Unit 3.1 Hematologic Disorders";

/* ---------- parsing ---------- */
function normalizeQuestions(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("No questions found in that data.");
  }
  return parsed.map((q, i) => {
    const qText = q.question ?? q.q ?? q.prompt ?? `Question ${i + 1}`;
    const rawOptions = q.options ?? q.answerOptions ?? q.choices ?? [];

    const options = rawOptions.map((opt, j) => {
      // object-style option, e.g. {text, isCorrect, rationale}
      if (opt && typeof opt === "object" && !Array.isArray(opt)) {
        return {
          letter: String.fromCharCode(65 + j),
          text: String(opt.text ?? opt.option ?? opt.label ?? ""),
          isCorrect: Boolean(opt.isCorrect ?? opt.correct ?? false),
          rationale: opt.rationale ?? opt.explanation ?? null,
        };
      }
      // plain-string option, e.g. "A) Blue"
      const m = String(opt).match(/^\s*([A-Za-z])[).]\s*(.*)$/);
      return m
        ? { letter: m[1].toUpperCase(), text: m[2] }
        : { letter: String.fromCharCode(65 + j), text: String(opt) };
    });

    let answer = String(q.answer ?? q.correct ?? "").trim().toUpperCase().replace(/[).].*$/, "");
    if (!answer) {
      const correctOpt = options.find((o) => o.isCorrect);
      if (correctOpt) answer = correctOpt.letter;
    }

    let explanation = q.explanation ?? q.rationale ?? q.hint ?? null;
    if (!explanation) {
      const correctOpt = options.find((o) => o.letter === answer);
      if (correctOpt && correctOpt.rationale) explanation = correctOpt.rationale;
    }

    return { id: i, question: String(qText), options, answer, explanation };
  });
}

// Finds where the question list actually starts. Prefers a named key
// ("questions" / "quiz_questions" / "items") over the very first '[' in the
// text, since that first bracket might belong to a nested list (e.g. an
// options array inside question #1) rather than the outer question list.
function findListStart(text) {
  const keyed = text.match(/(?:"quiz_questions"|"questions"|"items"|quiz_questions)\s*[:=]\s*\[/);
  if (keyed) return keyed.index + keyed[0].length - 1;
  return text.indexOf("[");
}

// Handles: Python lists (Gemini-style, with comments), plain JSON arrays,
// JSON objects that wrap the list under a key like "questions" (optionally
// nested, with per-option isCorrect/rationale fields), and Python literals
// (True/False/None) in place of JSON booleans/null.
function parseStructured(text) {
  const start = findListStart(text);
  if (start === -1) return null;

  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) throw new Error("The question list is missing a closing ']'.");

  let arr = text.slice(start, end);
  arr = arr.replace(/#.*$/gm, "");           // strip python comments
  arr = arr.replace(/,(\s*[}\]])/g, "$1");   // strip trailing commas

  let parsed;
  try {
    parsed = JSON.parse(arr);
  } catch (e) {
    // retry, swapping Python literals for their JSON equivalents
    // (only at value positions, to avoid touching option text)
    const pyFixed = arr
      .replace(/:\s*True\b/g, ": true")
      .replace(/:\s*False\b/g, ": false")
      .replace(/:\s*None\b/g, ": null");
    try {
      parsed = JSON.parse(pyFixed);
    } catch (e2) {
      return null; // let the caller try a different strategy
    }
  }
  return normalizeQuestions(parsed);
}

// Handles plain-text quiz exports, e.g.:
//   1. What is X?
//   A) foo
//   B) bar
//   Answer: B
function parsePlainText(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = null;

  const questionRe = /^\s*(?:Q\s*\d*[:.)]|(\d+)[.)])\s*(.+)$/i;
  const optionRe = /^\s*\(?([A-Da-d])\)?[.):]\s*(.+)$/;
  const answerRe = /^\s*(?:answer|ans|correct)\s*[:\-]?\s*\(?([A-Da-d])\)?\.?\s*$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const ansMatch = line.match(answerRe);
    if (ansMatch && current) {
      current.answer = ansMatch[1].toUpperCase();
      continue;
    }

    const optMatch = line.match(optionRe);
    if (optMatch && current) {
      current.options.push({ letter: optMatch[1].toUpperCase(), text: optMatch[2].trim() });
      continue;
    }

    const qMatch = line.match(questionRe);
    if (qMatch) {
      if (current && current.options.length) blocks.push(current);
      current = { question: qMatch[2].trim(), options: [], answer: null };
      continue;
    }

    // a stray line: if we're mid-question with no options yet, treat it as
    // a continuation of the question text; otherwise ignore it.
    if (current && current.options.length === 0) {
      current.question += " " + line;
    }
  }
  if (current && current.options.length) blocks.push(current);

  const withAnswers = blocks.filter((b) => b.answer);
  if (withAnswers.length === 0) {
    throw new Error("Couldn't find any question/option/answer blocks in that text.");
  }
  return withAnswers.map((b, i) => ({
    id: i,
    question: b.question,
    options: b.options,
    answer: b.answer,
    explanation: null,
  }));
}

function parseQuizSource(raw) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Paste or upload some question data first.");

  const structured = parseStructured(text);
  if (structured) return structured;

  return parsePlainText(text);
}

/* ---------- storage helpers ---------- */
async function loadDeckList() {
  try {
    const res = await window.storage.get("deck-list", false);
    return res ? JSON.parse(res.value) : [];
  } catch {
    return [];
  }
}
async function saveDeckList(list) {
  await window.storage.set("deck-list", JSON.stringify(list), false);
}
async function loadDeck(id) {
  try {
    const res = await window.storage.get(`deck:${id}`, false);
    return res ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}
async function saveDeck(deck) {
  await window.storage.set(`deck:${deck.id}`, JSON.stringify(deck), false);
}
async function deleteDeckStorage(id) {
  try { await window.storage.delete(`deck:${id}`, false); } catch {}
}
function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- UI atoms ---------- */
function Pill({ tone, icon, count }) {
  const styles = {
    good: { background: "rgba(52,199,123,0.15)", color: "#4ADE94", border: "1px solid rgba(52,199,123,0.3)" },
    bad: { background: "rgba(241,101,101,0.15)", color: "#FF8787", border: "1px solid rgba(241,101,101,0.3)" },
  };
  return (
    <div
      style={{
        ...styles[tone],
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
      }}
    >
      {icon}
      {count}
    </div>
  );
}

/* ---------- main app ---------- */
export default function StudyDeckApp() {
  const [view, setView] = useState("loading"); // loading | library | import | quiz | summary
  const [decks, setDecks] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [order, setOrder] = useState([]); // array of question indices, in play order
  const [pos, setPos] = useState(0);
  const [selected, setSelected] = useState({}); // questionIndex -> chosen letter
  const [importError, setImportError] = useState("");
  const [importText, setImportText] = useState("");
  const [importName, setImportName] = useState("");
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState("");
  const fileInputRef = useRef(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameCancelledRef = useRef(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [combining, setCombining] = useState(false);

  useEffect(() => {
    (async () => {
      let list = await loadDeckList();
      if (list.length === 0) {
        try {
          const questions = parseQuizSource(SEED_RAW);
          const id = "seed-hematologic";
          const deck = { id, name: SEED_TITLE, questions, createdAt: Date.now() };
          await saveDeck(deck);
          list = [{ id, name: SEED_TITLE, count: questions.length, createdAt: deck.createdAt }];
          await saveDeckList(list);
        } catch (e) {
          // seed failed to parse; just start empty
        }
      }
      setDecks(list);
      setView("library");
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshLibrary = useCallback(async () => {
    setDecks(await loadDeckList());
  }, []);

  async function handleImport() {
    setImportError("");
    let questions;
    try {
      questions = parseQuizSource(importText);
    } catch (e) {
      setImportError(e.message);
      return;
    }
    setImporting(true);
    const id = `deck-${Date.now()}`;
    const name = importName.trim() || `Imported deck (${questions.length} items)`;
    const deck = { id, name, questions, createdAt: Date.now() };
    await saveDeck(deck);
    const list = await loadDeckList();
    list.unshift({ id, name, count: questions.length, createdAt: deck.createdAt });
    await saveDeckList(list);
    setDecks(list);
    setImportText("");
    setImportName("");
    setImporting(false);
    setToast(`Saved “${name}”`);
    setView("library");
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ""));
      if (!importName) setImportName(file.name.replace(/\.(py|json|txt)$/i, ""));
    };
    reader.onerror = () => setImportError("Couldn't read that file.");
    reader.readAsText(file);
  }

  async function startQuiz(deckMeta, opts = { reshuffle: false }) {
    const deck = await loadDeck(deckMeta.id);
    if (!deck) { setToast("Couldn't load that deck."); return; }
    const idxs = deck.questions.map((_, i) => i);
    setActiveDeck(deck);
    setOrder(opts.reshuffle ? shuffle(idxs) : idxs);
    setPos(0);
    setSelected({});
    setView("quiz");
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    const list = (await loadDeckList()).filter((d) => d.id !== id);
    await saveDeckList(list);
    await deleteDeckStorage(id);
    setDecks(list);
  }

  function startRename(d, e) {
    e.stopPropagation();
    setRenamingId(d.id);
    setRenameValue(d.name);
  }

  function cancelRename() {
    renameCancelledRef.current = true;
    setRenamingId(null);
  }

  async function commitRename(id) {
    if (renameCancelledRef.current) {
      renameCancelledRef.current = false;
      return;
    }
    const newName = renameValue.trim();
    setRenamingId(null);
    if (!newName) return;
    const list = await loadDeckList();
    const idx = list.findIndex((d) => d.id === id);
    if (idx === -1) return;
    if (list[idx].name === newName) return;
    list[idx] = { ...list[idx], name: newName };
    await saveDeckList(list);
    const deck = await loadDeck(id);
    if (deck) await saveDeck({ ...deck, name: newName });
    setDecks(list);
    setToast("Renamed");
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelected(id, e) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCombine() {
    if (selectedIds.size < 2) return;
    setCombining(true);
    const ids = [...selectedIds];
    const fullDecks = (await Promise.all(ids.map((id) => loadDeck(id)))).filter(Boolean);
    const combinedQuestions = fullDecks.flatMap((d) => d.questions.map((q) => ({ ...q })));
    combinedQuestions.forEach((q, i) => { q.id = i; });
    const deckMetas = await loadDeckList();
    const namesInOrder = ids
      .map((id) => deckMetas.find((d) => d.id === id)?.name)
      .filter(Boolean);
    const name = namesInOrder.length
      ? `${namesInOrder.join(" + ")}`.slice(0, 120)
      : `Combined deck (${combinedQuestions.length} items)`;
    const id = uniqueId("deck");
    const deck = { id, name, questions: combinedQuestions, createdAt: Date.now() };
    await saveDeck(deck);
    const list = await loadDeckList();
    list.unshift({ id, name, count: combinedQuestions.length, createdAt: deck.createdAt });
    await saveDeckList(list);
    setDecks(list);
    setCombining(false);
    setSelectMode(false);
    setSelectedIds(new Set());
    setToast(`Combined into “${name}”`);
  }

  function choose(letter) {
    setSelected((s) => (s[pos] !== undefined ? s : { ...s, [pos]: letter }));
  }

  function goNext() {
    if (pos < order.length - 1) setPos(pos + 1);
    else setView("summary");
  }
  function goBack() {
    if (pos > 0) setPos(pos - 1);
  }

  const correctCount = Object.entries(selected).filter(
    ([qIdx, letter]) => activeDeck && letter === activeDeck.questions[order[qIdx]].answer
  ).length;
  const incorrectCount = Object.keys(selected).length - correctCount;

  /* ---------- render ---------- */
  return (
    <div style={{ "--font-ui": "'Inter', system-ui, sans-serif", "--font-serif": "'Source Serif 4', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap');
        .sd-root { font-family: var(--font-ui); background: #14161A; color: #EDEFF2; min-height: 560px; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
        .sd-scroll { overflow-y: auto; flex: 1; }
        .sd-row { transition: background 120ms ease, border-color 120ms ease; }
        .sd-row:hover { background: #21242B; }
        .sd-btn { font-family: var(--font-ui); cursor: pointer; border: none; }
        .sd-btn:focus-visible, .sd-opt:focus-visible, .sd-icon:focus-visible { outline: 2px solid #4C8DFF; outline-offset: 2px; }
        .sd-opt { transition: background 120ms ease, border-color 120ms ease; }
        .sd-icon { transition: background 120ms ease; }
        .sd-icon:hover { background: rgba(255,255,255,0.08); }
        ::selection { background: rgba(76,141,255,0.35); }
        .sd-scroll::-webkit-scrollbar { width: 8px; }
        .sd-scroll::-webkit-scrollbar-thumb { background: #2A2E36; border-radius: 8px; }
      `}</style>

      <div className="sd-root">
        {view === "loading" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "#767C87" }}>
            Loading your decks…
          </div>
        )}

        {view === "library" && (
          <Library
            decks={decks}
            onOpen={(d) => startQuiz(d)}
            onShuffleOpen={(d) => startQuiz(d, { reshuffle: true })}
            onDelete={handleDelete}
            onImport={() => { setImportError(""); setView("import"); }}
            renamingId={renamingId}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            onStartRename={startRename}
            onCommitRename={commitRename}
            onCancelRename={cancelRename}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelectMode={toggleSelectMode}
            onToggleSelected={toggleSelected}
            onCombine={handleCombine}
            combining={combining}
          />
        )}

        {view === "import" && (
          <ImportView
            name={importName}
            setName={setImportName}
            text={importText}
            setText={setImportText}
            error={importError}
            importing={importing}
            onFile={handleFile}
            fileInputRef={fileInputRef}
            onCancel={() => setView("library")}
            onSubmit={handleImport}
          />
        )}

        {view === "quiz" && activeDeck && (
          <QuizView
            deck={activeDeck}
            order={order}
            pos={pos}
            selected={selected}
            correctCount={correctCount}
            incorrectCount={incorrectCount}
            onChoose={choose}
            onNext={goNext}
            onBack={goBack}
            onClose={() => setView("library")}
          />
        )}

        {view === "summary" && activeDeck && (
          <SummaryView
            deck={activeDeck}
            total={order.length}
            correctCount={correctCount}
            incorrectCount={incorrectCount}
            onRetake={() => startQuiz({ id: activeDeck.id }, { reshuffle: false })}
            onShuffleRetake={() => startQuiz({ id: activeDeck.id }, { reshuffle: true })}
            onLibrary={() => setView("library")}
          />
        )}
      </div>

      {toast && (
        <div style={{
          marginTop: 10, textAlign: "center", fontSize: 13, color: "#9AA1AC", fontFamily: "var(--font-ui)",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- Library ---------- */
function Library({
  decks, onOpen, onShuffleOpen, onDelete, onImport,
  renamingId, renameValue, setRenameValue, onStartRename, onCommitRename, onCancelRename,
  selectMode, selectedIds, onToggleSelectMode, onToggleSelected, onCombine, combining,
}) {
  return (
    <>
      <div style={{ padding: "20px 22px 14px", borderBottom: "1px solid #21242B" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600 }}>Your decks</div>
           <button onClick={onTestBackend}>
            Test Backend
            </button>
          {decks.length > 1 && (
            <button
              className="sd-btn"
              onClick={onToggleSelectMode}
              style={{
                fontSize: 13, fontWeight: 500, background: "transparent",
                color: selectMode ? "#EDEFF2" : "#9AA1AC", padding: "6px 10px", borderRadius: 8,
                border: selectMode ? "1px solid #2A2E36" : "1px solid transparent",
              }}
            >
              {selectMode ? "Done" : "Combine decks"}
            </button>
          )}
        </div>
        <div style={{ color: "#767C87", fontSize: 13, marginTop: 3 }}>
          {selectMode
            ? "Select two or more decks to merge into one."
            : decks.length === 0
              ? "Nothing here yet."
              : `${decks.length} deck${decks.length === 1 ? "" : "s"} saved on this device`}
        </div>
      </div>

      <div className="sd-scroll" style={{ padding: 14 }}>
        {decks.length === 0 && (
          <div style={{
            border: "1px dashed #2A2E36", borderRadius: 10, padding: "36px 20px",
            textAlign: "center", color: "#767C87", fontSize: 14,
          }}>
            Import a question set from Gemini to get started.
          </div>
        )}

        {decks.map((d) => {
          const isRenaming = renamingId === d.id;
          const isSelected = selectedIds.has(d.id);
          return (
            <div
              key={d.id}
              className="sd-row"
              onClick={() => { if (selectMode) return; if (!isRenaming) onOpen(d); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 14px", borderRadius: 10, cursor: selectMode || isRenaming ? "default" : "pointer",
                marginBottom: 6, border: isSelected ? "1px solid rgba(76,141,255,0.5)" : "1px solid transparent",
                background: isSelected ? "rgba(76,141,255,0.08)" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                {selectMode ? (
                  <button
                    className="sd-icon sd-btn"
                    onClick={(e) => onToggleSelected(d.id, e)}
                    style={{ width: 22, height: 22, background: "transparent", color: isSelected ? "#4C8DFF" : "#4B5058", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {isSelected ? <CheckSquare size={19} /> : <Square size={19} />}
                  </button>
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: "#1E2126",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <FileText size={16} color="#6E9BFF" />
                  </div>
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.target.blur();
                        if (e.key === "Escape") onCancelRename();
                      }}
                      onBlur={() => onCommitRename(d.id)}
                      style={{
                        width: "100%", background: "#14161A", border: "1px solid #4C8DFF", borderRadius: 6,
                        padding: "5px 8px", color: "#EDEFF2", fontSize: 14.5, fontFamily: "var(--font-ui)",
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 14.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {d.name}
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, color: "#767C87", marginTop: 2 }}>{d.count} questions</div>
                </div>
              </div>

              {!selectMode && !isRenaming && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button
                    className="sd-icon sd-btn"
                    title="Rename deck"
                    onClick={(e) => onStartRename(d, e)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#9AA1AC" }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="sd-icon sd-btn"
                    title="Shuffle & start"
                    onClick={(e) => { e.stopPropagation(); onShuffleOpen(d); }}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#9AA1AC" }}
                  >
                    <Shuffle size={15} />
                  </button>
                  <button
                    className="sd-icon sd-btn"
                    title="Delete deck"
                    onClick={(e) => onDelete(d.id, e)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#9AA1AC" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: 16, borderTop: "1px solid #21242B" }}>
        {selectMode ? (
          <button
            className="sd-btn"
            onClick={onCombine}
            disabled={selectedIds.size < 2 || combining}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              background: selectedIds.size < 2 || combining ? "#2A2E36" : "#4C8DFF",
              color: selectedIds.size < 2 || combining ? "#767C87" : "#fff",
              fontSize: 14.5, fontWeight: 600, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8,
            }}
          >
            <Layers size={16} />
            {combining ? "Combining…" : selectedIds.size >= 2 ? `Combine ${selectedIds.size} decks` : "Select 2 or more decks"}
          </button>
        ) : (
          <button
            className="sd-btn"
            onClick={onImport}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10, background: "#4C8DFF",
              color: "#fff", fontSize: 14.5, fontWeight: 600, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8,
            }}
          >
            <Plus size={17} /> Import new deck
          </button>
        )}
      </div>
    </>
  );
}

/* ---------- Import ---------- */
function ImportView({ name, setName, text, setText, error, importing, onFile, fileInputRef, onCancel, onSubmit }) {
  return (
    <>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid #21242B", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="sd-icon sd-btn" onClick={onCancel} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#9AA1AC", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={17} />
        </button>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 600 }}>Import a deck</div>
      </div>

      <div className="sd-scroll" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: "#9AA1AC", lineHeight: 1.5 }}>
          Paste or upload a question set — a Gemini-generated Python file with a{" "}
          <code style={{ color: "#C7D5F5" }}>quiz_questions</code> list, a plain JSON array, or a
          plain-text list like <code style={{ color: "#C7D5F5" }}>1. Question / A) … / Answer: B</code>.
          Comments and formatting quirks are handled automatically.
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Deck name (optional)"
          style={{
            background: "#1E2126", border: "1px solid #2A2E36", borderRadius: 8, padding: "10px 12px",
            color: "#EDEFF2", fontSize: 14, fontFamily: "var(--font-ui)",
          }}
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your quiz_questions Python, a JSON array, or plain Q/A text here…"
          style={{
            background: "#1E2126", border: "1px solid #2A2E36", borderRadius: 8, padding: "12px",
            color: "#EDEFF2", fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            minHeight: 220, resize: "vertical", lineHeight: 1.5,
          }}
        />

        <input ref={fileInputRef} type="file" accept=".py,.json,.txt" onChange={onFile} style={{ display: "none" }} />
        <button
          className="sd-btn"
          onClick={() => fileInputRef.current?.click()}
          style={{
            alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8,
            background: "transparent", border: "1px solid #2A2E36", color: "#C7D5F5",
            padding: "8px 14px", borderRadius: 8, fontSize: 13,
          }}
        >
          <Upload size={14} /> Upload a file instead
        </button>

        {error && (
          <div style={{ color: "#FF8787", fontSize: 13, background: "rgba(241,101,101,0.1)", border: "1px solid rgba(241,101,101,0.25)", borderRadius: 8, padding: "10px 12px" }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: "1px solid #21242B", display: "flex", gap: 10 }}>
        <button
          className="sd-btn"
          onClick={onCancel}
          style={{ padding: "11px 18px", borderRadius: 10, background: "#1E2126", color: "#C6CAD2", fontSize: 14, fontWeight: 500 }}
        >
          Cancel
        </button>
        <button
          className="sd-btn"
          disabled={importing || !text.trim()}
          onClick={onSubmit}
          style={{
            flex: 1, padding: "11px 18px", borderRadius: 10,
            background: importing || !text.trim() ? "#2A2E36" : "#4C8DFF",
            color: importing || !text.trim() ? "#767C87" : "#fff",
            fontSize: 14, fontWeight: 600,
          }}
        >
          {importing ? "Saving…" : "Parse & save deck"}
        </button>
      </div>
    </>
  );
}

/* ---------- Quiz ---------- */
function QuizView({ deck, order, pos, selected, correctCount, incorrectCount, onChoose, onNext, onBack, onClose }) {
  const qIndex = order[pos];
  const q = deck.questions[qIndex];
  const chosen = selected[pos];
  const answered = chosen !== undefined;
  const progress = ((pos + (answered ? 1 : 0)) / order.length) * 100;

  return (
    <>
      <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid #21242B" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 12 }}>
            {deck.name}
          </div>
          <button className="sd-icon sd-btn" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", color: "#9AA1AC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1, height: 4, background: "#21242B", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "#4C8DFF", borderRadius: 999, transition: "width 200ms ease" }} />
          </div>
          <div style={{ fontSize: 12.5, color: "#767C87", flexShrink: 0 }}>{pos + 1} / {order.length}</div>
          <Pill tone="bad" icon={<X size={11} />} count={incorrectCount} />
          <Pill tone="good" icon={<Check size={11} />} count={correctCount} />
        </div>
      </div>

      <div className="sd-scroll" style={{ padding: "22px 22px 10px" }}>
        <div style={{ fontSize: 12.5, color: "#767C87", marginBottom: 8, fontWeight: 500 }}>Question {pos + 1}</div>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 19, lineHeight: 1.45, marginBottom: 20 }}>
          {q.question.replace(/^\d+\.\s*/, "")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((opt) => {
            const isCorrect = opt.letter === q.answer;
            const isChosen = opt.letter === chosen;
            let bg = "#1E2126", border = "1px solid #2A2E36";
            if (answered && isCorrect) { bg = "rgba(52,199,123,0.12)"; border = "1px solid rgba(52,199,123,0.4)"; }
            if (answered && isChosen && !isCorrect) { bg = "rgba(241,101,101,0.12)"; border = "1px solid rgba(241,101,101,0.4)"; }

            return (
              <button
                key={opt.letter}
                className="sd-opt sd-btn"
                disabled={answered}
                onClick={() => onChoose(opt.letter)}
                style={{
                  textAlign: "left", background: bg, border, borderRadius: 10, padding: "13px 14px",
                  cursor: answered ? "default" : "pointer", color: "#EDEFF2",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "#9AA1AC" }}>{opt.letter}.</span>
                    <span style={{ fontSize: 14.5 }}>
                      {opt.text}
                      {answered && isChosen && !isCorrect && (
                        <span style={{ color: "#767C87", fontSize: 12.5 }}> &nbsp;(your answer)</span>
                      )}
                    </span>
                  </div>
                  {answered && isCorrect && (
                    <span style={{ background: "rgba(52,199,123,0.18)", color: "#4ADE94", fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <Check size={11} /> Correct
                    </span>
                  )}
                  {answered && isChosen && !isCorrect && (
                    <span style={{ background: "rgba(241,101,101,0.18)", color: "#FF8787", fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <X size={11} /> Incorrect
                    </span>
                  )}
                </div>
                {answered && isCorrect && (opt.rationale || q.explanation) && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#9AA1AC", lineHeight: 1.5 }}>{opt.rationale || q.explanation}</div>
                )}
                {answered && isChosen && !isCorrect && opt.rationale && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#767C87", lineHeight: 1.5 }}>{opt.rationale}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: 16, borderTop: "1px solid #21242B", display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          className="sd-btn"
          onClick={onBack}
          disabled={pos === 0}
          style={{ padding: "10px 18px", borderRadius: 10, background: "#1E2126", color: pos === 0 ? "#4B5058" : "#C6CAD2", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}
        >
          <ChevronLeft size={15} /> Back
        </button>
        <button
          className="sd-btn"
          onClick={onNext}
          disabled={!answered}
          style={{
            padding: "10px 20px", borderRadius: 10,
            background: answered ? "#4C8DFF" : "#2A2E36",
            color: answered ? "#fff" : "#767C87",
            fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {pos === order.length - 1 ? "Finish" : "Next"} <ChevronRight size={15} />
        </button>
      </div>
    </>
  );
}

/* ---------- Summary ---------- */
function SummaryView({ deck, total, correctCount, incorrectCount, onRetake, onShuffleRetake, onLibrary }) {
  const pct = total ? Math.round((correctCount / total) * 100) : 0;
  return (
    <div style={{ padding: "40px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: "#767C87", fontWeight: 500 }}>{deck.name}</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 48, fontWeight: 600, margin: "8px 0" }}>{pct}%</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
        <Pill tone="good" icon={<Check size={11} />} count={`${correctCount} correct`} />
        <Pill tone="bad" icon={<X size={11} />} count={`${incorrectCount} missed`} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        <button className="sd-btn" onClick={onShuffleRetake} style={{ padding: "12px 16px", borderRadius: 10, background: "#4C8DFF", color: "#fff", fontSize: 14.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Shuffle size={15} /> Retake, shuffled
        </button>
        <button className="sd-btn" onClick={onRetake} style={{ padding: "12px 16px", borderRadius: 10, background: "#1E2126", color: "#C6CAD2", fontSize: 14.5, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <RotateCcw size={15} /> Retake, same order
        </button>
        <button className="sd-btn" onClick={onLibrary} style={{ padding: "12px 16px", borderRadius: 10, background: "transparent", color: "#767C87", fontSize: 14 }}>
          Back to decks
        </button>
      </div>
    </div>
  );
}
