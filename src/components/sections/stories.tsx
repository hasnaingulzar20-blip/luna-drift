"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenText, Pause, Play, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STORIES, type SleepStory } from "@/lib/stories";
import { usePlayer } from "@/store/player";

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
              <h3 className="mt-2 font-serif text-2xl leading-snug text-moon-100">{story.title}</h3>
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
        </article>
      </DialogTrigger>
      <StoryDialogBody story={story} />
    </Dialog>
  );
}

function StoryDialogBody({ story }: { story: SleepStory }) {
  const [narrating, setNarrating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startAmbient = usePlayer((s) => s.playSoundscape);
  const isPlaying = usePlayer((s) => s.isPlaying);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const toggleNarration = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (narrating) {
      audio.pause();
      setNarrating(false);
    } else {
      void audio.play().then(() => setNarrating(true)).catch(() => setNarrating(false));
      // a soft bed of rain under the voice, if nothing is playing yet
      if (!isPlaying) startAmbient("rain");
    }
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
          <button
            type="button"
            onClick={toggleNarration}
            className="flex items-center gap-2.5 self-start rounded-full bg-moon-200 px-5 py-2.5 text-sm font-medium text-night-950 transition hover:bg-moon-100 sm:self-auto"
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
      </DialogHeader>

      <audio
        ref={audioRef}
        src={story.narrationAudio}
        onEnded={() => setNarrating(false)}
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
    <section id="stories" aria-label="Sleep stories" className="relative mt-24 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">Sleep Stories</p>
            <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
              Told slowly, to no one in particular
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-mist-400">
            Long-form bedtime narration — follow the words or let the voice do the carrying.
          </p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {STORIES.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
