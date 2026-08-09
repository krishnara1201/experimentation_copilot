import { ArrowRight, BarChart3, FlaskConical, LineChart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: FlaskConical,
    title: 'Plan with confidence',
    description:
      'Calculate the sample size or minimum detectable effect for any metric before you launch, so every test is powered correctly.',
  },
  {
    icon: BarChart3,
    title: 'Rigorous statistical analysis',
    description:
      'Two-proportion z-tests with a configurable significance level, uplift mode, and one- or two-sided testing — plus automatic sample-ratio-mismatch checks.',
  },
  {
    icon: LineChart,
    title: 'Track every experiment',
    description:
      'Organize metrics and variants per experiment, and keep a full history of analysis runs and their results.',
  },
  {
    icon: ShieldCheck,
    title: 'Guardrail metrics',
    description:
      'Mark metrics as primary or guardrail so you always know what a test is optimizing for — and what it must not break.',
  },
];

const steps = [
  {
    step: '1',
    title: 'Create an experiment',
    description: 'Define a hypothesis, add the metrics you care about, and set up your variants.',
  },
  {
    step: '2',
    title: 'Plan your sample size',
    description: 'Use the built-in calculators to know exactly how much data you need before you start.',
  },
  {
    step: '3',
    title: 'Run the analysis',
    description: 'Feed in results and get a statistically sound read on significance, uplift, and confidence.',
  },
];

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FlaskConical className="h-5 w-5 text-primary" />
          Experimentation Copilot
        </span>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center">
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Run A/B tests that hold up to scrutiny
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
        Experimentation Copilot helps you plan, launch, and analyze experiments with proper statistical rigor
        — from sample-size calculators to significance testing, in one place.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Log in
        </Link>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="border-y border-slate-200 bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Everything you need to run a trustworthy test
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold text-slate-900">How it works</h2>
      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {steps.map(({ step, title, description }) => (
          <div key={step}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {step}
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-6xl px-6 text-sm text-slate-500">
        © {new Date().getFullYear()} Experimentation Copilot.
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Footer />
    </div>
  );
}
