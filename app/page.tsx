import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ConfigCheck } from "@/components/config-check"
import { ViewSelector } from "@/components/view-selector"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f7fc]">
      <Header />
      <div className="container px-4 md:px-6 pt-4">
        <ConfigCheck />
      </div>
      <HeroSection />
      <ViewSelector />
    </main>
  )
}
