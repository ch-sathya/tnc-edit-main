import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { href: "https://github.com", icon: Github, label: "GitHub" },
    { href: "https://twitter.com", icon: Twitter, label: "Twitter" },
    { href: "https://linkedin.com", icon: Linkedin, label: "LinkedIn" },
    { href: "mailto:contact@thenightclub.dev", icon: Mail, label: "Email" },
  ];

  const sections = [
    { title: "Product", links: [
      { label: "Portfolio", to: "/portfolio" },
      { label: "Projects", to: "/projects" },
      { label: "Collaborate", to: "/collaborate" },
      { label: "Community", to: "/community" },
    ]},
    { title: "Explore", links: [
      { label: "News", to: "/news" },
      { label: "Vibe Code", to: "/vibe-code" },
      { label: "Pricing", to: "/pricing" },
      { label: "Connections", to: "/connections" },
    ]},
    { title: "Account", links: [
      { label: "Sign in", to: "/auth" },
      { label: "Settings", to: "/settings" },
      { label: "Notifications", to: "/notifications" },
    ]},
  ];

  return (
    <footer className="relative border-t border-border/40 mt-auto bg-background/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-lg font-bold text-foreground mb-3 tracking-tight">The Night Club</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Developer portfolios, communities and live collaboration.
            </p>
          </div>
          {sections.map(section => (
            <div key={section.title}>
              <h4 className="font-semibold text-foreground mb-3 text-xs tracking-widest uppercase">{section.title}</h4>
              <ul className="space-y-2 text-sm">
                {section.links.map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="opacity-40" />

        <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-muted-foreground">
            © {currentYear} The Night Club. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            {socialLinks.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
