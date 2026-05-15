import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import {
  useGetChapters,
  useGetChapter,
  useGetStoryProgress,
  useMakeStoryChoice,
  getGetChaptersQueryKey,
  getGetChapterQueryKey,
  getGetStoryProgressQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type StoryChoice = { id: number; text: string; consequenceFlag?: string | null; nextNodeId?: number | null };
type StoryNode = { id: number; chapterId: number; type: string; content: string; speakerName?: string | null; mediaUrl?: string | null; choices: StoryChoice[] };
type ChapterDetail = { id: number; title: string; description: string; orderIndex: number; unlockLevel: number; isUnlocked: boolean; coverImageUrl?: string | null; nodes?: StoryNode[] };

function TypewriterText({ text }: { text: string }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="font-mono text-sm text-zinc-200 leading-relaxed"
    >
      {text}
    </motion.p>
  );
}

function ChapterNode({ node, onChoice }: { node: StoryNode; onChoice: (choiceId: number) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {node.speakerName && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <span className="font-mono text-xs text-blue-400">{node.speakerName[0]}</span>
          </div>
          <span className="font-mono text-xs text-blue-400 tracking-widest uppercase">{node.speakerName}</span>
        </div>
      )}

      <div className="glass cipher-border rounded-lg p-6">
        <TypewriterText text={node.content} />
      </div>

      {node.choices && node.choices.length > 0 && (
        <div className="space-y-3">
          <p className="font-mono text-xs text-zinc-600 tracking-widest">SELECT RESPONSE</p>
          {node.choices.map((choice) => (
            <motion.button
              key={choice.id}
              whileHover={{ x: 6 }}
              onClick={() => onChoice(choice.id)}
              className="w-full text-left px-5 py-4 font-mono text-sm text-zinc-200 glass rounded-lg border border-zinc-700/40 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all"
              data-testid={`choice-${choice.id}`}
            >
              <span className="text-blue-500 mr-3">&#9656;</span>
              {choice.text}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function StoryPage() {
  const qc = useQueryClient();
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [currentNode, setCurrentNode] = useState<StoryNode | null>(null);

  const { data: chapters, isLoading: chaptersLoading } = useGetChapters({
    query: { queryKey: getGetChaptersQueryKey() },
  });

  const { data: progress } = useGetStoryProgress({
    query: { queryKey: getGetStoryProgressQueryKey() },
  });

  const { data: chapterDetail, isLoading: chapterLoading } = useGetChapter(
    activeChapterId || 0,
    { query: { queryKey: getGetChapterQueryKey(activeChapterId || 0), enabled: !!activeChapterId } }
  );

  const choiceMutation = useMakeStoryChoice();

  function openChapter(id: number) {
    setActiveChapterId(id);
    setCurrentNode(null);
  }

  function startChapter() {
    if (chapterDetail?.nodes && chapterDetail.nodes.length > 0) {
      const first = chapterDetail.nodes[0];
      setCurrentNode({ ...first, choices: first.choices ?? [] });
    }
  }

  function handleChoice(choiceId: number) {
    if (!currentNode) return;
    choiceMutation.mutate(
      { data: { nodeId: currentNode.id, choiceId } },
      {
        onSuccess(nextNode) {
          setCurrentNode(nextNode as StoryNode);
          qc.invalidateQueries({ queryKey: getGetStoryProgressQueryKey() });
        },
      }
    );
  }

  const chapterList = chapters as Array<{ id: number; title: string; description: string; orderIndex: number; unlockLevel: number; isUnlocked: boolean; coverImageUrl?: string | null }> | undefined;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="pt-14 min-h-screen">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">THE ARCHIVE</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">INTELLIGENCE NARRATIVE</h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chapter List */}
            <div className="space-y-3">
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-4">CHAPTERS</p>
              {chaptersLoading ? (
                [...Array(4)].map((_, i) => <div key={i} className="h-24 glass rounded-lg animate-pulse" />)
              ) : chapterList && chapterList.length > 0 ? (
                chapterList.map((ch) => (
                  <motion.button
                    key={ch.id}
                    whileHover={ch.isUnlocked ? { x: 4 } : {}}
                    onClick={() => ch.isUnlocked && openChapter(ch.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                      activeChapterId === ch.id
                        ? "glass-strong border-blue-500/50 bg-blue-500/5"
                        : ch.isUnlocked
                          ? "glass border-zinc-700/40 hover:border-blue-500/30"
                          : "glass border-zinc-800/30 opacity-40 cursor-not-allowed"
                    }`}
                    data-testid={`chapter-${ch.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs text-zinc-500 tracking-wider mb-1">CH.{ch.orderIndex + 1}</p>
                        <p className={`font-mono text-sm font-bold ${ch.isUnlocked ? "text-zinc-200" : "text-zinc-600"}`}>
                          {ch.title}
                        </p>
                      </div>
                      {!ch.isUnlocked && (
                        <span className="font-mono text-xs text-zinc-700 border border-zinc-700/40 px-2 py-0.5 rounded">
                          LVL {ch.unlockLevel}
                        </span>
                      )}
                    </div>
                    {ch.isUnlocked && (
                      <p className="font-mono text-xs text-zinc-600 mt-2 line-clamp-2">{ch.description}</p>
                    )}
                  </motion.button>
                ))
              ) : (
                <div className="glass cipher-border rounded-lg p-6 text-center">
                  <p className="font-mono text-xs text-zinc-600">NO CHAPTERS AVAILABLE</p>
                  <p className="font-mono text-xs text-zinc-700 mt-2">The narrative begins with seed data</p>
                </div>
              )}
            </div>

            {/* Story Content */}
            <div className="md:col-span-2">
              <AnimatePresence mode="wait">
                {!activeChapterId ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass cipher-border rounded-lg p-10 text-center h-96 flex flex-col items-center justify-center"
                  >
                    <p className="font-mono text-zinc-600 text-sm tracking-widest">SELECT A CHAPTER TO BEGIN</p>
                    <p className="font-mono text-zinc-700 text-xs mt-2">The Archive awaits your clearance</p>
                  </motion.div>
                ) : chapterLoading ? (
                  <motion.div key="loading" className="glass cipher-border rounded-lg p-10 text-center h-96 flex items-center justify-center">
                    <motion.p
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="font-mono text-xs text-blue-400 tracking-widest"
                    >
                      DECRYPTING CHAPTER...
                    </motion.p>
                  </motion.div>
                ) : currentNode ? (
                  <motion.div key={`node-${currentNode.id}`} className="glass-strong cipher-border rounded-lg p-8">
                    <div className="flex items-center justify-between mb-6">
                      <p className="font-mono text-xs text-zinc-600 tracking-widest">{chapterDetail?.title}</p>
                      <button
                        onClick={() => setCurrentNode(null)}
                        className="font-mono text-xs text-zinc-700 hover:text-zinc-400 transition-colors"
                      >
                        RETURN TO BRIEF
                      </button>
                    </div>
                    <ChapterNode node={currentNode} onChoice={handleChoice} />
                  </motion.div>
                ) : chapterDetail ? (
                  <motion.div key="chapter-intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong cipher-border rounded-lg p-8">
                    <p className="font-mono text-xs text-zinc-600 tracking-widest mb-2">CHAPTER BRIEF</p>
                    <h2 className="font-mono text-xl font-bold text-zinc-100 mb-4">{chapterDetail.title}</h2>
                    <p className="font-mono text-sm text-zinc-400 leading-relaxed mb-8">{chapterDetail.description}</p>

                    {chapterDetail.nodes && chapterDetail.nodes.length > 0 ? (
                      <button
                        onClick={startChapter}
                        className="w-full py-4 font-mono text-sm tracking-widest text-blue-300 glass cipher-border rounded-lg hover:bg-blue-500/10 transition-all neon-blue"
                        data-testid="start-chapter-btn"
                      >
                        BEGIN CHAPTER
                      </button>
                    ) : (
                      <div className="text-center py-6">
                        <p className="font-mono text-xs text-zinc-600">NO CONTENT IN THIS CHAPTER YET</p>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
