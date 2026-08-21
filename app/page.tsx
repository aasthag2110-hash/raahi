import type { Metadata } from "next";
import RaahiApp from "./RaahiApp";

export const metadata: Metadata = {
  title: "Raahi — Offline mountain decision support",
  description: "Know what changed before you take the next step.",
};

export default function Home() {
  return <RaahiApp user={null} />;
}
