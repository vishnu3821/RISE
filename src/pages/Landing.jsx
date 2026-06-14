import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Features from '../components/Features';
import JourneyTimeline from '../components/JourneyTimeline';
import MockInterviewPreview from '../components/MockInterviewPreview';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <JourneyTimeline />
        <MockInterviewPreview />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
