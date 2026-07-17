"use client";

import { useEffect, useState } from "react";
import Oneko from "react-cursor-cat";
import Image from "next/image";
import activityIcon from "../../public/discord.webp";
import Link from "next/link";
const knockingAudio = "/knocking_spotdown.org.mp3";
const LANYARD_USER_ID = "1243325162489643050";

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
  const [isActive, setIsActive] = useState(false);
  const [userInfo, setUserInfo] = useState<LanyardResponse | null>(null);

  useEffect(() => {
    fetch(`https://api.lanyard.rest/v1/users/${LANYARD_USER_ID}`)
      .then((res) => res.json())
      .then((data: LanyardResponse) => setUserInfo(data));
  }, []);

  const user = userInfo?.data?.discord_user;
  const activity = userInfo?.data?.activities?.[0];

  return (
    <>
      {!isActive && (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
          <h1
            className="cursor-pointer border-b-4 border-dashed text-6xl tracking-wide text-white hover:border-white/80 hover:text-white/80"
            onClick={() => setIsActive(true)}
          >
            cats.sh
          </h1>
          <span className="mt-2 text-2xl tracking-wide text-white/50">
            click to start
          </span>
        </div>
      )}

      {isActive && (
        <>
          <Oneko />
          <audio src={knockingAudio}  />
          <div className="flex h-screen w-screen items-center justify-center bg-black">
            <div className="mx-6 w-full max-w-xl border-4 border-white p-6 text-white">
              {user ? (
                <>
                  <div className="flex items-center justify-center">
                    <img src={
                      `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                    } alt="pfp" className="w-32 h-32 rounded-full" />
                    <div className={`h-12 w-12 absolute mt-20 ml-20 rounded-full ${
                      userInfo?.data?.discord_status === "online" ? "bg-green-500" : userInfo?.data?.discord_status === "idle" ? "bg-yellow-500" : userInfo?.data?.discord_status === "dnd" ? "bg-red-400" : "bg-gray-500"
                    } border-8 border-black`}></div>
                  </div>

                  <div className="flex items-center justify-center flex-col">
                    <h1 className="text-white font-bold text-4xl tracking-wide mt-4 text-center">{user.global_name}</h1>
                    <p className="text-white/40 text-xl tracking-wide text-center">@{user.username}</p>
                    <p className="text-white/60 text-xl tracking-wide text-center">"i like to eat and i program sometimes"</p>
                    <Link className="hover:opacity-80 hover:-translate-y-0.25 flex items-center justify-center gap-2" href={`https://discord.com/invite/actualhate`} target="_blank">
                      my hangout: <Image src={activityIcon} alt="activity" className="w-10 h-10" />
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-white/60">loading...</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
