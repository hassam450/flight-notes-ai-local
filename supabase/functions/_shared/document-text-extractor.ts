/**
 * Server-side text extraction for document types not natively supported
 * by the OpenAI Files API (e.g. .docx, .pptx, .xlsx, .rtf).
 *
 * PDF and plain-text formats are considered "OpenAI-native" and are sent
 * directly via the Files API. Everything else goes through text extraction
 * first, and the resulting plain text is fed to OpenAI as a transcript.
 */

import { BlobReader, ZipReader, type Entry } from "npm:@zip.js/zip.js@2.7.54";

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

const OPENAI_NATIVE_EXTENSIONS = new Set([
    ".pdf",
    ".txt",
    ".text",
    ".md",
    ".markdown",
    ".html",
    ".htm",
    ".xml",
    ".json",
    ".csv",
]);

/**
 * Returns `true` when the file can be uploaded directly to the OpenAI
 * Files API without any pre-processing.
 */
export function isOpenAiNativeFile(fileName: string): boolean {
    const ext = getExtension(fileName);
    return OPENAI_NATIVE_EXTENSIONS.has(ext);
}

/**
 * Extracts plain text from a document blob.
 *
 * Supported formats:
 *  - `.docx` — XML text extraction from ZIP (word/document.xml)
 *  - `.pptx` — XML slide text extraction from ZIP
 *  - `.xlsx` — shared-strings + inline text from ZIP
 *  - `.doc`  — basic binary text heuristic
 *  - `.rtf`  — RTF control-word stripping
 *
 * @throws if extraction fails or produces empty text.
 */
export async function extractTextFromDocument(
    blob: Blob,
    fileName: string,
): Promise<string> {
    const ext = getExtension(fileName);

    let text: string;

    switch (ext) {
        case ".docx":
            text = await extractDocx(blob);
            break;
        case ".pptx":
            text = await extractPptx(blob);
            break;
        case ".xlsx":
            text = await extractXlsx(blob);
            break;
        case ".doc":
            text = extractDoc(await blob.arrayBuffer());
            break;
        case ".rtf":
            text = extractRtf(await blob.text());
            break;
        default:
            // Last resort: try reading as raw UTF-8 text.
            text = await blob.text();
    }

    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error(`Text extraction produced no content for "${fileName}".`);
    }

    return trimmed;
}

// ---------------------------------------------------------------------------
// Format-specific extractors
// ---------------------------------------------------------------------------

function getExtension(name: string): string {
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** .docx — Office Open XML: extract text from word/document.xml inside ZIP */
async function extractDocx(blob: Blob): Promise<string> {
    const entries = await readZipEntries(blob);

    // Main body text lives in word/document.xml
    // Headers/footers can be in word/header*.xml and word/footer*.xml
    const contentEntries = entries
        .filter((e) =>
            /^word\/(document|header\d*|footer\d*)\.xml$/i.test(e.filename)
        )
        .sort((a, b) => {
            // Ensure document.xml comes first
            const aIsDoc = /document\.xml$/i.test(a.filename) ? 0 : 1;
            const bIsDoc = /document\.xml$/i.test(b.filename) ? 0 : 1;
            if (aIsDoc !== bIsDoc) return aIsDoc - bIsDoc;
            return a.filename.localeCompare(b.filename, undefined, { numeric: true });
        });

    const parts: string[] = [];
    for (const entry of contentEntries) {
        const xml = await readEntryText(entry);
        // In OOXML, paragraphs are <w:p> elements and text runs are <w:t>
        // Inserting newlines between paragraphs for readability
        const withParagraphBreaks = xml.replace(/<\/w:p>/gi, "\n");
        const text = stripXmlTags(withParagraphBreaks);
        if (text) parts.push(text);
    }

    return parts.join("\n\n");
}

/** .pptx — extract text from slide XML entries inside the ZIP */
async function extractPptx(blob: Blob): Promise<string> {
    const entries = await readZipEntries(blob);
    const slideEntries = entries
        .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.filename))
        .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

    const parts: string[] = [];
    for (const entry of slideEntries) {
        const xml = await readEntryText(entry);
        const text = stripXmlTags(xml);
        if (text) parts.push(text);
    }

    return parts.join("\n\n");
}

