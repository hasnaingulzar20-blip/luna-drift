"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenText, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STORIES, type SleepStory } from "@/lib/stories";
import { audioEngine } from "@/lib/audio-engine";
import { usePlayer } from "@/store/player";

const storyKey = (id: string) => `luna-story-${id}`;

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StoryCard({ story }: { story: SleepStory }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <article className="group relative cursor-pointer overflow-hidden rounded-3xl ring-1 ring-white/5 transition-all duration-500 hover:ring-moon-200/30">
          <div className="relative h-60 overflow-hidden sm:h-64">
            <img
              src={story.cover}
              alt={`${story.title} cover art`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[4s] ease-out group-hover:scale-[1.07]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(190deg,rgba(4,6,15,0.05)_30%,rgba(4,6,15,0.92)_92%)]"
            />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-moon-300/85">{story.theme}</p>
              <h3 className="mt-2 font-serif text-xl leading-snug text-moon-100 xl:text-[1.35rem]">{story.title}</h3>
              <div className="mt-3 flex items-center gap-3 text-xs text-mist-300">
                <span className="glass-chip rounded-full px-2.5 py-1">{story.minutes} min</span>
                <span className="flex items-center gap-1.5 text-mist-400">
                  <Volume2 className="h-3 w-3" aria-hidden="true" /> {story.narrator}
                </span>
              </div>
            </div>
          </div>
          <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-night-950/55 text-moon-100 ring-1 ring-moon-200/25 backdrop-blur transition group-hover:bg-moon-200 group-hover:text-night-950">
            <BookOpenText className="h-4 w-4" aria-hidden="true" />
          </span>
          {/* one slow sweep of moonlight across the cover on hover */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <span className="story-shine absolute -inset-y-10 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-moon-100/[0.13] to-transparent" />
          </span>
        </article>
      </DialogTrigger>
      <StoryDialogBody story={story} />
    </Dialog>
  );
}

function StoryDialogBody({ story }: { story: SleepStory }) {
  const [narrating, setNarrating] = useState(false);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startAmbient = usePlayer((s) => s.playSoundscape);
  const isPlaying = usePlayer((s) => s.isPlaying);

  // never leave the bed ducked behind a closed dialog
  useEffect(() => {
    return () => {
      audioEngine.setDuck(0);
    };
  }, []);

  // remember where the story was left, and offer to pick it back up.
  // wired as element props (not addEventListener): this component mounts
  // with the page, long before the dialog's <audio> ever exists
  const recallPosition = () => {
    const audio = audioRef.current;
    if (!audio) return;
    let saved: number | null = null;
    try {
      const raw = localStorage.getItem(storyKey(story.id));
      if (raw) saved = Number(raw);
    } catch {
      /* storage blocked — stories simply start at the beginning */
    }
    if (
      saved &&
      Number.isFinite(saved) &&
      saved > 45 &&
      audio.duration - saved > 60
    ) {
      setResumeAt(saved);
    }
  };

  const trackPosition = () => {
    const audio = audioRef.current;
    if (!audio || audio.paused || audio.ended) return;
    if (audio.currentTime > 15) {
      try {
        localStorage.setItem(storyKey(story.id), String(Math.floor(audio.currentTime)));
      } catch {
        /* noop */
      }
    }
  };

  const clearPosition = () => {
    try {
      localStorage.removeItem(storyKey(story.id));
    } catch {
      /* noop */
    }
  };

  const toggleNarration = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (narrating) {
      audio.pause();
      setNarrating(false);
      audioEngine.setDuck(0);
    } else {
      if (resumeAt) {
        audio.currentTime = resumeAt; // "listen" continues where it stopped
        setResumeAt(null);
      }
      void audio.play().then(() => {
        setNarrating(true);
        // ease the soundscape down so the voice can lean on it
        audioEngine.setDuck(1);
      }).catch(() => setNarrating(false));
      // a soft bed of rain under the voice, if nothing is playing yet
      if (!isPlaying) startAmbient("rain");
    }
  };

  const resumeStory = () => {
    const audio = audioRef.current;
    if (!audio || !resumeAt) return;
    audio.currentTime = resumeAt;
    setResumeAt(null);
    void audio.play().then(() => {
      setNarrating(true);
      audioEngine.setDuck(1);
    }).catch(() => {/* the voice can wait for a real gesture */});
  };

  return (
    <DialogContent className="max-w-3xl border-white/10 bg-[#070b18f2] text-foreground backdrop-blur-xl">
      <DialogHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-left">
            <DialogDescription className="text-[11px] uppercase tracking-[0.28em] text-moon-300/80">
              Sleep story · {story.minutes} min · {story.narrator}
            </DialogDescription>
            <DialogTitle className="mt-2 font-serif text-3xl font-light text-moon-100">
              {story.title}
            </DialogTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {resumeAt !== null && (
              <button
                type="button"
                onClick={resumeStory}
                className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2.5 text-xs text-moon-100 ring-1 ring-moon-200/30 transition hover:bg-moon-200/15"
                aria-label={`Resume narration from ${fmt(resumeAt)}`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                continue from {fmt(resumeAt)}
              </button>
            )}
            <button
              type="button"
              onClick={toggleNarration}
              className="flex items-center gap-2.5 rounded-full bg-moon-200 px-5 py-2.5 text-sm font-medium text-night-950 transition hover:bg-moon-100"
              aria-label={narrating ? "Pause narration" : "Play narration"}
            >
              {narrating ? (
                <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              )}
              {narrating ? "Pause narration" : "Listen"}
            </button>
          </div>
        </div>
      </DialogHeader>

      <audio
        ref={audioRef}
        src={story.narrationAudio}
        onLoadedMetadata={recallPosition}
        onTimeUpdate={trackPosition}
        onEnded={() => {
          clearPosition();
          setNarrating(false);
          audioEngine.setDuck(0);
        }}
        preload="none"
      />

      <ScrollArea className="max-h-[52vh] pr-4">
        <div className="font-serif text-[17px] leading-[1.9] text-mist-200/95">
          {story.body.map((para, i) => (
            <p key={i} className={`mb-5 ${i === 0 ? "first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-6xl first-letter:leading-[0.85] first-letter:text-moon-300" : ""}`}>
              {para}
            </p>
          ))}
          <p className="mt-8 text-center text-sm italic text-mist-500">— the end —</p>
        </div>
      </ScrollArea>
    </DialogContent>
  );
}

export default function Stories() {
  return (
    <section id="stories" aria-label="Sleep stories" className="relative mt-24 scroll-mt-28 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">
              <span className="text-moon-300/40" aria-hidden="true">IV</span>
              <span className="mx-1.5 text-white/20" aria-hidden="true">·</span>Sleep Stories
            </p>
            <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
              Told slowly, to no one in particular
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-mist-400">
            Long-form bedtime narration — follow the words or let the voice do the carrying.
          </p>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {STORIES.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
