import { useEffect, useRef, useState } from "react";
import {
  askGrowlyAssistant,
  sendCustomerMessage,
  type CustomerMessageCategory,
  type CustomerMessageConversationItem,
  type GrowlyAssistantImage,
} from "../lib/api";
import { useI18n, type AppLanguage } from "../lib/i18n";

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

const assistantPromptsNo: AssistantPrompt[] = [
  { label: "Hva bør jeg gjøre nå?", question: "Hva bør jeg gjøre i drivhuset akkurat nå?" },
  { label: "Hvem trenger vann?", question: "Hvilke planter bør jeg sjekke for vann i dag?" },
  { label: "Diagnostiser plante", question: "Kan du hjelpe meg å diagnostisere hva som skjer med planten min?" },
  { label: "Gi tilbakemelding", question: "Jeg vil gi en tilbakemelding eller et forslag om Growly-appen." },
  { label: "Noe fungerer ikke", question: "Noe fungerer ikke i Growly-appen, og jeg vil gi tilbakemelding." },
  { label: "Foreslå forbedring", question: "Jeg har et forslag til forbedring av Growly-appen." },
];

const assistantPromptsEn: AssistantPrompt[] = [
  { label: "What should I do now?", question: "What should I do in the greenhouse right now?" },
  { label: "Who needs water?", question: "Which plants should I check for water today?" },
  { label: "Diagnose plant", question: "Can you help me diagnose what is happening with my plant?" },
  { label: "Give feedback", question: "I want to give feedback or a suggestion about the Growly app." },
  { label: "Something is broken", question: "Something is not working in the Growly app, and I want to give feedback." },
  { label: "Suggest improvement", question: "I have a suggestion for improving the Growly app." },
];

function assistantPrompts(language: AppLanguage): AssistantPrompt[] {
  return language === "en" ? assistantPromptsEn : assistantPromptsNo;
}

function initialAssistantMessages(language: AppLanguage): AssistantMessage[] {
  return [
    {
      id: "welcome",
      role: "assistant",
      text: language === "en"
        ? "Hi! I am your Growly gardening assistant. Ask me about growing, watering, plant photos or diagnostics when something looks wrong. You can also give feedback about improvements or things that do not work in the app, and I will help you phrase it before you send it to Growly."
        : "Hei! Jeg er din Gartnerassistent i Growly. Spør meg om dyrking, vanning, plantebilder eller diagnostikk når noe ser galt ut. Du kan også gi tilbakemelding på forbedringer eller ting som ikke fungerer i appen, så hjelper jeg deg å formulere det før du sender det til Growly.",
    },
  ];
}

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
  if (/(forslag|forbedring|improvement|suggestion|idea|onsker|ønsker|wish|would like|burde|should|savner|missing|ide|idé)/.test(lower)) return "forslag";
  if (/(sporsmal|spørsmål|question|\?)/.test(lower)) return "sporsmal";
  if (/(vanskelig|forvirr|difficult|confusing|feil|bug|problem|utfordring|issue|broken|does not work|not working|funker ikke|virker ikke|fungerer ikke)/.test(lower)) return "utfordring";
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
    "feature",
    "innlogging",
    "login",
    "konto",
    "account",
    "dashboard",
    "oversikt",
    "catalog",
    "settings",
    "notifications",
  ];
  const feedbackWords = [
    "tilbakemelding",
    "feedback",
    "forslag",
    "suggestion",
    "forbedring",
    "improvement",
    "tips",
    "triks",
    "vanskelig",
    "difficult",
    "forvirr",
    "confusing",
    "savner",
    "missing",
    "onsker",
    "wish",
    "burde",
    "should",
    "feil",
    "bug",
    "problem",
    "issue",
    "utfordring",
    "broken",
    "fungerer ikke",
    "does not work",
    "not working",
    "send til",
    "send to",
    "gi beskjed",
    "si fra",
  ];

  if (/(tilbakemelding|feedback|forslag|suggestion|forbedring|improvement).*(admin|growly|app)/.test(lower)) return true;
  return productWords.some((word) => lower.includes(word)) && feedbackWords.some((word) => lower.includes(word));
}

