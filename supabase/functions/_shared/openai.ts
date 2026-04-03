export type TranscriptionResult = {
  transcript: string;
  language: string | null;
  model: string;
  durationSeconds: number | null;
};

export type SummarySections = {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  studyQuestions: string[];
};

export type SummaryResult = {
  summary: SummarySections;
  model: string;
  inputType: "transcript" | "pdf";
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export type FlashcardItem = {
  question: string;
  answer: string;
  keyPoints: string[];
};

export type FlashcardsResult = {
  flashcards: FlashcardItem[];
  model: string;
  inputType: "summary" | "transcript" | "pdf";
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

type OpenAiVerboseTranscriptionResponse = {
  text?: string;
  language?: string;
  duration?: number;
};

type OpenAiFileResponse = {
  id?: string;
};

type OpenAiUsageResponse = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

type OpenAiResponsesResponse = {
  model?: string;
  output_text?: string;
  usage?: OpenAiUsageResponse;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const SUMMARY_MODEL_DEFAULT = "gpt-4.1-mini";
const FLASHCARDS_MODEL_DEFAULT = "gpt-4.1-mini";
const SUMMARY_LIST_LIMITS = {
  keyPoints: 8,
  actionItems: 6,
  studyQuestions: 7,
};
const FLASHCARDS_DEFAULT_COUNT = 10;
const FLASHCARD_KEY_POINTS_LIMIT = 5;

const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["overview", "keyPoints", "actionItems", "studyQuestions"],
  properties: {
    overview: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
    },
    actionItems: {
      type: "array",
      items: { type: "string" },
    },
    studyQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const SUMMARY_SYSTEM_PROMPT = [
  "You are an aviation study assistant for student pilots.",
  "Summarize only what is present in the provided source material.",
  "Do not invent facts, numbers, procedures, or regulations.",
  "If source quality is weak or uncertain, explicitly acknowledge uncertainty in overview.",
  "Return concise, study-ready output in valid JSON that follows the requested schema.",
].join(" ");

const FLASHCARDS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["flashcards"],
  properties: {
    flashcards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer", "keyPoints"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          keyPoints: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const FLASHCARDS_SYSTEM_PROMPT = [
  "You are an aviation study assistant for student pilots.",
  "Generate study flashcards only from provided source content.",
  "Do not invent facts, procedures, numbers, or regulations.",
  "Keep cards concise and practical for oral-exam preparation.",
  "Return valid JSON that matches the requested schema.",
].join(" ");

function getOpenAiApiKey() {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim() ?? "";
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY runtime variable.");
  }
  return apiKey;
}

export async function transcribeAudioFile(
  audioBlob: Blob,
  options?: { model?: string; language?: string; fileName?: string },
): Promise<TranscriptionResult> {
  const apiKey = getOpenAiApiKey();
  const model = options?.model?.trim() || "gpt-4o-mini-transcribe";
  const fileName = options?.fileName?.trim() || "audio.m4a";
  const file = new File([audioBlob], fileName, {
    type: audioBlob.type || "application/octet-stream",
  });

  const form = new FormData();
  form.append("file", file);
  form.append("model", model);
  form.append("response_format", "json");
  if (options?.language?.trim()) {
    form.append("language", options.language.trim());
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenAI transcription failed with status ${response.status}: ${text || "Unknown error."}`,
    );
  }

  const payload = (await response.json()) as OpenAiVerboseTranscriptionResponse;
  const transcript = payload.text?.trim();
  if (!transcript) {
    throw new Error("OpenAI transcription returned empty transcript.");
  }

  return {
    transcript,
    language: payload.language?.trim() || null,
    model,
    durationSeconds: typeof payload.duration === "number" ? payload.duration : null,
  };
}

function clampToken(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function extractResponseText(payload: OpenAiResponsesResponse) {
  const direct = payload.output_text?.trim();
  if (direct) return direct;

  for (const outputItem of payload.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (contentItem.type === "output_text" && contentItem.text?.trim()) {
        return contentItem.text.trim();
      }
      if (contentItem.text?.trim()) {
        return contentItem.text.trim();
      }
    }
  }

  return "";
}

function sanitizeStringList(input: unknown, limit: number) {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= limit) break;
  }
  return out;
}

function parseSummaryFromJson(text: string): SummarySections {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Summary model response was not valid JSON.");
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("Summary model response must be a JSON object.");
  }

  const candidate = raw as Record<string, unknown>;
  const overview = typeof candidate.overview === "string" ? candidate.overview.trim() : "";
  if (!overview) {
    throw new Error("Summary model response missing `overview`.");
  }

  const keyPoints = sanitizeStringList(candidate.keyPoints, SUMMARY_LIST_LIMITS.keyPoints);
  const actionItems = sanitizeStringList(candidate.actionItems, SUMMARY_LIST_LIMITS.actionItems);
  const studyQuestions = sanitizeStringList(
    candidate.studyQuestions,
    SUMMARY_LIST_LIMITS.studyQuestions,
  );

  if (keyPoints.length === 0 || actionItems.length === 0 || studyQuestions.length === 0) {
    throw new Error(
      "Summary model response must include non-empty `keyPoints`, `actionItems`, and `studyQuestions`.",
    );
  }

  return {
    overview,
    keyPoints,
    actionItems,
    studyQuestions,
  };
}

function normalizeFlashcardsCount(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return FLASHCARDS_DEFAULT_COUNT;
  return Math.max(3, Math.min(Math.floor(value), 15));
}

function parseFlashcardsFromJson(text: string, maxCards: number): FlashcardItem[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Flashcards model response was not valid JSON.");
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("Flashcards model response must be a JSON object.");
  }

  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate.flashcards)) {
    throw new Error("Flashcards model response missing `flashcards` array.");
  }

  const out: FlashcardItem[] = [];
  const seen = new Set<string>();
  for (const item of candidate.flashcards) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const question = typeof record.question === "string" ? record.question.trim() : "";
    const answer = typeof record.answer === "string" ? record.answer.trim() : "";
    if (!question || !answer) continue;
    const dedupeKey = `${question.toLowerCase()}::${answer.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({
      question,
      answer,
      keyPoints: sanitizeStringList(record.keyPoints, FLASHCARD_KEY_POINTS_LIMIT),
    });
    if (out.length >= maxCards) break;
  }

  if (out.length === 0) {
    throw new Error("Flashcards model response did not include valid cards.");
  }

  return out;
}

function buildSummaryUserPrompt(inputKind: "transcript" | "pdf", sourceText?: string) {
  const base = [
    `Input type: ${inputKind}.`,
    "Create a student-pilot study summary with:",
    "- overview: 2-4 sentences",
    "- keyPoints: 4-8 concise bullets",
    "- actionItems: 3-6 concrete study steps",
    "- studyQuestions: 3-7 oral-exam style questions",
    "Keep language clear and practical for aviation training.",
  ].join("\n");

  if (inputKind === "transcript") {
    return `${base}\n\nTranscript:\n${sourceText ?? ""}`;
  }

  return `${base}\n\nThe source PDF is provided as an attached input file.`;
}

async function runStructuredSummaryRequest(
  apiKey: string,
  params: {
    model?: string;
    inputType: "transcript" | "pdf";
    input: Array<Record<string, unknown>>;
  },
): Promise<SummaryResult> {
  const model = params.model?.trim() || SUMMARY_MODEL_DEFAULT;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: params.input,
      text: {
        format: {
          type: "json_schema",
          name: "aviation_summary",
          strict: true,
          schema: SUMMARY_SCHEMA,
        },
      },
      max_output_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenAI summary request failed with status ${response.status}: ${text || "Unknown error."}`,
    );
  }

  const payload = (await response.json()) as OpenAiResponsesResponse;
  const outputText = extractResponseText(payload);
  if (!outputText) {
    throw new Error("OpenAI summary request returned empty output.");
  }

  const summary = parseSummaryFromJson(outputText);
  const usage = payload.usage ?? {};

  return {
    summary,
    model: payload.model?.trim() || model,
    inputType: params.inputType,
    tokenUsage: {
      inputTokens: clampToken(usage.input_tokens),
      outputTokens: clampToken(usage.output_tokens),
      totalTokens: clampToken(usage.total_tokens),
    },
  };
}

function buildFlashcardsUserPrompt(
  inputKind: "summary" | "transcript" | "pdf",
  count: number,
  sourceText?: string,
) {
  const base = [
    `Input type: ${inputKind}.`,
    `Create exactly ${count} aviation study flashcards in JSON format.`,
    "Each card must include:",
    "- question: oral-exam style prompt",
    "- answer: concise direct answer",
    "- keyPoints: 1-5 short bullets reinforcing the answer",
    "Focus on practical study value and clarity.",
  ].join("\n");

  if (inputKind === "pdf") {
    return `${base}\n\nThe source PDF is attached as an input file.`;
  }

  return `${base}\n\nSource:\n${sourceText ?? ""}`;
}

async function runStructuredFlashcardsRequest(
  apiKey: string,
  params: {
    model?: string;
    inputType: "summary" | "transcript" | "pdf";
    count: number;
    input: Array<Record<string, unknown>>;
  },
): Promise<FlashcardsResult> {
  const model = params.model?.trim() || FLASHCARDS_MODEL_DEFAULT;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: params.input,
      text: {
        format: {
          type: "json_schema",
          name: "aviation_flashcards",
          strict: true,
          schema: FLASHCARDS_SCHEMA,
        },
      },
      max_output_tokens: 1800,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenAI flashcards request failed with status ${response.status}: ${text || "Unknown error."}`,
    );
  }

  const payload = (await response.json()) as OpenAiResponsesResponse;
  const outputText = extractResponseText(payload);
  if (!outputText) {
    throw new Error("OpenAI flashcards request returned empty output.");
  }

  const flashcards = parseFlashcardsFromJson(outputText, params.count);
  const usage = payload.usage ?? {};

  return {
    flashcards,
    model: payload.model?.trim() || model,
    inputType: params.inputType,
    tokenUsage: {
      inputTokens: clampToken(usage.input_tokens),
      outputTokens: clampToken(usage.output_tokens),
      totalTokens: clampToken(usage.total_tokens),
    },
  };
}

async function uploadPdfToOpenAi(apiKey: string, pdfBlob: Blob, fileName: string) {
  const form = new FormData();
  const file = new File([pdfBlob], fileName, {
    type: pdfBlob.type || "application/pdf",
  });
  form.append("purpose", "user_data");
  form.append("file", file);

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI file upload failed with status ${response.status}: ${text || "Unknown error."}`);
  }

  const payload = (await response.json()) as OpenAiFileResponse;
  const fileId = payload.id?.trim();
  if (!fileId) {
    throw new Error("OpenAI file upload returned no file id.");
  }
  return fileId;
}

async function deleteOpenAiFile(apiKey: string, fileId: string) {
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch {
    // Best effort cleanup only.
  }
}

export async function summarizeTranscript(
  transcript: string,
  options?: { model?: string },
): Promise<SummaryResult> {
  const apiKey = getOpenAiApiKey();
  const inputText = transcript.trim();
  if (!inputText) {
    throw new Error("Cannot summarize empty transcript.");
  }

  return runStructuredSummaryRequest(apiKey, {
    model: options?.model,
    inputType: "transcript",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: SUMMARY_SYSTEM_PROMPT,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildSummaryUserPrompt("transcript", inputText),
          },
        ],
      },
    ],
  });
}

export async function summarizePdfFile(
  pdfBlob: Blob,
  options?: { model?: string; fileName?: string },
): Promise<SummaryResult> {
  const apiKey = getOpenAiApiKey();
  const fileName = options?.fileName?.trim() || "document.pdf";
  const fileId = await uploadPdfToOpenAi(apiKey, pdfBlob, fileName);

  try {
    return await runStructuredSummaryRequest(apiKey, {
      model: options?.model,
      inputType: "pdf",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: SUMMARY_SYSTEM_PROMPT,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_id: fileId,
            },
            {
              type: "input_text",
              text: buildSummaryUserPrompt("pdf"),
            },
          ],
        },
      ],
    });
  } finally {
    await deleteOpenAiFile(apiKey, fileId);
  }
}

export async function extractFlashcardsFromSummary(
  summary: SummarySections,
  options?: { model?: string; count?: number },
): Promise<FlashcardsResult> {
  const apiKey = getOpenAiApiKey();
  const count = normalizeFlashcardsCount(options?.count);
  const summaryText = [
    `Overview: ${summary.overview}`,
    `Key points: ${summary.keyPoints.join(" | ")}`,
    `Action items: ${summary.actionItems.join(" | ")}`,
    `Study questions: ${summary.studyQuestions.join(" | ")}`,
  ].join("\n");

  return runStructuredFlashcardsRequest(apiKey, {
    model: options?.model,
    inputType: "summary",
    count,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: FLASHCARDS_SYSTEM_PROMPT,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildFlashcardsUserPrompt("summary", count, summaryText),
          },
        ],
      },
    ],
  });
}

export async function extractFlashcardsFromTranscript(
  transcript: string,
  options?: { model?: string; count?: number },
): Promise<FlashcardsResult> {
  const apiKey = getOpenAiApiKey();
  const inputText = transcript.trim();
  if (!inputText) {
    throw new Error("Cannot extract flashcards from empty transcript.");
  }
  const count = normalizeFlashcardsCount(options?.count);

  return runStructuredFlashcardsRequest(apiKey, {
    model: options?.model,
    inputType: "transcript",
    count,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: FLASHCARDS_SYSTEM_PROMPT,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildFlashcardsUserPrompt("transcript", count, inputText),
          },
        ],
      },
    ],
  });
}

export async function extractFlashcardsFromPdfFile(
  pdfBlob: Blob,
  options?: { model?: string; fileName?: string; count?: number },
): Promise<FlashcardsResult> {
  const apiKey = getOpenAiApiKey();
  const fileName = options?.fileName?.trim() || "document.pdf";
  const count = normalizeFlashcardsCount(options?.count);
  const fileId = await uploadPdfToOpenAi(apiKey, pdfBlob, fileName);

  try {
    return await runStructuredFlashcardsRequest(apiKey, {
      model: options?.model,
      inputType: "pdf",
      count,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: FLASHCARDS_SYSTEM_PROMPT,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_id: fileId,
            },
            {
              type: "input_text",
              text: buildFlashcardsUserPrompt("pdf", count),
            },
          ],
        },
      ],
    });
  } finally {
    await deleteOpenAiFile(apiKey, fileId);
  }
}

// ─── MCQ GENERATION ─────────────────────────────────────────────────────────

export type McqItem = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  topic: string;
  reference: string;
};

export type McqResult = {
  questions: McqItem[];
  model: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

const MCQ_MODEL_DEFAULT = "gpt-4.1-mini";
const MCQ_DEFAULT_COUNT = 10;

const MCQ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "correctIndex", "explanation", "topic", "reference"],
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4,
          },
          correctIndex: { type: "integer" },
          explanation: { type: "string" },
          topic: { type: "string" },
          reference: { type: "string" },
        },
      },
    },
  },
} as const;

const MCQ_SYSTEM_PROMPT = [
  "You are an expert FAA aviation knowledge examiner for student pilots.",
  "Generate multiple-choice questions (MCQs) that test practical aviation knowledge.",
  "Each question must have exactly 4 answer options with only one correct answer.",
  "Questions must be based on real FAA regulations, procedures, and aeronautical knowledge.",
  "Do not invent or fabricate regulations, procedures, or numbers.",
  "Include a brief explanation for the correct answer and reference the relevant FAR/AIM section when applicable.",
  "Assign each question a specific sub-topic (e.g., 'IFR Operations', 'Weather Theory', 'Airspace Classification').",
  "Vary the difficulty and cover different aspects within the requested category.",
  "Return valid JSON that matches the requested schema.",
].join(" ");

function normalizeMcqCount(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return MCQ_DEFAULT_COUNT;
  return Math.max(5, Math.min(Math.floor(value), 20));
}

function parseMcqFromJson(text: string, maxQuestions: number): McqItem[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("MCQ model response was not valid JSON.");
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("MCQ model response must be a JSON object.");
  }

  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate.questions)) {
    throw new Error("MCQ model response missing `questions` array.");
  }

  const out: McqItem[] = [];
  for (const item of candidate.questions) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const question = typeof record.question === "string" ? record.question.trim() : "";
    const explanation = typeof record.explanation === "string" ? record.explanation.trim() : "";
    const topic = typeof record.topic === "string" ? record.topic.trim() : "General";
    const reference = typeof record.reference === "string" ? record.reference.trim() : "";

    if (!question) continue;

    const options = Array.isArray(record.options)
      ? record.options.map((o: unknown) => (typeof o === "string" ? o.trim() : "")).filter(Boolean)
      : [];
    if (options.length !== 4) continue;

    let correctIndex =
      typeof record.correctIndex === "number" ? Math.floor(record.correctIndex) : -1;
    if (correctIndex < 0 || correctIndex > 3) correctIndex = 0;

    out.push({
      question,
      options: options as [string, string, string, string],
      correctIndex,
      explanation,
      topic,
      reference,
    });
    if (out.length >= maxQuestions) break;
  }

  if (out.length === 0) {
    throw new Error("MCQ model response did not include valid questions.");
  }

  return out;
}

export async function generateMcqQuestions(
  category: string,
  options?: {
    model?: string;
    count?: number;
    difficulty?: string;
    topic?: string;
    noteContext?: string;
    systemPromptOverride?: string;
  },
): Promise<McqResult> {
  const apiKey = getOpenAiApiKey();
  const count = normalizeMcqCount(options?.count);
  const difficulty = options?.difficulty?.trim() || "mixed";
  const topic = options?.topic?.trim() || "";
  const noteContext = options?.noteContext?.trim() || "";
  const model = options?.model?.trim() || MCQ_MODEL_DEFAULT;
  const mcqSystemPrompt = options?.systemPromptOverride || MCQ_SYSTEM_PROMPT;

  const userPrompt = [
    `Aviation certification category: ${category}.`,
    topic ? `Focus on sub-topic: ${topic}.` : "",
    `Generate exactly ${count} multiple-choice questions.`,
    `Difficulty level: ${difficulty}.`,
    "Each question must have exactly 4 options (A, B, C, D) with one correct answer.",
    "Include a clear explanation and FAR/AIM reference where applicable.",
    "Cover diverse sub-topics within the requested category.",
    noteContext
      ? "Use the provided notes context as the primary grounding source while keeping FAA accuracy."
      : "",
    noteContext ? "Notes context:" : "",
    noteContext || "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: mcqSystemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "aviation_mcq",
          strict: true,
          schema: MCQ_SCHEMA,
        },
      },
      max_output_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenAI MCQ request failed with status ${response.status}: ${text || "Unknown error."}`,
    );
  }

  const payload = (await response.json()) as OpenAiResponsesResponse;
  const outputText = extractResponseText(payload);
  if (!outputText) {
    throw new Error("OpenAI MCQ request returned empty output.");
  }

  const questions = parseMcqFromJson(outputText, count);
  const usage = payload.usage ?? {};

  return {
    questions,
    model: payload.model?.trim() || model,
    tokenUsage: {
      inputTokens: clampToken(usage.input_tokens),
      outputTokens: clampToken(usage.output_tokens),
      totalTokens: clampToken(usage.total_tokens),
    },
  };
}

