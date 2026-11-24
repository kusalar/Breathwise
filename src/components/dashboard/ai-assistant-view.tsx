"use client";

import * as React from "react";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Trash2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { GeoLocation, AirQualityReading, WeatherReading } from "@/types";
import { siteConfig } from "@/config/site";
import { useLocation } from "@/context/location-context";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { weatherService } from "@/services/weather/weather.service";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  dataQualityIndicator?: number;
  dataSource?: string;
  isError?: boolean;
  fallbackUsed?: boolean;
  modelUsed?: string;
}

const SUGGESTED_QUESTIONS = [
  "How is the air quality in my city right now?",
  "Should I exercise outdoors today or postpone it?",
  "How can I improve my indoor air quality?",
  "Suggest a low-emission commute alternative.",
  "Create a pollution-aware daily routine for my family.",
];

export function AiAssistantView({
  initialLocation,
}: {
  initialLocation?: GeoLocation;
}) {
  const { location: contextLocation } = useLocation();
  const [location, setLocation] = React.useState<GeoLocation>(
    initialLocation ?? contextLocation ?? siteConfig.initialLocation
  );
  const [reading, setReading] = React.useState<AirQualityReading | null>(null);
  const [weather, setWeather] = React.useState<WeatherReading | null>(null);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (contextLocation) {
      setLocation(contextLocation);
    }
  }, [contextLocation]);

  React.useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: `Hello! I am your BreatheWise AI environmental companion. I am monitoring live atmospheric telemetry in **${location.name}**. How can I help you and your family navigate air quality, indoor ventilation, or low-emission routines today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      dataQualityIndicator: 85,
      dataSource: "Open-Meteo & CPCB Standards",
    },
  ]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Load contextual environmental data
  React.useEffect(() => {
    async function loadData() {
      try {
        const [aqi, w] = await Promise.all([
          airQualityService.getCurrentReading(location),
          weatherService.getCurrentWeather(location),
        ]);
        setReading(aqi);
        setWeather(w);
      } catch (e) {
        console.warn("Failed to preload telemetry for AI assistant:", e);
      }
    }
    loadData();
  }, [location]);

  // Auto-scroll to bottom of conversation
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          location,
          reading,
          weather,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.error || `Server returned status ${response.status}`);
      }

      const json = await response.json();
      const aiData = json.data;

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: aiData.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        dataQualityIndicator: aiData.dataQualityIndicator,
        dataSource: aiData.dataSource,
        fallbackUsed: Boolean(aiData.fallbackUsed && aiData.generationStatus === "fallback_success"),
        modelUsed: aiData.modelUsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const displayError =
        err instanceof Error ? err.message : "I encountered an error connecting to the intelligence engine. Please check your network or try again.";
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: displayError,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "reset-msg",
        sender: "assistant",
        text: `Conversation cleared. I am standing by with real-time environmental data for **${location.name}**. Ask me anything!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900 shadow-card overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-emerald-950 bg-slate-50/70 dark:bg-forest-950/70">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                BreatheWise Gemini Assistant
              </h2>
              <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                Contextual AI
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Synced with {location.name} atmospheric telemetry ({reading && !reading.isDemoData ? `Live AQI ${reading.aqi}` : `Regional Baseline AQI ${reading?.aqi ?? 142} (Illustrative)`})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-xs text-muted-foreground hover:text-slate-900 dark:hover:text-white gap-1"
            title="Clear message history"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === "user"
                  ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-emerald-700 text-white rounded-tr-xs"
                  : msg.isError
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900/50 rounded-tl-xs"
                  : "bg-slate-100 dark:bg-forest-950 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-emerald-950 rounded-tl-xs"
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>

              {/* Message metadata footer */}
              <div
                className={`mt-2 pt-1 flex items-center justify-between gap-2 text-[10px] ${
                  msg.sender === "user" ? "text-emerald-200" : "text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{msg.timestamp}</span>
                  {msg.fallbackUsed && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium">
                      Backup AI Active
                    </span>
                  )}
                </div>
                {msg.dataQualityIndicator !== undefined && (
                  <span className="flex items-center gap-1 font-mono">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-500" />
                    Data Quality: {msg.dataQualityIndicator}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-forest-950 border border-slate-200/70 dark:border-emerald-950 flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              <span>Gemini is synthesizing verified environmental advice...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Pills */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-emerald-950/60 bg-slate-50/50 dark:bg-forest-950/40 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 dark:border-emerald-900 bg-white dark:bg-forest-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-800 dark:hover:text-emerald-200 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-emerald-950 bg-white dark:bg-forest-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about smog precautions, exercise, or indoor hacks in ${location.name}...`}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 dark:border-emerald-950/80 bg-slate-50 dark:bg-forest-950 px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50"
            aria-label="Ask the AI environmental assistant"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl shadow-xs gap-1.5"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
        <p className="mt-2 text-[10px] text-center text-muted-foreground">
          AI guidance is advisory and synchronized with Indian CPCB and Open-Meteo models. In case of respiratory symptoms, follow medical guidance.
        </p>
      </div>
    </div>
  );
}

