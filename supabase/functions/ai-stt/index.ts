import { jsonResponse, optionsResponse } from "../_shared/http.ts";
import { transcribeAudioFile } from "../_shared/openai.ts";

/**
 * Lightweight STT Edge Function for quick in-chat transcription.
 * Accepts base64-encoded audio in a JSON body and returns the transcript.
 * Unlike ai-transcription (which uses a job queue), this returns instantly.
 *
 * Request body: { audio: string (base64), mimeType?: string, fileName?: string }
 */
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return optionsResponse();
    if (req.method !== "POST") {
        return jsonResponse(405, { error: "Method not allowed." });
    }

    try {
        const body = await req.json();

        const base64Audio =
            typeof body.audio === "string" ? body.audio.trim() : "";
        if (!base64Audio) {
            return jsonResponse(400, {
                error: "Missing 'audio' field (base64-encoded audio data).",
            });
        }

        const mimeType =
            typeof body.mimeType === "string"
                ? body.mimeType.trim()
                : "audio/m4a";
        const fileName =
            typeof body.fileName === "string"
                ? body.fileName.trim()
                : "recording.m4a";

        // Decode base64 to binary
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const audioBlob = new Blob([bytes], { type: mimeType });

        const result = await transcribeAudioFile(audioBlob, {
            fileName,
        });

        return jsonResponse(200, {
            transcript: result.transcript,
            language: result.language,
            model: result.model,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unhandled function error.";
        console.error("ai-stt error:", error);
        return jsonResponse(500, { error: message });
    }
});
