import { getAiConfig, getContextDocuments } from "@/lib/actions/ai-config";
import { PageHeader } from "@/components/shared/page-header";
import { SystemPromptEditor } from "@/components/content/system-prompt-editor";
import { ContextDocumentList } from "@/components/content/context-document-list";
import { AI_CONFIG_KEYS } from "@/types/ai-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DEFAULT_CHATBOT_PROMPT = `You are an expert Certified Flight Instructor (CFI) assistant. You help student pilots and certificated pilots with aviation questions, regulations, procedures, and flight training concepts.

Guidelines:
- Provide accurate, clear answers based on FAA regulations and best practices
- Reference specific FARs, AIM sections, or FAA handbooks when applicable
- Explain complex concepts in simple terms
- Always prioritize safety in your responses
- If unsure about something, say so rather than guessing
- Encourage students to verify critical information with their actual CFI`;

export default async function ChatbotConfigPage() {
  const [chatbotPrompt, contextDocs] = await Promise.all([
    getAiConfig(AI_CONFIG_KEYS.CHATBOT_SYSTEM_PROMPT),
    getContextDocuments(AI_CONFIG_KEYS.CHATBOT_SYSTEM_PROMPT),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Chatbot Configuration"
        description="Manage the CFI Assistant chatbot's system prompt and context documents"
      />

      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemPromptEditor
            configKey={AI_CONFIG_KEYS.CHATBOT_SYSTEM_PROMPT}
            label="Chatbot System Prompt"
            description="This prompt defines the chatbot's personality and behavior. Changes apply to all new conversations."
            config={chatbotPrompt}
            defaultPrompt={DEFAULT_CHATBOT_PROMPT}
          />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Context Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <ContextDocumentList
            configKey={AI_CONFIG_KEYS.CHATBOT_SYSTEM_PROMPT}
            documents={contextDocs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
