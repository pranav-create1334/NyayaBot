export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  /** True while the assistant message is being streamed/generated. */
  pending?: boolean;
  /** Marks a failed request shown as an error bubble with a Retry action. */
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface GeminiConfigStatus {
  geminiKey: boolean;
  geminiModel: string;
}
