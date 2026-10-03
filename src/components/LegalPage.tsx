import React from 'react';
import Navigation from '@/components/Navigation';

interface Section { heading: string; body: string[] }

export const LegalPage: React.FC<{ title: string; updated: string; sections: Section[] }> = ({ title, updated, sections }) => (
  <>
    <Navigation />
    <main className="min-h-screen px-4 sm:px-6 py-24">
      <article className="max-w-3xl mx-auto rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 sm:p-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: {updated}</p>
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold text-foreground mb-2">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground mb-2">{p}</p>
              ))}
            </section>
          ))}
        </div>
        <p className="mt-10 text-xs text-muted-foreground border-t border-border/40 pt-4">
          Questions? Contact TNC at{' '}
          <a className="underline text-foreground" href="mailto:cheela.sathya@gmail.com">cheela.sathya@gmail.com</a>.
          This document is a general template and is not legal advice.
        </p>
      </article>
    </main>
  </>
);
