import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { ChatLauncher } from './components/chat/ChatLauncher';
import { Hero } from './components/hero/Hero';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { About } from './components/sections/About';
import { AskAI } from './components/sections/AskAI';
import { Contact } from './components/sections/Contact';
import { Experience } from './components/sections/Experience';
import { Projects } from './components/sections/Projects';
import { Skills } from './components/sections/Skills';
import { StatsStrip } from './components/sections/StatsStrip';
import { ChatProvider } from './context/ChatContext';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <ChatProvider>
          <Navbar theme={theme} onToggleTheme={toggle} />
          <main id="main" tabIndex={-1} className="focus:outline-none">
            <Hero />
            <StatsStrip />
            <About />
            <Experience />
            <Projects />
            <Skills />
            <AskAI />
            <Contact />
          </main>
          <Footer />
          <ChatLauncher />
        </ChatProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
