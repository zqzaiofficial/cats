import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
});

const LANYARD_USER_ID = "1243325162489643050";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(
      `https://api.lanyard.rest/v1/users/${LANYARD_USER_ID}`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    const user = data?.data?.discord_user;

    if (user?.id && user?.avatar) {
      return {
        title: "xi says hi",
        description: "@howtobag on discord",
        icons: {
          icon: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
        },
      };
    }
  } catch {}

  return {
    title: "xi says hi",
    description: "@howtobag on discord",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${vt323.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
