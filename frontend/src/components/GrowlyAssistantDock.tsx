import { useEffect, useRef, useState } from "react";
import { askGrowlyAssistant, type GrowlyAssistantImage } from "../lib/api";

type AssistantPrompt = { label: string; question: string };
type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  isError?: boolean;
  imageName?: string;
};

const assistantPrompts: AssistantPrompt[] = [
  { label: "Hva bør jeg gjøre nå?", question: "Hva bør jeg gjøre i drivhuset akkurat nå basert på sensorene?" },
  { label: "Hvem trenger vann?", question: "Hvilke planter eller forhold tyder på at jeg bør vanne nå?" },
  { label: "Tolk sensorene", question: "Tolk siste sensordata og si hva som er bra, hva jeg bør følge med på, og neste tiltak." },
  { label: "Hva kan sås?", question: "Hva kan jeg så eller plante denne måneden i drivhuset?" },
];

const initialAssistantMessages: AssistantMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hei! Spør meg om vanning, sensorene eller hva du bør gjøre nå.",
  },
];

function assistantAnswerItems(answer: string): string[] {
  const cleanedAnswer = answer.replace(/\r/g, "").replace(/\*\*/g, "").trim();
  const lines = cleanedAnswer
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  const candidates = lines.length > 1 ? lines : (cleanedAnswer.match(/[^.!?]+[.!?]?/g) ?? [cleanedAnswer]);

  return candidates
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => (line.length > 120 ? `${line.slice(0, 117).trim()}...` : line));
}

type GrowlyAssistantDockProps = {
  selectedHubId?: string;
};