// ─── ORAL EXAM (EXAMINER AI) ────────────────────────────────────────────────

export type OralExamMessage = {
  role: "examiner" | "student";
  content: string;
};

export type ExaminerResponseResult = {
  message: string;
  model: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export type OralExamEvaluationResult = {
  score: number;
  total: number;
  percentage: number;
  strengths: { topic: string; percentage: number }[];
  weaknesses: { topic: string; percentage: number }[];
  feedback: string;
  model: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

const ORAL_EXAM_MODEL_DEFAULT = "gpt-4.1-mini";
const ORAL_EXAM_DEFAULT_TOTAL_QUESTIONS = 6;

function buildExaminerSystemPrompt(
  category: string,
  totalQuestions: number,
  topic?: string,
  noteContext?: string,
) {
  const topicLine = topic
    ? `Focus primarily on the "${topic}" sub-topic while still staying within ${category} standards.`
    : `Cover different sub-topics within ${category}.`;

  return [
    "You are a Designated Pilot Examiner (DPE) conducting an FAA oral examination.",
    `The candidate is being tested on the "${category}" certification category.`,
    `You will ask ${totalQuestions} questions total in the ${category} category.`,
    topicLine,
    "Ask one question at a time. After the candidate responds, briefly acknowledge their answer,",
    "note if anything was incorrect or incomplete, and then move on to the next question.",
    "Be professional, encouraging but thorough — like a real DPE.",
    "Keep your responses concise (2-4 sentences max).",
    "Do not reveal the question number or total — just ask naturally.",
    "Do not use markdown formatting. Respond in plain conversational text.",
    "Base all questions on real FAA regulations, aeronautical knowledge, and procedures.",
    noteContext ? "Use the provided notes context as the primary grounding source." : "",
  ].join(" ");
}

function buildEvaluationSystemPrompt(category: string, topic?: string, noteContext?: string) {
  const topicLine = topic
    ? `The exam was topic-focused on "${topic}". Weight your strengths/weaknesses and feedback to that topic.`
    : "The exam covered mixed sub-topics in this category.";

  return [
    "You are a Designated Pilot Examiner (DPE) evaluating an FAA oral examination.",
    `The candidate was tested on the "${category}" certification category.`,
    topicLine,
    "Review the entire conversation and evaluate the candidate's performance.",
    "Score each question on correctness and completeness.",
    "Identify strengths and weaknesses by sub-topic.",
    "Provide a brief overall feedback paragraph.",
    noteContext ? "When applicable, ground the evaluation against the provided notes context." : "",
    "Return valid JSON that matches the requested schema.",
  ].join(" ");
}

const EVALUATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "total", "percentage", "strengths", "weaknesses", "feedback"],
  properties: {
    score: { type: "integer" },
    total: { type: "integer" },
    percentage: { type: "integer" },
    strengths: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "percentage"],
        properties: {
          topic: { type: "string" },
          percentage: { type: "integer" },
        },
      },
    },
    weaknesses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "percentage"],
        properties: {
          topic: { type: "string" },
          percentage: { type: "integer" },
        },
      },
    },
    feedback: { type: "string" },
  },
} as const;

