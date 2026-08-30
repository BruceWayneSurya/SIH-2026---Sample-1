"use client";

import { useEffect, useRef, useState } from "react";
import { Download, MonitorPlay, Pause, Play, WifiOff } from "lucide-react";

type Marker = { t: number; label: string };
type Video = {
  id: number;
  title: string;
  kind: "mp4" | "youtube";
  videoUrl: string;
  durationSec: number;
  fileSizeMb: number | null;
  markers: Marker[];
  slidesUrl: string | null;
  slidesTitle: string | null;
  uploadedByName: string | null;
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
};

export function VideoPlayer({ video }: { video: Video }) {
  const [saver, setSaver] = useState(false);
  const [armed, setArmed] = useState(false); // video element mounted
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const read = () => document.documentElement.dataset.saver === "1";
    const apply = () => setSaver(read());
    apply();
    window.addEventListener("vs-saver", apply);
    return () => window.removeEventListener("vs-saver", apply);
  }, []);

  // auto-arm unless data saver is on (deferred so it does not cascade a
  // synchronous render from inside the effect)
  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(!saver));
    return () => cancelAnimationFrame(id);
  }, [saver]);

  const onTime = () => {
    const v = ref.current;
    if (!v) return;
    let idx = -1;
    video.markers.forEach((m, i) => {
      if (v.currentTime >= m.t - 0.5) idx = i;
    });
    if (idx !== active) setActive(idx);
  };

  const seek = (t: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t;
    v.play().catch(() => undefined);
  };

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-navy-50/60 px-4 py-2.5">
        <MonitorPlay className="h-4 w-4 text-navy-600" />
        <h3 className="text-[15px] font-bold text-navy-900">{video.title}</h3>
        <span className="ml-auto flex items-center gap-3 text-[12px] font-semibold text-slate-500">
          <span>{fmt(video.durationSec)}</span>
          {video.fileSizeMb && <span>{video.fileSizeMb.toFixed(1)} MB stream</span>}
          {video.slidesUrl && (
            <a href={video.slidesUrl} download className="inline-flex items-center gap-1 font-bold text-navy-700 hover:underline">
              <Download className="h-3.5 w-3.5" /> {video.slidesTitle ?? "Slides"}
            </a>
          )}
        </span>
      </div>

      {armed ? (
        <div className="relative bg-black">
          <video
            ref={ref}
            src={video.videoUrl}
            controls
            preload="metadata"
            onTimeUpdate={onTime}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="aspect-video w-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="group flex aspect-video w-full flex-col items-center justify-center gap-3 bg-navy-900 text-white"
        >
          <span className="rounded-full bg-saffron-500 p-4 text-navy-950 transition group-hover:scale-105">
            <Play className="h-8 w-8 fill-current" />
          </span>
          <span className="flex items-center gap-2 text-sm font-bold text-navy-100">
            <WifiOff className="h-4 w-4" />
            Data saver on — tap to stream compressed video
          </span>
          <span className="text-[12px] text-navy-300">
            {video.fileSizeMb ? `${video.fileSizeMb.toFixed(1)} MB · ` : ""}
            {fmt(video.durationSec)}
          </span>
        </button>
      )}

      <div className="px-4 py-3">
        {video.markers.length > 0 && (
          <>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Chapter markers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {video.markers.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!armed}
                  onClick={() => seek(m.t)}
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-bold transition disabled:opacity-50 ${
                    active === i
                      ? "border-saffron-500 bg-saffron-500 text-navy-950"
                      : "border-line bg-white text-navy-600 hover:border-navy-300"
                  }`}
                >
                  {fmt(m.t)} · {m.label}
                </button>
              ))}
            </div>
          </>
        )}
        {video.uploadedByName && (
          <p className="mt-3 border-t border-dashed border-line pt-2 text-[12px] font-semibold text-slate-500">
            Uploaded by <b className="text-navy-700">{video.uploadedByName}</b> · Faculty lecture
          </p>
        )}
      </div>
      {playing && <span className="sr-only" aria-live="polite">Lecture playing</span>}
    </article>
  );
}
