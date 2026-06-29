import { MotionConfig } from 'framer-motion'
import LandingNavbar from '../components/landing/LandingNavbar'
import HeroSection from '../components/landing/HeroSection'
import ProblemSection from '../components/landing/ProblemSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import HowItWorksSection from '../components/landing/HowItWorksSection'
import AccessToJusticeSection from '../components/landing/AccessToJusticeSection'
import RolesSection from '../components/landing/RolesSection'
import TrustSection from '../components/landing/TrustSection'
import FutureVisionSection from '../components/landing/FutureVisionSection'
import FinalCtaSection from '../components/landing/FinalCtaSection'
import LandingFooter from '../components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-[#fafafa] font-sans text-zinc-900 antialiased">
        <a
          href="#main-content"
          className="absolute left-4 top-0 z-[100] -translate-y-[120%] rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition focus:translate-y-4 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900"
        >
          Skip to main content
        </a>
        <LandingNavbar />
        <main id="main-content">
          <HeroSection />
          <ProblemSection />
          <FeaturesSection />
          <HowItWorksSection />
          <AccessToJusticeSection />
          <RolesSection />
          <TrustSection />
          <FutureVisionSection />
          <FinalCtaSection />
        </main>
        <LandingFooter />
      </div>
    </MotionConfig>
  )
}