function mapOralMessages(
  messages: OralExamMessage[],
): Array<Record<string, unknown>> {
  return messages.map((m) => ({
    role: m.role === "examiner" ? "assistant" : "user",
    content: [{ type: m.role === "examiner" ? "output_text" : "input_text", text: m.content }],
  }));
}

/**
 * Generate the examiner's next response in the oral exam conversation.
 */
export async function generateExaminerResponse(
  category: string,
  messages: OralExamMessage[],
  options?: { model?: string; totalQuestions?: number; topic?: string; noteContext?: string; systemPromptOverride?: string },
): Promise<ExaminerResponseResult> {
  const apiKey = getOpenAiApiKey();
  const model = options?.model?.trim() || ORAL_EXAM_MODEL_DEFAULT;
  const totalQ = options?.totalQuestions ?? ORAL_EXAM_DEFAULT_TOTAL_QUESTIONS;
  const topic = options?.topic?.trim() || "";
  const noteContext = options?.noteContext?.trim() || "";

  const examinerPrompt = options?.systemPromptOverride
    || buildExaminerSystemPrompt(category, totalQ, topic || undefined, noteContext || undefined);

  const input: Array<Record<string, unknown>> = [
    {
      role: "system",
      content: [{
        type: "input_text",
        text: examinerPrompt,
      }],
    },
    ...(noteContext
      ? [
          {
            role: "user",
            content: [{ type: "input_text", text: `Notes context:\n${noteContext}` }],
          },
        ]
      : []),
    ...mapOralMessages(messages),
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      max_output_tokens: 500,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenAI examiner request failed with status ${response.status}: ${text || "Unknown error."}`,
    );
  }

  const payload = (await response.json()) as OpenAiResponsesResponse;
  const outputText = extractResponseText(payload);
  if (!outputText) {
    throw new Error("OpenAI examiner request returned empty output.");
  }

  const usage = payload.usage ?? {};

  return {
    message: outputText,
    model: payload.model?.trim() || model,
    tokenUsage: {
      inputTokens: clampToken(usage.input_tokens),
      outputTokens: clampToken(usage.output_tokens),
      totalTokens: clampToken(usage.total_tokens),
    },
  };
}

/**
 * Evaluate the full oral exam conversation and return a structured score.
 */
export async function evaluateOralExam(
  category: string,
  messages: OralExamMessage[],
  options?: { model?: string; topic?: string; noteContext?: string; systemPromptOverride?: string },
): Promise<OralExamEvaluationResult> {
  const apiKey = getOpenAiApiKey();
  const model = options?.model?.trim() || ORAL_EXAM_MODEL_DEFAULT;
  const topic = options?.topic?.trim() || "";
  const noteContext = options?.noteContext?.trim() || "";

  const evalPrompt = options?.systemPromptOverride
    || buildEvaluationSystemPrompt(category, topic || undefined, noteContext || undefined);

  const conversationText = messages
    .map((m) => `${m.role === "examiner" ? "Examiner" : "Student"}: ${m.content}`)
    .join("\n\n");

  const userPrompt = [
    "Evaluate the following oral exam conversation.",
    topic ? `The intended topic focus was: ${topic}.` : "",
    "Score the candidate out of the total number of questions asked.",
    "Identify sub-topic strengths (≥60% mastery) and weaknesses (<60%).",
    "Provide brief overall feedback.",
    noteContext ? "Use this notes context when judging relevance and completeness:" : "",
    noteContext || "",
    "",
    "Conversation:",
    conversationText,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{
            type: "input_text",
            text: evalPrompt,
          }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "oral_exam_evaluation",
          strict: true,
          schema: EVALUATION_SCHEMA,
        },
      },
      max_output_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenAI evaluation request failed with status ${response.status}: ${text || "Unknown error."}`,
    );
  }

  const payload = (await response.json()) as OpenAiResponsesResponse;
  const outputText = extractResponseText(payload);
  if (!outputText) {
    throw new Error("OpenAI evaluation request returned empty output.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(outputText);
  } catch {
    throw new Error("Evaluation model response was not valid JSON.");
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("Evaluation model response must be a JSON object.");
  }

  const result = raw as Record<string, unknown>;
  const score = typeof result.score === "number" ? result.score : 0;
  const total = typeof result.total === "number" ? result.total : 0;
  const percentage = typeof result.percentage === "number" ? result.percentage : 0;
  const feedback = typeof result.feedback === "string" ? result.feedback.trim() : "";

  const strengths = Array.isArray(result.strengths)
    ? result.strengths
      .filter((s: unknown) => s && typeof s === "object")
      .map((s: unknown) => {
        const item = s as Record<string, unknown>;
        return {
          topic: typeof item.topic === "string" ? item.topic.trim() : "",
          percentage: typeof item.percentage === "number" ? item.percentage : 0,
        };
      })
      .filter((s) => s.topic)
    : [];

  const weaknesses = Array.isArray(result.weaknesses)
    ? result.weaknesses
      .filter((w: unknown) => w && typeof w === "object")
      .map((w: unknown) => {
        const item = w as Record<string, unknown>;
        return {
          topic: typeof item.topic === "string" ? item.topic.trim() : "",
          percentage: typeof item.percentage === "number" ? item.percentage : 0,
        };
      })
      .filter((w) => w.topic)
    : [];

  const usage = payload.usage ?? {};

  return {
    score,
    total,
    percentage,
    strengths,
    weaknesses,
    feedback,
    model: payload.model?.trim() || model,
    tokenUsage: {
      inputTokens: clampToken(usage.input_tokens),
      outputTokens: clampToken(usage.output_tokens),
      totalTokens: clampToken(usage.total_tokens),
    },
  };
}

