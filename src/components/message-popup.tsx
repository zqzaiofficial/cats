"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MessagePopUpProps = {
  open: boolean;
  onClose: () => void;
};

function formatCooldown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function MessagePopUp({ open, onClose }: MessagePopUpProps) {
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [cooldownMs, setCooldownMs] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const dragging = useRef(false);

  const fetchCooldown = useCallback(async () => {
    try {
      const res = await fetch("/api/mail");
      const data = await res.json();
      setCooldownMs(data.cooldownRemainingMs ?? 0);
    } catch {
      setCooldownMs(0);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;

    setClosing(false);
    setVisible(true);
    setSent(false);
    setPosition({ x: 0, y: 0 });
    fetchCooldown();
  }, [fetchCooldown, open]);

  useEffect(() => {
    if (!visible || cooldownMs <= 0) return;

    const interval = setInterval(() => {
      setCooldownMs((current) => Math.max(0, current - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, cooldownMs]);

  const handleClose = () => {
    setClosing(true);
    window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
      onClose();
    }, 300);
  };

  const handleSendMessage = async () => {
    if (!author.trim() || !content.trim() || cooldownMs > 0 || sending || sent) return;

    setSending(true);

    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, content }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setCooldownMs(data.cooldownRemainingMs ?? 0);
        return;
      }

      if (!res.ok) return;

      setAuthor("");
      setContent("");
      setSent(true);
      window.setTimeout(() => {
        setSent(false);
        setCooldownMs(data.cooldownRemainingMs ?? 5 * 60 * 1000);
      }, 1500);
    } finally {
      setSending(false);
    }
  };

  const onDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || (event.target as HTMLElement).closest("button")) return;

    dragging.current = true;
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      posX: position.x,
      posY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;

    setPosition({
      x: dragStart.current.posX + (event.clientX - dragStart.current.x),
      y: dragStart.current.posY + (event.clientY - dragStart.current.y),
    });
  };

  const onDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!open && !visible) return null;

  const onCooldown = cooldownMs > 0;
  const canSend = author.trim() && content.trim() && !onCooldown && !sending && !sent;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {isMobile && (
        <div
          aria-hidden
          className={`pointer-events-auto fixed inset-0 bg-black/70 transition-opacity duration-300 ${
            closing ? "opacity-0" : "opacity-100"
          }`}
        />
      )}
      <div
        className="pointer-events-auto fixed top-1/2 left-1/2 z-10 max-md:w-[calc(100%-2rem)]"
        style={
          isMobile
            ? { transform: "translate(-50%, -50%)" }
            : {
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              }
        }
      >
        <div
          className={`min-w-sm border-4 border-white bg-black max-md:min-w-0 max-md:w-full ${
            closing ? "popup-exit" : "popup-enter"
          }`}
        >
        <div
          className={`flex w-full justify-between border-b-4 border-white text-left text-2xl text-white ${
            isMobile ? "" : "cursor-grab active:cursor-grabbing"
          }`}
          onPointerDown={isMobile ? undefined : onDragStart}
          onPointerMove={isMobile ? undefined : onDragMove}
          onPointerUp={isMobile ? undefined : onDragEnd}
          onPointerCancel={isMobile ? undefined : onDragEnd}
        >
          <p className="my-2 ml-2 select-none">messenger.exe</p>
          <button
            type="button"
            className="my-2 mr-2 h-8 w-8 cursor-pointer border-2 border-dotted border-transparent text-2xl hover:border-white"
            onClick={handleClose}
          >
            x
          </button>
        </div>
        <div className="m-2 text-xl text-white">
          <p>author</p>
          <input
            maxLength={100}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="who are you?"
            required
            type="text"
            className="h-12 w-full border-2 border-dotted border-white p-2 outline-none"
          />

          <p className="mt-2">content</p>
          <input
            maxLength={100}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="say something..."
            required
            type="text"
            className="h-12 w-full border-2 border-dotted border-white p-2 outline-none"
          />

          <button
            type="button"
            className={`mt-2 w-full border-2 border-black p-2 text-xl ${
              sent
                ? "cursor-not-allowed bg-white text-black"
                : onCooldown
                ? "cursor-not-allowed bg-red-500 text-white"
                : canSend
                  ? "cursor-pointer bg-white text-black"
                  : "cursor-not-allowed bg-red-400/40 text-black"
            }`}
            disabled={!canSend && !sent}
            onClick={handleSendMessage}
          >
            {sent
              ? "sent"
              : onCooldown
              ? formatCooldown(cooldownMs)
              : !author.trim() || !content.trim()
                ? "fill in all fields, silly."
                : sending
                  ? "sending..."
                  : "send"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