function feedbackTitle(text: string, language: AppLanguage): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (/kalender|calendar/i.test(cleaned)) return language === "en" ? "Feedback about the calendar" : "Tilbakemelding om kalenderen";
  if (/innlogging|logg inn|login|sign in/i.test(cleaned)) return language === "en" ? "Feedback about sign-in" : "Tilbakemelding om innlogging";
  if (/chat|ai/i.test(cleaned)) return language === "en" ? "Feedback about the Growly chat" : "Tilbakemelding om Growly-chatten";
  return cleaned.length > 72
    ? `${cleaned.slice(0, 69).trim()}...`
    : cleaned || (language === "en" ? "Feedback from the Growly chat" : "Tilbakemelding fra Growly-chatten");
}

function feedbackSummary(draft: Pick<FeedbackDraft, "initialText" | "detailText" | "desiredText">, language: AppLanguage): string {
  if (language === "en") {
    return [
      `What the user raised: ${draft.initialText.trim()}`,
      draft.detailText ? `What is difficult: ${draft.detailText.trim()}` : "",
      draft.desiredText ? `Desired improvement: ${draft.desiredText.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return [
    `Hva brukeren tok opp: ${draft.initialText.trim()}`,
    draft.detailText ? `Hva som er vanskelig: ${draft.detailText.trim()}` : "",
    draft.desiredText ? `Ønsket forbedring: ${draft.desiredText.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function shouldCancelFeedback(text: string): boolean {
  return /^(avbryt|stopp|ikke send|dropp|glem det|cancel|stop|do not send|don't send|never mind)$/i.test(text.trim());
}

type GrowlyAssistantDockProps = {
  selectedHubId?: string;
};

const ASSISTANT_IMAGE_MAX_SOURCE_BYTES = 35 * 1024 * 1024;
const ASSISTANT_IMAGE_TARGET_BYTES = 900_000;
const ASSISTANT_IMAGE_MAX_EDGE = 1280;
const ASSISTANT_IMAGE_MAX_DATA_URL_LENGTH = 2_100_000;

function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function jpegNameForFile(file: File): string {
  const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "plantebilde";
  return `${baseName}.jpg`;
}

function readImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("image_decode_failed"));
    };
    image.src = imageUrl;
  });
}

function drawImageToCanvas(image: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("image_decode_failed");
  }
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("image_resize_failed");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

async function compressAssistantImage(file: File): Promise<GrowlyAssistantImage> {
  if (file.size > ASSISTANT_IMAGE_MAX_SOURCE_BYTES) {
    throw new Error("image_source_too_large");
  }

  const image = await readImageFromFile(file);
  let maxEdge = ASSISTANT_IMAGE_MAX_EDGE;
  const qualities = [0.82, 0.72, 0.62, 0.52, 0.44, 0.36];
  let bestDataUrl = "";

  for (let pass = 0; pass < 6; pass += 1) {
    const canvas = drawImageToCanvas(image, maxEdge);
    for (const quality of qualities) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      bestDataUrl = dataUrl;
      if (dataUrlByteLength(dataUrl) <= ASSISTANT_IMAGE_TARGET_BYTES) {
        return { dataUrl, name: jpegNameForFile(file) };
      }
    }
    maxEdge = Math.max(512, Math.round(maxEdge * 0.75));
  }

  if (bestDataUrl.length > ASSISTANT_IMAGE_MAX_DATA_URL_LENGTH) {
    throw new Error("image_too_large_after_resize");
  }

  return { dataUrl: bestDataUrl, name: jpegNameForFile(file) };
}

