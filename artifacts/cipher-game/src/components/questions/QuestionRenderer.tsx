import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import WebGLDecrypt from "@/components/aos/WebGLDecrypt";
import { convertToBlobUrl } from "@/lib/utils";

interface QuestionOption {
  id: number;
  text: string;
}

interface QuestionData {
  id: number;
  type: string;
  questionText: string;
  difficulty: number;
  category: string;
  mediaUrl?: string | null;
  options: QuestionOption[];
  timeLimit?: number;
}

interface Props {
  question: QuestionData;
  answerState: { optionId: number; correct: boolean } | null;
  selectedOption: number | null;
  onAnswer: (optionId: number) => void;
  isPending: boolean;
  eliminatedOptionIds?: number[];
}

export default function QuestionRenderer({ question, answerState, selectedOption, onAnswer, isPending, eliminatedOptionIds }: Props) {
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const isEliminated = (optId: number) => eliminatedOptionIds?.includes(optId);
  const type = question.type;

  useEffect(() => {
    if (!question.mediaUrl) { setMediaBlobUrl(null); return; }
    convertToBlobUrl(question.mediaUrl).then(setMediaBlobUrl);
  }, [question.mediaUrl]);

  const renderOptions = (options: QuestionOption[], customClass = "") => {
    const visibleOptions = eliminatedOptionIds
      ? options.filter((o) => !isEliminated(o.id))
      : options;
    return (
      <div className="space-y-3">
        {visibleOptions.map((opt) => {
          const isSelected = selectedOption === opt.id;
          const isWrong = answerState && isSelected && !answerState.correct;

          let cls = `w-full text-left px-5 py-4 rounded-lg font-mono text-sm transition-all duration-200 border ${customClass} `;
          if (!answerState) {
            cls += "glass border-zinc-700/50 hover:border-blue-500/50 hover:bg-blue-500/5 text-zinc-200 cursor-pointer";
          } else if (isSelected && answerState.correct) {
            cls += "bg-green-500/10 border-green-500/60 text-green-300";
          } else if (isSelected && !answerState.correct) {
            cls += "bg-red-500/10 border-red-500/60 text-red-300";
          } else {
            cls += "glass border-zinc-800/30 text-zinc-600 cursor-default";
          }

          return (
            <motion.button
              key={opt.id}
              whileHover={!answerState ? { x: 4 } : {}}
              onClick={() => onAnswer(opt.id)}
              className={cls}
              disabled={!!answerState || isPending}
            >
              {opt.text}
            </motion.button>
          );
        })}
        {/* Show eliminated options as crossed out */}
        {eliminatedOptionIds && options.filter((o) => isEliminated(o.id)).map((opt) => (
          <div key={opt.id} className="w-full text-left px-5 py-4 rounded-lg font-mono text-sm border border-red-900/30 bg-red-950/10 text-red-900/50 line-through select-none">
            {opt.text}
            <span className="ml-2 text-red-950/50 text-[10px]">[ELIMINATED]</span>
          </div>
        ))}
      </div>
    );
  };

  if (type === "signal_decode") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6 bg-blue-950/30">
          <p className="font-mono text-[10px] text-blue-400 tracking-widest mb-3">SIGNAL INTERCEPT</p>
          <div className="font-mono text-lg tracking-[0.2em] text-blue-300 leading-loose break-all select-all">
            {question.questionText}
          </div>
          {question.mediaUrl && (
            <img src={mediaBlobUrl || question.mediaUrl} alt="Signal waveform" className="mt-3 w-full h-20 object-cover rounded opacity-60" />
          )}
        </div>
        <div className="font-mono text-xs text-zinc-600 tracking-widest">SELECT DECODED MESSAGE</div>
        {renderOptions(question.options)}
      </div>
    );
  }

  if (type === "pattern_analysis") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6">
          <p className="font-mono text-[10px] text-purple-400 tracking-widest mb-3">PATTERN ANALYSIS</p>
          <p className="font-mono text-sm text-zinc-300 mb-4">{question.questionText}</p>
          {question.mediaUrl && (
            <div className="flex justify-center mb-4">
              <img src={mediaBlobUrl || question.mediaUrl} alt="Pattern sequence" className="max-h-48 rounded-lg border border-purple-500/20" />
            </div>
          )}
        </div>
        <div className="font-mono text-xs text-zinc-600 tracking-widest">SELECT NEXT IN SEQUENCE</div>
        {renderOptions(question.options)}
      </div>
    );
  }

  if (type === "audio_intel") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6">
          <p className="font-mono text-[10px] text-green-400 tracking-widest mb-3">AUDIO INTELLIGENCE</p>
          <p className="font-mono text-sm text-zinc-300 mb-4">{question.questionText}</p>
          {question.mediaUrl && (
            <div className="flex justify-center mb-4">
              <audio src={mediaBlobUrl || question.mediaUrl} controls className="w-full max-w-md" />
            </div>
          )}
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-1 justify-center h-8"
          >
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-500/40 rounded-full"
                style={{ height: `${Math.random() * 24 + 4}px` }}
              />
            ))}
          </motion.div>
        </div>
        <div className="font-mono text-xs text-zinc-600 tracking-widest">IDENTIFY CONTENT</div>
        {renderOptions(question.options)}
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6">
          <p className="font-mono text-[10px] text-green-400 tracking-widest mb-3">AUDIO INTELLIGENCE</p>
          <p className="font-mono text-sm text-zinc-300 mb-4">{question.questionText}</p>
          {question.mediaUrl && (
            <div className="flex justify-center mb-4">
              <audio src={mediaBlobUrl || question.mediaUrl} controls className="w-full max-w-md" />
            </div>
          )}
        </div>
        <div className="font-mono text-xs text-zinc-600 tracking-widest">SELECT ANSWER</div>
        {renderOptions(question.options)}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6">
          <p className="font-mono text-[10px] text-red-400 tracking-widest mb-3">VIDEO FEED</p>
          <p className="font-mono text-sm text-zinc-300 mb-4">{question.questionText}</p>
          {question.mediaUrl && (
            <div className="flex justify-center mb-4">
              <video src={mediaBlobUrl || question.mediaUrl} controls className="w-full max-h-64 rounded-lg" />
            </div>
          )}
        </div>
        <div className="font-mono text-xs text-zinc-600 tracking-widest">SELECT ANSWER</div>
        {renderOptions(question.options)}
      </div>
    );
  }

  if (type === "visual_recognition") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6">
          <p className="font-mono text-[10px] text-cyan-400 tracking-widest mb-3">VISUAL RECOGNITION</p>
          <p className="font-mono text-sm text-zinc-300 mb-4">{question.questionText}</p>
          {question.mediaUrl && (
            <div className="flex justify-center mb-4">
              <WebGLDecrypt
                src={mediaBlobUrl || question.mediaUrl}
                alt="Visual for recognition"
                className="max-h-64"
                decryptDuration={3500}
              />
            </div>
          )}
        </div>
        <div className="font-mono text-xs text-zinc-600 tracking-widest">SELECT IDENTIFICATION</div>
        {renderOptions(question.options)}
      </div>
    );
  }

  if (type === "threat_assessment") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6 border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-red-500"
            />
            <p className="font-mono text-[10px] text-red-400 tracking-widest">THREAT ASSESSMENT</p>
          </div>
          <p className="font-mono text-sm text-zinc-200 leading-relaxed">{question.questionText}</p>
        </div>
        <div className="font-mono text-xs text-zinc-600 tracking-widest">ASSIGN THREAT LEVEL</div>
        <div className="grid grid-cols-2 gap-3">
          {question.options.filter((o) => !isEliminated(o.id)).map((opt) => {
            const isSelected = selectedOption === opt.id;
            const isWrong = answerState && isSelected && !answerState.correct;

            const severityColors: Record<string, string> = {
              low: "border-yellow-500/30 hover:border-yellow-500/60 text-yellow-400",
              medium: "border-orange-500/30 hover:border-orange-500/60 text-orange-400",
              high: "border-red-500/30 hover:border-red-500/60 text-red-400",
              critical: "border-red-600/30 hover:border-red-600/60 text-red-300",
            };

            const optKey = opt.text.toLowerCase();
            let colorClass = severityColors[optKey] || "border-zinc-700/50 hover:border-blue-500/50 text-zinc-200";

            let cls = "w-full text-center px-5 py-6 rounded-lg font-mono text-sm transition-all duration-200 border ";
            if (!answerState) {
              cls += `glass ${colorClass} cursor-pointer`;
            } else if (isSelected && answerState.correct) {
              cls += "bg-green-500/10 border-green-500/60 text-green-300";
            } else if (isSelected && !answerState.correct) {
              cls += "bg-red-500/10 border-red-500/60 text-red-300";
            } else {
              cls += "glass border-zinc-800/30 text-zinc-600 cursor-default";
            }

            return (
              <motion.button
                key={opt.id}
                whileHover={!answerState ? { scale: 1.03 } : {}}
                whileTap={!answerState ? { scale: 0.97 } : {}}
                onClick={() => onAnswer(opt.id)}
                className={cls}
                disabled={!!answerState || isPending}
              >
                <div className="text-2xl mb-1">
                  {optKey === "low" && "🟢"}
                  {optKey === "medium" && "🟡"}
                  {optKey === "high" && "🟠"}
                  {optKey === "critical" && "🔴"}
                </div>
                {opt.text.toUpperCase()}
              </motion.button>
            );
          })}
          {eliminatedOptionIds && question.options.filter((o) => isEliminated(o.id)).map((opt) => (
            <div key={opt.id} className="col-span-2 w-full text-center px-5 py-4 rounded-lg font-mono text-sm border border-red-900/30 bg-red-950/10 text-red-900/50 line-through select-none">
              {opt.text.toUpperCase()} <span className="text-red-950/50 text-[10px]">[ELIMINATED]</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "logic_grid") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6">
          <p className="font-mono text-[10px] text-yellow-400 tracking-widest mb-3">LOGIC GRID</p>
          <p className="font-mono text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{question.questionText}</p>
        </div>
        <div className="font-mono text-xs text-zinc-600 tracking-widest">SELECT CONCLUSION</div>
        {renderOptions(question.options)}
      </div>
    );
  }

  if (type === "multi_step") {
    return (
      <div className="space-y-4">
        <div className="glass-strong cipher-border rounded-lg p-6 border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[10px] text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
              MULTI-PHASE
            </span>
            <span className="font-mono text-[10px] text-zinc-600">MULTIPLE STAGES</span>
          </div>
          <p className="font-mono text-sm text-zinc-200 leading-relaxed">{question.questionText}</p>
        </div>
        {renderOptions(question.options)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-base text-zinc-100 leading-relaxed">{question.questionText}</p>
      {question.mediaUrl && (
        <div className="rounded-lg overflow-hidden border border-blue-500/20">
          {question.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
            <video src={mediaBlobUrl || question.mediaUrl} controls className="w-full max-h-64 object-cover" />
          ) : (
            <img src={mediaBlobUrl || question.mediaUrl} alt="Question media" className="w-full max-h-64 object-cover" />
          )}
        </div>
      )}
      {renderOptions(question.options)}
    </div>
  );
}