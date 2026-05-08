import { useEffect, useRef, useState } from "react";
import {
  askGrowlyAssistant,
  sendCustomerMessage,
  type CustomerMessageCategory,
  type CustomerMessageConversationItem,
  type GrowlyAssistantImage,
} from "../lib/api";

type AssistantPrompt = { label: string; question: string };
type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  isError?: boolean;
  imageName?: string;
  imageDataUrl?: string;
};
type FeedbackDraft = {
  category: CustomerMessageCategory;
  step: "detail" | "improvement" | "ready";
  title: string;
  initialText: string;
  detailText: string;
  desiredText: string;
  summary: string;
  conversation: CustomerMessageConversationItem[];
};

const assistantPrompts: AssistantPrompt[] = [
  { label: "Hva bør jeg gjøre nå?", question: "Hva bør jeg gjøre i drivhuset akkurat nå?" },
  { label: "Hvem trenger vann?", question: "Hvilke planter bør jeg sjekke for vann i dag?" },
  { label: "Hva kan sås?", question: "Hva kan jeg så eller plante denne måneden i drivhuset?" },
  { label: "Gi tilbakemelding", question: "Jeg vil gi en tilbakemelding eller et forslag om Growly-appen." },
  { label: "Foreslå forbedring", question: "Jeg har et forslag til forbedring av Growly-appen." },
];

const initialAssistantMessages: AssistantMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hei! Spør meg om dyrking, vanning, plantebilder eller neste steg. Du kan også gi tilbakemeldinger og forslag her i chatten. Når vi har formulert det sammen, kan du sende det til Growly.",
  },
];

function assistantAnswerItems(answer: string): string[] {
  const cleanedAnswer = answer.replace(/\r/g, "").replace(/\*\*/g, "").trim();
  const hasStructuredLines = /(?:^|\n)\s*(?:[-*]|\d+[.)])\s+/.test(cleanedAnswer);
  const lines = cleanedAnswer
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  const candidates = hasStructuredLines || lines.length > 1 ? lines : [cleanedAnswer];

  return candidates
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, hasStructuredLines || lines.length > 1 ? 3 : 1)
    .map((line) => {
      const maxLength = hasStructuredLines || lines.length > 1 ? 180 : 420;
      return line.length > maxLength ? `${line.slice(0, maxLength - 3).trim()}...` : line;
    });
}

function feedbackCategory(text: string): CustomerMessageCategory {
  const lower = normalizeFeedbackText(text);
  if (/(tips|triks|trick)/.test(lower)) return "tips";
  if (/(forslag|forbedring|onsker|ønsker|burde|savner|ide|idé)/.test(lower)) return "forslag";
  if (/(sporsmal|spørsmål|\?)/.test(lower)) return "sporsmal";
  if (/(vanskelig|forvirr|feil|bug|problem|utfordring|funker ikke|virker ikke)/.test(lower)) return "utfordring";
  return "annet";
}

function normalizeFeedbackText(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a");
}

function hasFeedbackIntent(text: string): boolean {
  const lower = normalizeFeedbackText(text);
  const productWords = [
    "appen",
    "app",
    "growly",
    "kalender",
    "chat",
    "meny",
    "side",
    "knapp",
    "funksjon",
    "innlogging",
    "konto",
    "dashboard",
    "oversikt",
  ];
  const feedbackWords = [
    "tilbakemelding",
    "forslag",
    "forbedring",
    "tips",
    "triks",
    "vanskelig",
    "forvirr",
    "savner",
    "onsker",
    "burde",
    "feil",
    "bug",
    "problem",
    "utfordring",
    "send til",
    "gi beskjed",
    "si fra",
  ];

  if (/(tilbakemelding|forslag|forbedring).*(admin|growly|app)/.test(lower)) return true;
  return productWords.some((word) => lower.includes(word)) && feedbackWords.some((word) => lower.includes(word));
}

function feedbackTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (/kalender/i.test(cleaned)) return "Tilbakemelding om kalenderen";
  if (/innlogging|logg inn/i.test(cleaned)) return "Tilbakemelding om innlogging";
  if (/chat|ai/i.test(cleaned)) return "Tilbakemelding om Growly-chatten";
  return cleaned.length > 72 ? `${cleaned.slice(0, 69).trim()}...` : cleaned || "Tilbakemelding fra Growly-chatten";
}

