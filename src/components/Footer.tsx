import React from 'react';
import { Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { href: "mailto:contact@thenightclub.dev", icon: Mail, label: "Email" },
  ];

  return (
    <footer className="relative border-t border-border/30 mt-auto" style={{
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-1">
              <h3 className="text-xl font-bold text-foreground mb-4 tracking-tight">The Night Club</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Professional development tools for modern developers
              </p>
            </div>

            {[
              { title: "Platform", links: [
                { label: "Collaborate", href: "/collaborate" },
                { label: "Vibe Code", href: "/vibe-code" },
                { label: "Showcase", href: "/projects" },
              ]},
              { title: "Community", links: [
                { label: "Groups", href: "/community" },
                { label: "Connections", href: "/connections" },
                { label: "News", href: "/news" },
              ]},
              { title: "Account", links: [
                { label: "Pricing", href: "/pricing" },
                { label: "Sign in", href: "/auth" },
                { label: "Settings", href: "/settings" },
              ]},
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-foreground mb-4 text-sm tracking-wide uppercase">{section.title}</h4>
                <ul className="space-y-2.5 text-sm">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-muted-foreground hover:text-foreground transition-colors duration-300">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <Separator className="my-8 opacity-30" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {currentYear} The Night Club. All rights reserved.
          </div>
          <div className="flex items-center gap-5">
            {socialLinks.map(({ href, icon: Icon, label }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label={label}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="h-4 w-4" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
