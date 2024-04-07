"use client"

import dynamic from "next/dynamic";

const Leaflet = dynamic(() => import("../components/Leaflet"), { ssr:false })

export default function Home() {
  return (
    <main>
      <Leaflet />
    </main>
  );
}