function feedbackSummary(draft: Pick<FeedbackDraft, "initialText" | "detailText" | "desiredText">): string {
  return [
    `Hva brukeren tok opp: ${draft.initialText.trim()}`,
    draft.detailText ? `Hva som er vanskelig: ${draft.detailText.trim()}` : "",
    draft.desiredText ? `Ønsket forbedring: ${draft.desiredText.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function shouldCancelFeedback(text: string): boolean {
  return /^(avbryt|stopp|ikke send|dropp|glem det|cancel)$/i.test(text.trim());
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
  const [feedbackDraft, setFeedbackDraft] = useState<FeedbackDraft | null>(null);
  const [feedbackSending, setFeedbackSending] = useState(false);
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

  function appendAssistantMessage(text: string, isError = false) {
    setAssistantMessages((messages) => [
      ...messages,
      { id: `assistant-${Date.now()}-${Math.random()}`, role: "assistant", text, isError },
    ]);
  }

  function nextFeedbackMessage(question: string): boolean {
    if (!question.trim()) {
      return false;
    }
    if (feedbackDraft && shouldCancelFeedback(question)) {
      setFeedbackDraft(null);
      appendAssistantMessage("Klart, jeg sender ingenting videre.");
      return true;
    }

    if (!feedbackDraft && !hasFeedbackIntent(question)) {
      return false;
    }

    if (!feedbackDraft) {
      const reply = "Det kan jeg samle til Growly. Hva er det som gjør dette vanskelig, og hvor i appen skjer det?";
      setFeedbackDraft({
        category: feedbackCategory(question),
        step: "detail",
        title: feedbackTitle(question),
        initialText: question,
        detailText: "",
        desiredText: "",
        summary: feedbackSummary({ initialText: question, detailText: "", desiredText: "" }),
        conversation: [
          { role: "user", text: question },
          { role: "assistant", text: reply },
        ],
      });
      appendAssistantMessage(reply);
      return true;
    }

    if (feedbackDraft.step === "detail") {
      const reply = "Takk, det var nyttig. Hvordan skulle det helst fungert for deg?";
      const updated = {
        ...feedbackDraft,
        step: "improvement" as const,
        detailText: question,
        summary: feedbackSummary({ ...feedbackDraft, detailText: question }),
        conversation: [
          ...feedbackDraft.conversation,
          { role: "user" as const, text: question },
          { role: "assistant" as const, text: reply },
        ],
      };
      setFeedbackDraft(updated);
      appendAssistantMessage(reply);
      return true;
    }

    const desiredText = feedbackDraft.step === "ready"
      ? `${feedbackDraft.desiredText}\n${question}`.trim()
      : question;
    const updated = {
      ...feedbackDraft,
      step: "ready" as const,
      desiredText,
      summary: feedbackSummary({ ...feedbackDraft, desiredText }),
      conversation: [
        ...feedbackDraft.conversation,
        { role: "user" as const, text: question },
      ],
    };
    setFeedbackDraft(updated);
    appendAssistantMessage("Jeg har laget et kort utkast. Trykk Send til Growly hvis dette skal følges opp.");
    return true;
  }

  async function submitFeedbackDraft() {
    if (!feedbackDraft || feedbackSending) {
      return;
    }
    setFeedbackSending(true);
    try {
      await sendCustomerMessage(
        {
          category: feedbackDraft.category,
          title: feedbackDraft.title,
          message: feedbackDraft.summary,
          conversation: feedbackDraft.conversation,
        },
        selectedHubId,
      );
      setFeedbackDraft(null);
      appendAssistantMessage("Takk, dette er sendt videre til Growly.");
    } catch {
      appendAssistantMessage("Jeg klarte ikke sende dette akkurat nå. Prøv igjen litt senere.", true);
    } finally {
      setFeedbackSending(false);
    }
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
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmedQuestion,
        imageName: image?.name,
        imageDataUrl: image?.dataUrl,
      },
    ]);
    if (!image && nextFeedbackMessage(trimmedQuestion)) {
      return;
    }
    setAssistantLoading(true);
    try {
      const result = await askGrowlyAssistant(trimmedQuestion, image, selectedHubId);
      if (!result) {
        setAssistantMessages((messages) => [
          ...messages,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            text: "Jeg fikk ikke kontakt med Growly akkurat nå. Prøv igjen om litt.",
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
          ? "Growly-nøkkelen mangler på serveren. Legg OPENAI_API_KEY inn i Render og deploy på nytt."
          : message === "ai_http_404"
            ? "Growly-endepunktet finnes ikke på serveren ennå. Deploy siste versjon til Render."
            : "Jeg fikk ikke kontakt med Growly akkurat nå. Prøv igjen om litt.";
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
              <h2>Growly</h2>
            </div>
            <button className="assistant-close-button" type="button" onClick={() => setAssistantOpen(false)} aria-label="Lukk chat">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
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
                  {message.imageDataUrl ? (
                    <img
                      className="assistant-message-image"
                      src={message.imageDataUrl}
                      alt={message.imageName ? `Opplastet bilde: ${message.imageName}` : "Opplastet plantebilde"}
                    />
                  ) : message.imageName ? (
                    <span className="assistant-attachment-pill">Bilde: {message.imageName}</span>
                  ) : null}
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

          {feedbackDraft?.step === "ready" ? (
            <div className="assistant-feedback-draft" role="status">
              <div>
                <span>Forslag klart</span>
                <strong>{feedbackDraft.title}</strong>
              </div>
              <p>{feedbackDraft.summary}</p>
              <div className="assistant-feedback-actions">
                <button type="button" onClick={submitFeedbackDraft} disabled={feedbackSending}>
                  {feedbackSending ? "Sender..." : "Send til Growly"}
                </button>
                <button type="button" onClick={() => setFeedbackDraft(null)} disabled={feedbackSending}>
                  Ikke send
                </button>
              </div>
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
              placeholder="Spør eller gi tilbakemelding..."
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
        </span>
      </button>
    </div>
  );
}