export function GrowlyAssistantDock({ selectedHubId = "" }: GrowlyAssistantDockProps) {
  const { language } = useI18n();
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(() => initialAssistantMessages(language));
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantImage, setAssistantImage] = useState<GrowlyAssistantImage | null>(null);
  const [assistantImageError, setAssistantImageError] = useState("");
  const [assistantImageProcessing, setAssistantImageProcessing] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState<FeedbackDraft | null>(null);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const assistantLogRef = useRef<HTMLDivElement | null>(null);
  const assistantFileInputRef = useRef<HTMLInputElement | null>(null);
  const promptSuggestions = assistantPrompts(language);

  useEffect(() => {
    setAssistantMessages((messages) => (
      messages.length === 1 && messages[0]?.id === "welcome" ? initialAssistantMessages(language) : messages
    ));
  }, [language]);

  useEffect(() => {
    assistantLogRef.current?.scrollTo({
      top: assistantLogRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [assistantMessages, assistantLoading]);

  async function handleAssistantImage(file: File | undefined) {
    setAssistantImageError("");
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setAssistantImageError(language === "en" ? "Choose an image." : "Velg et bilde.");
      return;
    }
    setAssistantImage(null);
    setAssistantImageProcessing(true);
    try {
      const compressedImage = await compressAssistantImage(file);
      if (
        compressedImage.dataUrl.length > ASSISTANT_IMAGE_MAX_DATA_URL_LENGTH ||
        dataUrlByteLength(compressedImage.dataUrl) > ASSISTANT_IMAGE_TARGET_BYTES * 2
      ) {
        setAssistantImageError(language === "en"
          ? "The image is still too large after resizing. Try taking the photo a little farther away or crop it first."
          : "Bildet er fortsatt for stort etter skalering. Prøv å ta bildet litt lenger unna, eller beskjær det først.");
        return;
      }
      setAssistantImage(compressedImage);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setAssistantImageError(code === "image_source_too_large"
        ? (language === "en" ? "The image is too large to prepare. Try a smaller photo." : "Bildet er for stort til å klargjøres. Prøv et mindre bilde.")
        : (language === "en" ? "Could not prepare the image. Try another photo." : "Kunne ikke klargjøre bildet. Prøv et annet bilde."));
    } finally {
      setAssistantImageProcessing(false);
    }
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
      appendAssistantMessage(language === "en" ? "All set, I will not send anything." : "Klart, jeg sender ingenting videre.");
      return true;
    }

    if (!feedbackDraft && !hasFeedbackIntent(question)) {
      return false;
    }

    if (!feedbackDraft) {
      const reply = language === "en"
        ? "I can collect that for Growly. What makes this difficult, and where in the app does it happen?"
        : "Det kan jeg samle til Growly. Hva er det som gjør dette vanskelig, og hvor i appen skjer det?";
      setFeedbackDraft({
        category: feedbackCategory(question),
        step: "detail",
        title: feedbackTitle(question, language),
        initialText: question,
        detailText: "",
        desiredText: "",
        summary: feedbackSummary({ initialText: question, detailText: "", desiredText: "" }, language),
        conversation: [
          { role: "user", text: question },
          { role: "assistant", text: reply },
        ],
      });
      appendAssistantMessage(reply);
      return true;
    }

    if (feedbackDraft.step === "detail") {
      const reply = language === "en"
        ? "Thanks, that helps. How would you ideally like it to work?"
        : "Takk, det var nyttig. Hvordan skulle det helst fungert for deg?";
      const updated = {
        ...feedbackDraft,
        step: "improvement" as const,
        detailText: question,
        summary: feedbackSummary({ ...feedbackDraft, detailText: question }, language),
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
      summary: feedbackSummary({ ...feedbackDraft, desiredText }, language),
      conversation: [
        ...feedbackDraft.conversation,
        { role: "user" as const, text: question },
      ],
    };
    setFeedbackDraft(updated);
    appendAssistantMessage(language === "en"
      ? "I made a short draft. Tap Send to Growly if this should be followed up."
      : "Jeg har laget et kort utkast. Trykk Send til Growly hvis dette skal følges opp.");
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
      appendAssistantMessage(language === "en" ? "Thanks, this has been sent to Growly." : "Takk, dette er sendt videre til Growly.");
    } catch {
      appendAssistantMessage(language === "en"
        ? "I could not send this right now. Try again a little later."
        : "Jeg klarte ikke sende dette akkurat nå. Prøv igjen litt senere.", true);
    } finally {
      setFeedbackSending(false);
    }
  }

  async function askAssistant(question: string, image: GrowlyAssistantImage | null = assistantImage) {
    const trimmedQuestion = question.trim() || (image
      ? (language === "en" ? "Look at the plant photo and give short, safe advice." : "Se på plantebildet og gi korte, trygge råd.")
      : "");
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
      const result = await askGrowlyAssistant(trimmedQuestion, image, selectedHubId, language);
      if (!result) {
        setAssistantMessages((messages) => [
          ...messages,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            text: language === "en" ? "I could not reach Growly right now. Try again shortly." : "Jeg fikk ikke kontakt med Growly akkurat nå. Prøv igjen om litt.",
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
          ? (language === "en" ? "The Growly key is missing on the server. Add OPENAI_API_KEY in Render and deploy again." : "Growly-nøkkelen mangler på serveren. Legg OPENAI_API_KEY inn i Render og deploy på nytt.")
          : message === "ai_http_404"
            ? (language === "en" ? "The Growly endpoint is not on the server yet. Deploy the latest version to Render." : "Growly-endepunktet finnes ikke på serveren ennå. Deploy siste versjon til Render.")
            : (language === "en" ? "I could not reach Growly right now. Try again shortly." : "Jeg fikk ikke kontakt med Growly akkurat nå. Prøv igjen om litt.");
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
        <section className="assistant-card assistant-chat-card soft-card" aria-label={language === "en" ? "Chat with Growly" : "Chat med Growly"}>
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
              <p className="section-kicker">{language === "en" ? "Gardening assistant" : "Gartnerassistent"}</p>
              <h2>Growly</h2>
            </div>
            <button className="assistant-close-button" type="button" onClick={() => setAssistantOpen(false)} aria-label={language === "en" ? "Close chat" : "Lukk chat"}>
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
                      alt={message.imageName
                        ? `${language === "en" ? "Uploaded image" : "Opplastet bilde"}: ${message.imageName}`
                        : (language === "en" ? "Uploaded plant image" : "Opplastet plantebilde")}
                    />
                  ) : message.imageName ? (
                    <span className="assistant-attachment-pill">{language === "en" ? "Image" : "Bilde"}: {message.imageName}</span>
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
            {promptSuggestions.map((prompt) => (
              <button type="button" key={prompt.label} onClick={() => askAssistant(prompt.question, null)} disabled={assistantLoading || assistantImageProcessing}>
                {prompt.label}
              </button>
            ))}
          </div>

          {assistantImage || assistantImageError || assistantImageProcessing ? (
            <div className={`assistant-image-preview${assistantImageError ? " assistant-image-preview--error" : ""}`}>
              <span>
                {assistantImageProcessing
                  ? (language === "en" ? "Preparing image..." : "Klargjør bilde...")
                  : assistantImageError || `${language === "en" ? "Image ready" : "Bilde klart"}: ${assistantImage?.name || (language === "en" ? "plant image" : "plantebilde")}`}
              </span>
              {assistantImage ? (
                <button type="button" onClick={() => setAssistantImage(null)} aria-label={language === "en" ? "Remove image" : "Fjern bilde"}>
                  {language === "en" ? "Remove" : "Fjern"}
                </button>
              ) : null}
            </div>
          ) : null}

          {feedbackDraft?.step === "ready" ? (
            <div className="assistant-feedback-draft" role="status">
              <div>
                <span>{language === "en" ? "Suggestion ready" : "Forslag klart"}</span>
                <strong>{feedbackDraft.title}</strong>
              </div>
              <p>{feedbackDraft.summary}</p>
              <div className="assistant-feedback-actions">
                <button type="button" onClick={submitFeedbackDraft} disabled={feedbackSending}>
                  {feedbackSending ? (language === "en" ? "Sending..." : "Sender...") : (language === "en" ? "Send to Growly" : "Send til Growly")}
                </button>
                <button type="button" onClick={() => setFeedbackDraft(null)} disabled={feedbackSending}>
                  {language === "en" ? "Do not send" : "Ikke send"}
                </button>
              </div>
            </div>
          ) : null}

          <form
            className="assistant-form assistant-chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!assistantImageProcessing) {
                askAssistant(assistantQuestion);
              }
            }}
          >
            <input
              ref={assistantFileInputRef}
              className="assistant-file-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                void handleAssistantImage(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <button
              className="assistant-image-button"
              type="button"
              onClick={() => assistantFileInputRef.current?.click()}
              disabled={assistantImageProcessing}
              aria-label={language === "en" ? "Attach image" : "Legg ved bilde"}
            >
              +
            </button>
            <input
              value={assistantQuestion}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              placeholder={language === "en" ? "Ask, diagnose or give feedback..." : "Spør, diagnostiser eller gi tilbakemelding..."}
            />
            <button type="submit" disabled={assistantLoading || assistantImageProcessing || (!assistantQuestion.trim() && !assistantImage)}>
              {language === "en" ? "Send" : "Send"}
            </button>
          </form>
        </section>
      ) : null}
      <button className="assistant-bubble-button" type="button" onClick={() => setAssistantOpen((open) => !open)} aria-label={language === "en" ? "Open Growly chat" : "Åpne Growly-chat"}>
        <span className="assistant-bubble-mark" aria-hidden="true">
          <span>AI</span>
        </span>
      </button>
    </div>
  );
}