export function GrowlyAssistantDock({ selectedHubId = "" }: GrowlyAssistantDockProps) {
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(initialAssistantMessages);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantImage, setAssistantImage] = useState<GrowlyAssistantImage | null>(null);
  const [assistantImageError, setAssistantImageError] = useState("");
  const assistantLogRef = useRef<HTMLDivElement | null>(null);
  const assistantFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    assistantLogRef.current?.scrollTo({
      top: assistantLogRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [assistantMessages, assistantLoading]);

  function handleAssistantImage(file: File | undefined) {
    setAssistantImageError("");
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setAssistantImageError("Velg et bilde.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAssistantImageError("Bildet er for stort. Velg et under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAssistantImage({ dataUrl: reader.result, name: file.name });
      }
    };
    reader.onerror = () => setAssistantImageError("Kunne ikke lese bildet.");
    reader.readAsDataURL(file);
  }

  async function askAssistant(question: string, image: GrowlyAssistantImage | null = assistantImage) {
    const trimmedQuestion = question.trim() || (image ? "Se på plantebildet og gi korte, trygge råd." : "");
    if ((!trimmedQuestion && !image) || assistantLoading) {
      return;
    }
    setAssistantOpen(true);
    setAssistantQuestion("");
    setAssistantImage(null);
    setAssistantImageError("");
    setAssistantMessages((messages) => [
      ...messages,
      { id: `user-${Date.now()}`, role: "user", text: trimmedQuestion, imageName: image?.name },
    ]);
    setAssistantLoading(true);
    try {
      const result = await askGrowlyAssistant(trimmedQuestion, image, selectedHubId);
      if (!result) {
        setAssistantMessages((messages) => [
          ...messages,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            text: "Jeg fikk ikke kontakt med Growly AI akkurat nå. Prøv igjen om litt.",
            isError: true,
          },
        ]);
        return;
      }
      setAssistantMessages((messages) => [
        ...messages,
        { id: `assistant-${Date.now()}`, role: "assistant", text: result.answer },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ai_unavailable";
      const friendlyMessage =
        message === "openai_key_missing"
          ? "AI-nøkkelen mangler på serveren. Legg OPENAI_API_KEY inn i Render og deploy på nytt."
          : message === "ai_http_404"
            ? "AI-endepunktet finnes ikke på serveren ennå. Deploy siste versjon til Render."
            : "Jeg fikk ikke kontakt med Growly AI akkurat nå. Prøv igjen om litt.";
      setAssistantMessages((messages) => [
        ...messages,
        { id: `assistant-error-${Date.now()}`, role: "assistant", text: friendlyMessage, isError: true },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <div className={`assistant-dock${assistantOpen ? " is-open" : ""}`}>
      {assistantOpen ? (
        <section className="assistant-card assistant-chat-card soft-card" aria-label="Chat med Growly">
          <div className="assistant-chat-head">
            <div className="assistant-card__avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 9.4C6 6.4 8.4 4 11.5 4h1C16.1 4 19 6.9 19 10.5v1.2c0 3.6-2.9 6.5-6.5 6.5H11l-4.1 2.5 1.2-3.7A6.2 6.2 0 0 1 6 12.4v-3Z" fill="currentColor" opacity="0.16" />
                <path d="M12 15.5v-5.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                <path d="M11.8 11.4C8.9 10.7 7.4 8.8 7.1 6.2c3 0 5.1 1.6 6.1 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                <path d="M12.8 11.8c.7-2.8 2.7-4.5 5.6-4.8-.3 3.1-2.1 5-5.4 5.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
              </svg>
            </div>
            <div>
              <p className="section-kicker">Dyrkeassistent</p>
              <h2>Chat med Growly</h2>
            </div>
            <button className="assistant-close-button" type="button" onClick={() => setAssistantOpen(false)} aria-label="Lukk chat">
              x
            </button>
          </div>

          <div className="assistant-chat-log" aria-live="polite" ref={assistantLogRef}>
            {assistantMessages.map((message) => {
              const items = message.role === "assistant" && !message.isError ? assistantAnswerItems(message.text) : [];
              return (
                <article
                  className={`assistant-message assistant-message--${message.role}${message.isError ? " assistant-message--error" : ""}`}
                  key={message.id}
                >
                  {message.imageName ? <span className="assistant-attachment-pill">Bilde: {message.imageName}</span> : null}
                  {items.length > 1 ? (
                    <div className="assistant-answer-list">
                      {items.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  ) : (
                    <p>{items[0] ?? message.text}</p>
                  )}
                </article>
              );
            })}
            {assistantLoading ? (
              <article className="assistant-message assistant-message--assistant assistant-message--thinking">
                <span />
                <span />
                <span />
              </article>
            ) : null}
          </div>

          <div className="assistant-prompt-row assistant-suggestion-row">
            {assistantPrompts.map((prompt) => (
              <button type="button" key={prompt.label} onClick={() => askAssistant(prompt.question, null)} disabled={assistantLoading}>
                {prompt.label}
              </button>
            ))}
          </div>

          {assistantImage || assistantImageError ? (
            <div className={`assistant-image-preview${assistantImageError ? " assistant-image-preview--error" : ""}`}>
              <span>{assistantImageError || `Bilde klart: ${assistantImage?.name || "plantebilde"}`}</span>
              {assistantImage ? (
                <button type="button" onClick={() => setAssistantImage(null)} aria-label="Fjern bilde">
                  Fjern
                </button>
              ) : null}
            </div>
          ) : null}

          <form
            className="assistant-form assistant-chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              askAssistant(assistantQuestion);
            }}
          >
            <input
              ref={assistantFileInputRef}
              className="assistant-file-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                handleAssistantImage(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <button
              className="assistant-image-button"
              type="button"
              onClick={() => assistantFileInputRef.current?.click()}
              aria-label="Legg ved bilde"
            >
              +
            </button>
            <input
              value={assistantQuestion}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              placeholder="Spør om planten..."
            />
            <button type="submit" disabled={assistantLoading || (!assistantQuestion.trim() && !assistantImage)}>
              Send
            </button>
          </form>
        </section>
      ) : null}
      <button className="assistant-bubble-button" type="button" onClick={() => setAssistantOpen((open) => !open)} aria-label="Åpne Growly-chat">
        <span className="assistant-bubble-mark" aria-hidden="true">
          <span>AI</span>
          <svg viewBox="0 0 24 24">
            <path d="M12 19V8" />
            <path d="M11.4 11.2C7.7 10.5 5.6 8.3 5.1 5.1c4 .1 6.5 2.1 7.7 5.9" />
            <path d="M12.7 12.1c1.1-3.9 3.7-6.2 7.9-6.6-.4 4.1-2.9 6.5-7.5 7.4" />
          </svg>
        </span>
      </button>
    </div>
  );
}
