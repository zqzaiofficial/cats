"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Oneko from "react-cursor-cat";
import Image from "next/image";
import discordIcon from "../../public/discord.webp";
import spotifyIcon from "../../public/Spotify.png";
import developerIcon from "../../public/developer.png";
import MessagePopUp from "@/components/message-popup";
import Link from "next/link";

const knockingAudio = "/gynecologist.mp3";
const LANYARD_USER_ID = "1243325162489643050";

const WAKE_UP_WORDS = ["wake", "up", "f1lthy", "!"];
const WAKE_UP_TIMINGS = [1285, 1539, 1767, 1767 + 280];
const WAKE_UP_FADE_DELAY = 1000;
const WAKE_UP_FADE_DURATION = 1000;

type Page = "intro" | "main" | "projects";

type LanyardResponse = {
  success: boolean;
  data: {
    discord_user: {
      username: string;
      global_name: string | null;
      avatar: string;
      id: string;
    };
    discord_status: "online" | "idle" | "dnd" | "offline";
    activities: Array<{
      name: string;
      details?: string;
      state?: string;
      assets?: {
        large_text?: string;
        small_text?: string;
      };
    }>;
  };
};

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>("intro");
  const [textOnScreen, setTextOnScreen] = useState("");
  const [wakeUpVisible, setWakeUpVisible] = useState(false);
  const [wakeUpFading, setWakeUpFading] = useState(false);
  const [userInfo, setUserInfo] = useState<LanyardResponse | null>(null);
  const [londonTime, setLondonTime] = useState("");
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wakeUpFrameRef = useRef(0);
  const pendingPlayRef = useRef(false);
  const hasStartedWakeUp = useRef(false);

  const stopWakeUpLoop = useCallback(() => {
    if (wakeUpFrameRef.current) {
      cancelAnimationFrame(wakeUpFrameRef.current);
      wakeUpFrameRef.current = 0;
    }
  }, []);

  const buildWakeUpText = useCallback((timeMs: number) => {
    let text = "";

    for (let i = 0; i < WAKE_UP_WORDS.length; i++) {
      if (timeMs >= (WAKE_UP_TIMINGS[i] - 150)) {
        const word = WAKE_UP_WORDS[i];
        if (word === "!") text = `${text}!`;
        else text = text ? `${text} ${word}` : word;
      }
    }

    return text;
  }, []);

  const runWakeUpLoop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !hasStartedWakeUp.current) return;

    const timeMs = audio.currentTime * 1000;
    const text = buildWakeUpText(timeMs);
    const lastWordTime = WAKE_UP_TIMINGS[WAKE_UP_TIMINGS.length - 1];

    if (text) setTextOnScreen(text);

    if (timeMs >= lastWordTime + WAKE_UP_FADE_DELAY + WAKE_UP_FADE_DURATION) {
      setWakeUpVisible(false);
      setWakeUpFading(false);
      setTextOnScreen("");
      stopWakeUpLoop();
      return;
    }

    if (timeMs >= lastWordTime + WAKE_UP_FADE_DELAY) {
      setWakeUpFading(true);
    }

    wakeUpFrameRef.current = requestAnimationFrame(runWakeUpLoop);
  }, [buildWakeUpText, stopWakeUpLoop]);

  const clearWakeUpSequence = useCallback(() => {
    stopWakeUpLoop();
  }, [stopWakeUpLoop]);

  const startWakeUpSequence = useCallback(() => {
    if (hasStartedWakeUp.current) return;
    hasStartedWakeUp.current = true;
    setTextOnScreen("");
    setWakeUpVisible(true);
    setWakeUpFading(false);
    stopWakeUpLoop();
    wakeUpFrameRef.current = requestAnimationFrame(runWakeUpLoop);
  }, [runWakeUpLoop, stopWakeUpLoop]);

  const attemptAudioPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    audio.currentTime = 0;

    try {
      await audio.play();
      pendingPlayRef.current = false;
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (currentPage === "intro") {
      pendingPlayRef.current = false;
      hasStartedWakeUp.current = false;
      clearWakeUpSequence();
      setTextOnScreen("");
      setWakeUpVisible(false);
      setWakeUpFading(false);
    }
  }, [clearWakeUpSequence, currentPage]);

  useEffect(() => clearWakeUpSequence, [clearWakeUpSequence]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => setAudioReady(true);

    audio.preload = "auto";
    audio.load();
    audio.addEventListener("canplaythrough", handleCanPlay);

    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      setAudioReady(true);
    }

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlay);
    };
  }, []);

  const handleStart = useCallback(() => {
    setCurrentPage("main");
    pendingPlayRef.current = true;
    void attemptAudioPlay();
  }, [attemptAudioPlay]);

  useEffect(() => {
    if (currentPage !== "main" || !pendingPlayRef.current || !audioReady) return;
    void attemptAudioPlay();
  }, [audioReady, attemptAudioPlay, currentPage]);

  useEffect(() => {
    if (currentPage !== "main") return;

    fetch("/api/views", { method: "POST" })
      .then((res) => res.json())
      .then((data) => setViewCount(data.views ?? 0))
      .catch(() => {
        fetch("/api/views")
          .then((res) => res.json())
          .then((data) => setViewCount(data.views ?? 0))
          .catch(() => setViewCount(0));
      });
  }, [currentPage]);

  useEffect(() => {
    const formatLondonTime = () =>
      new Date().toLocaleTimeString("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

    setLondonTime(formatLondonTime());
    const interval = setInterval(() => setLondonTime(formatLondonTime()), 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch(
        `https://api.lanyard.rest/v1/users/${LANYARD_USER_ID}`
      );
      const data: LanyardResponse = await res.json();
      setUserInfo(data);
    };

    fetchUser();

    const interval = setInterval(fetchUser, 10000);

    return () => clearInterval(interval);
  }, []);

  const user = userInfo?.data?.discord_user;

  useEffect(() => {
    if (!user?.id || !user?.avatar) return;

    const href = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    link.href = href;
  }, [user?.id, user?.avatar]);

  return (
    <>
      <audio
        ref={audioRef}
        src={knockingAudio}
        preload="auto"
        loop
        className="hidden"
        onPlay={startWakeUpSequence}
      />

      
      <Oneko />

      {currentPage === "intro" && (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
          <h1
            className="cursor-pointer border-b-4 border-dashed text-6xl tracking-wide text-white hover:border-white/80 hover:text-white/80"
            onClick={handleStart}
          >
            xi says hi
          </h1>
          <span className="mt-2 text-2xl tracking-wide text-white/50">
            click to start
          </span>
          {!audioReady && (
            <span className="mt-4 text-lg tracking-wide text-white/30">
              loading audio...
            </span>
          )}
        </div>
      )}

      {currentPage === "main" && (
        <>
          <MessagePopUp open={mailOpen} onClose={() => setMailOpen(false)} />
          <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-black px-6 py-6">
            {wakeUpVisible && textOnScreen && (
              <h1
                className={`wake-up-text w-fit max-w-full shrink-0 border-4 border-red-400 bg-black/90 p-4 text-center text-4xl tracking-wide text-red-400 transition-opacity duration-1000 sm:text-5xl md:text-6xl ${
                  wakeUpFading ? "opacity-0" : "opacity-100"
                }`}
              >
                {textOnScreen}
              </h1>
            )}
            <div className="relative w-full max-w-xl shrink-0 border-4 border-white p-6 text-white">
              {user ? (
                <>
                  <div className="flex items-center justify-center">
                    <img
                      src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                      alt="pfp"
                      className="h-32 w-32 rounded-full"
                    />
                    <div
                      className={`absolute mt-20 ml-20 h-12 w-12 rounded-full ${
                        userInfo?.data?.discord_status === "online"
                          ? "bg-green-500"
                          : userInfo?.data?.discord_status === "idle"
                            ? "bg-yellow-500"
                            : userInfo?.data?.discord_status === "dnd"
                              ? "bg-red-400"
                              : "bg-gray-500"
                      } border-8 border-black`}
                    />
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <h1 className="mt-4 text-center text-4xl font-bold tracking-wide text-white">
                      {user.global_name}
                    </h1>
                    <p className="text-center text-xl tracking-wide text-white/40">
                      @{user.username}
                    </p>
                    <p className="text-center text-xl tracking-wide text-white/60">
                      &ldquo;{userInfo?.data?.activities?.[0]?.state && userInfo?.data?.activities?.[0]?.name === "Custom Status" ? userInfo?.data?.activities?.[0]?.state : "i like to eat and i program sometimes"}&rdquo;
                    </p>
                    <Link
                      className="flex items-center justify-center gap-2 hover:-translate-y-0.25 hover:opacity-80"
                      href="https://discord.com/invite/actualhate"
                      target="_blank"
                    >
                      my hangout:{" "}
                      <Image src={discordIcon} alt="activity" className="h-10 w-10" />
                    </Link>
                    <Link
                      className="flex items-center justify-center gap-2 hover:-translate-y-0.25 hover:opacity-80"
                      href="https://open.spotify.com/user/aklamimi?si=68adb8bc5ec84848"
                      target="_blank"
                    >
                      my spotify:{" "}
                      <Image src={spotifyIcon} alt="activity" className="h-8 w-8" />
                    </Link>
                    <p
                      className="ml-1.5 flex cursor-pointer items-center justify-center gap-1 hover:-translate-y-0.25 hover:opacity-80"
                      onClick={() => setCurrentPage("projects")}
                    >
                      my projects:{" "}
                      <Image
                        src={developerIcon}
                        alt="activity"
                        className="h-9 w-9"
                      />
                    </p>

                    <p className="text-white/40 text-sm">
                      Time for me: {londonTime}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-white/60">loading...</p>
              )}
              <div className="pointer-events-none absolute inset-x-3 bottom-2 flex items-center justify-between">
                <button
                  type="button"
                  className="pointer-events-auto cursor-pointer transition hover:opacity-80"
                  onClick={() => setMailOpen(true)}
                  aria-label="send mail"
                >
                  <Image src="/mail.png" alt="mail" width={32} height={32} />
                </button>
                <p className="text-sm leading-none text-white/40">
                  {viewCount ?? "..."} views
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {currentPage === "projects" && (
        <div className="flex h-screen w-screen items-center justify-center bg-black">
          <div className="mx-6 flex flex-col w-full max-w-xl border-4 border-white p-6 text-white">
            <div className="flex flex-col gap-2">
              <p className="text-white/40 text-sm cursor-pointer hover:text-white hover:-translate-y-0.25 hover:opacity-80" onClick={() => setCurrentPage("main")}>Go Back</p>
            </div>
            <h1 className="mt-4 text-center text-4xl font-bold tracking-wide text-white">
              projects
            </h1>
            <div className="flex flex-col gap-2 ml-4 mt-4">
              <div className="">
              <Link
                className="text-white/80 text-center text-xl hover:text-white hover:-translate-y-0.25 hover:opacity-80"
                href="https://github.com/zqzai"
                target="_blank"
              >
                snipt
              </Link>
              <div className="border-l-2 px-2 border-white/20">
                music discord bot
                <br/>serves over 10,000 server members
                <br/>installed by over 100 individual users
                <br/>ken carson, playboi carti, destroy lonely, osamason, bleeod + more
              </div>

              
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-4 mt-4">
              <div className="">
              <Link
                className="text-white/80 text-center text-xl hover:text-white hover:-translate-y-0.25 hover:opacity-80"
                href="https://discord.gg/h2cR9w6jK"
                target="_blank"
              >
                surge v2 <span className="text-red-400">(coming soon)</span>
              </Link>
              <div className="border-l-2 px-2 border-white/20">
                windows optimizer
                <br/>??? downloads
                <br/>??? tweaks
              </div>

              
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-4 mt-4">
              <div className="">
              <Link
                className="text-white/80 text-center text-xl hover:text-white hover:-translate-y-0.25 hover:opacity-80"
                href="https://discord.gg/h2cR9w6jK"
                target="_blank"
              >
                xi's hub <span className="text-white/40 text-sm">aka Lethal Hub</span> <span className="text-white/40">(discontinued)</span>
              </Link>
              <div className="border-l-2 px-2 border-white/20">
                steal a brainrot script (cheat)
                <br/>over 1,000 users
                <br/>generated $xx,xxx in revenue
              </div>

              
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-4 mt-4">
              <div className="">
              <Link
                className="text-white/80 text-center text-xl hover:text-white hover:-translate-y-0.25 hover:opacity-80"
                href="https://discord.gg/h2cR9w6jK"
                target="_blank"
              >
                surge v1 <span className="text-white/40">(discontinued)</span>
              </Link>
              <div className="border-l-2 px-2 border-white/20">
                windows optimizer
                <br/>over 2,000 downloads
                <br/>100+ tweaks
                <br/>partnered with notable fortnite CCs
              </div>

              <p className="mt-2 text-white/40 text-sm">theres more, but at the time of writing this <span className="text-white/40 text-sm">3am on 17/07/2026</span> i'm too tired to add it</p>
              
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