// ─── ADMIN CMS INTEGRATION HELPERS ──────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = { from: (table: string) => any };

/**
 * Fetch an AI config value from the `ai_config` table.
 * Returns null if not found or on error (allows silent fallback to hardcoded).
 */
export async function fetchConfigPrompt(
  client: SupabaseClientLike | null,
  configKey: string,
): Promise<string | null> {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("ai_config")
      .select("config_value")
      .eq("config_key", configKey)
      .single();
    if (error || !data?.config_value) return null;
    return data.config_value as string;
  } catch {
    return null;
  }
}

/**
 * Fetch active context document summaries for a given config key.
 * Returns formatted strings that can be injected into prompts.
 */
export async function fetchContextDocSummaries(
  client: SupabaseClientLike | null,
  configKey: string,
): Promise<string[]> {
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("ai_context_documents")
      .select("title, description")
      .eq("config_key", configKey)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    return (data as { title: string; description: string | null }[]).map(
      (doc) => `[${doc.title}]${doc.description ? `: ${doc.description}` : ""}`,
    );
  } catch {
    return [];
  }
}

/**
 * Fetch prebuilt quiz questions from the `quiz_questions` table.
 * Returns a random sample matching the requested filters.
 */
export async function fetchPrebuiltQuestions(
  client: SupabaseClientLike | null,
  category: string,
  options?: { count?: number; difficulty?: string; topic?: string },
): Promise<McqItem[]> {
  if (!client) return [];
  try {
    let query = client
      .from("quiz_questions")
      .select("question_text, options, correct_index, explanation, topic, reference")
      .eq("category", category)
      .eq("is_active", true);

    if (options?.difficulty && options.difficulty !== "mixed") {
      query = query.eq("difficulty", options.difficulty);
    }
    if (options?.topic) {
      query = query.eq("topic", options.topic);
    }

    const { data, error } = await query.limit(100);
    if (error || !data || data.length === 0) return [];

    // Shuffle and take the requested count
    const count = options?.count ?? MCQ_DEFAULT_COUNT;
    const shuffled = (data as Array<{
      question_text: string;
      options: string[];
      correct_index: number;
      explanation: string;
      topic: string;
      reference: string | null;
    }>).sort(() => Math.random() - 0.5);

    return shuffled.slice(0, count).map((row) => ({
      question: row.question_text,
      options: (row.options as string[]).slice(0, 4) as [string, string, string, string],
      correctIndex: row.correct_index,
      explanation: row.explanation || "",
      topic: row.topic,
      reference: row.reference || "",
    }));
  } catch {
    return [];
  }
}

// ─── AVIATION CHATBOT ───────────────────────────────────────────────────────

export type AviationChatPromptOptions = {
  category?: string;
  sourceMode?: "general" | "notes_ai";
};

export function buildAviationChatSystemPrompt(options?: AviationChatPromptOptions) {
  const category = options?.category?.trim() || "PPL";
  const sourceMode = options?.sourceMode === "notes_ai" ? "notes_ai" : "general";

  return [
    "You are CFI Assistant, an aviation study coach for student pilots in the United States.",
    `Focus the conversation on ${category} category knowledge unless the user explicitly changes topic.`,
    "Prioritize FAA-aligned guidance and avoid speculative or fabricated regulations, procedures, or performance numbers.",
    "If you are uncertain, say so clearly and suggest what official source should be checked.",
    "Use concise, practical explanations suitable for oral-exam prep.",
    "Do not provide legal advice, medical advice, or operational clearances.",
    sourceMode === "notes_ai"
      ? "Use provided notes context as primary user context, but still flag uncertainty if the notes conflict with FAA-standard knowledge."
      : "No user notes context is guaranteed, so prefer broadly applicable FAA-safe explanations.",
    "Respond with plain text (no markdown tables).",
  ].join(" ");
}
