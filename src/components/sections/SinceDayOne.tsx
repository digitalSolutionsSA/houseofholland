import ScrollReveal from '../ScrollReveal';
import FlashlightReveal from '../FlashlightReveal';
import './SinceDayOne.css';

export default function SinceDayOne() {
  return (
    <section className="since" id="since-day-one">
      <FlashlightReveal
        className="since__photo"
        imgClassName="since__image"
        base="/Graphics/since.png"
        baseAlt="Tattooed client in studio"
        reveal="/Graphics/since-alternative.png"
        revealAlt="Tattooed client in studio, full colour"
        radius={200}
      />

      <ScrollReveal as="div" className="since__content">
        <h2 className="since__heading">
          <span className="since__heading-line">A SHOP BUILT ON CRAFT,</span>
          <span className="since__heading-line text-red">NOT TREND</span>
        </h2>

        <p className="since__body">
          House of Holland opened its doors with one rule: every piece leaves the chair
          looking as good in twenty years as it did the day it healed. That means real
          consultations, hospital-grade sterilization, and artists who specialize instead
          of doing a little of everything.
          <br />
          <br />
          Today the shop is home to seven full-time artists covering American
          traditional, blackwork, realism, fine line, neo-traditional color, and
          Japanese Irezumi.
        </p>

        <a href="#since-day-one" className="since__cta">
          OUR STORY
        </a>
      </ScrollReveal>
    </section>
  );
}