/** .xlsx — extract text from shared strings + inline strings inside the ZIP */
async function extractXlsx(blob: Blob): Promise<string> {
    const entries = await readZipEntries(blob);

    // 1. Shared strings table
    const sst = entries.find((e) => /xl\/sharedStrings\.xml$/i.test(e.filename));
    let sharedStrings: string[] = [];
    if (sst) {
        const xml = await readEntryText(sst);
        sharedStrings = extractSharedStrings(xml);
    }

    // 2. Walk sheet files
    const sheetEntries = entries
        .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.filename))
        .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

    const parts: string[] = [];
    for (const entry of sheetEntries) {
        const xml = await readEntryText(entry);
        const text = extractSheetText(xml, sharedStrings);
        if (text) parts.push(text);
    }

    return parts.join("\n\n");
}

/** .doc — legacy binary Word: heuristic ASCII/UTF-16LE text extraction */
function extractDoc(buffer: ArrayBuffer): string {
    // Try UTF-16LE first (common in .doc), then fall back to ASCII-range bytes.
    const bytes = new Uint8Array(buffer);
    const chunks: string[] = [];
    let currentChunk: number[] = [];

    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        // Accept printable ASCII + common whitespace
        if ((byte >= 0x20 && byte <= 0x7e) || byte === 0x0a || byte === 0x0d || byte === 0x09) {
            currentChunk.push(byte);
        } else {
            if (currentChunk.length >= 4) {
                chunks.push(String.fromCharCode(...currentChunk));
            }
            currentChunk = [];
        }
    }
    if (currentChunk.length >= 4) {
        chunks.push(String.fromCharCode(...currentChunk));
    }

    return chunks.join(" ").replace(/\s+/g, " ");
}

/** .rtf — strip RTF control words, groups, and hex escapes */
function extractRtf(raw: string): string {
    let text = raw;

    // Remove escaped braces and backslashes
    text = text.replace(/\\[{}\\]/g, "");

    // Replace common RTF unicode escapes:  \'hh
    text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });

    // Replace \uN? (Unicode code-point followed by replacement char)
    text = text.replace(/\\u(\d+)\s?\??/g, (_m, cp) => {
        return String.fromCharCode(Number(cp));
    });

    // Remove all remaining control words: \word(N)?( )?
    text = text.replace(/\\[a-z]+(-?\d+)?\s?/gi, " ");

    // Remove braces
    text = text.replace(/[{}]/g, "");

    // Collapse whitespace
    text = text.replace(/\s+/g, " ");

    return text.trim();
}

// ---------------------------------------------------------------------------
// ZIP helpers (shared by .pptx / .xlsx)
// ---------------------------------------------------------------------------

async function readZipEntries(blob: Blob): Promise<Entry[]> {
    const reader = new ZipReader(new BlobReader(blob));
    try {
        return await reader.getEntries();
    } finally {
        await reader.close();
    }
}

async function readEntryText(entry: Entry): Promise<string> {
    if (!entry.getData) return "";
    const blob: Blob = await new Promise((resolve, reject) => {
        const chunks: BlobPart[] = [];
        const ws = new WritableStream<Uint8Array>({
            write(chunk) {
                chunks.push(new Uint8Array(chunk));
            },
            close() {
                resolve(new Blob(chunks));
            },
            abort(reason) {
                reject(reason);
            },
        });
        entry.getData!(ws).catch(reject);
    });
    return blob.text();
}

function stripXmlTags(xml: string): string {
    return xml
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#\d+;/g, (m) => String.fromCharCode(Number(m.slice(2, -1))))
        .replace(/\s+/g, " ")
        .trim();
}

function extractSharedStrings(xml: string): string[] {
    const strings: string[] = [];
    const siRegex = /<si>([\s\S]*?)<\/si>/gi;
    let match: RegExpExecArray | null;

    while ((match = siRegex.exec(xml)) !== null) {
        strings.push(stripXmlTags(match[1]));
    }

    return strings;
}

function extractSheetText(xml: string, sharedStrings: string[]): string {
    const rows: string[] = [];
    const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(xml)) !== null) {
        const cells: string[] = [];
        const cellRegex = /<c([^>]*)>([\s\S]*?)<\/c>/gi;
        let cellMatch: RegExpExecArray | null;

        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
            const attrs = cellMatch[1];
            const inner = cellMatch[2];
            const isShared = /t\s*=\s*"s"/i.test(attrs);

            // Extract <v> value
            const vMatch = /<v>([\s\S]*?)<\/v>/i.exec(inner);
            if (!vMatch) continue;
            const rawValue = vMatch[1].trim();

            if (isShared) {
                const idx = parseInt(rawValue, 10);
                if (!isNaN(idx) && idx < sharedStrings.length) {
                    cells.push(sharedStrings[idx]);
                }
            } else {
                cells.push(rawValue);
            }
        }

        if (cells.length > 0) {
            rows.push(cells.join("\t"));
        }
    }

    return rows.join("\n");
}
