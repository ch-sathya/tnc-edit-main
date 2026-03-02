import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Vibe Code', href: '/vibe-code' },
      { label: 'Collaborate', href: '/collaborate' },
      { label: 'Community', href: '/community' },
    ],
    company: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '/news' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
    legal: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Cookies', href: '#' },
    ],
  };

  const socials = [
    { icon: Github, href: 'https://github.com', label: 'GitHub' },
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
    { icon: Mail, href: 'mailto:contact@thenightclub.dev', label: 'Email' },
  ];

  return (
    <footer className="bg-card/50 border-t border-border/50 mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">The Night Club</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Professional development tools for modern developers.
            </p>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-border/50" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8">
          <div className="text-sm text-muted-foreground/60">
            © {currentYear} The Night Club
          </div>
          <div className="flex items-center gap-4">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
                aria-label={social.label}
              >
                <social.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
