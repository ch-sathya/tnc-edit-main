import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import PageHead from './PageHead';

const map: Array<{ test: RegExp; title: string; desc: string }> = [
  { test: /^\/$/, title: 'Home', desc: 'Developer portfolios, communities and live collaboration.' },
  { test: /^\/home$/, title: 'Home', desc: 'Developer portfolios, communities and live collaboration.' },
  { test: /^\/portfolio$/, title: 'Portfolio', desc: 'Your developer portfolio — projects, stats and links.' },
  { test: /^\/dashboard$/, title: 'Portfolio', desc: 'Your developer portfolio.' },
  { test: /^\/projects$/, title: 'Projects', desc: 'Browse and showcase developer projects.' },
  { test: /^\/projects\/[^/]+$/, title: 'Project', desc: 'Project details, files, and contributors.' },
  { test: /^\/editor\//, title: 'Editor', desc: 'Edit your project in the in-browser editor.' },
  { test: /^\/collaborate$/, title: 'Collaborate', desc: 'Start or join a live collaboration room.' },
  { test: /^\/collaborate\/join$/, title: 'Join room', desc: 'Join a collaboration room with an invite code.' },
  { test: /^\/collaborate\/[^/]+$/, title: 'Collaboration room', desc: 'Code together in real time.' },
  { test: /^\/community$/, title: 'Community', desc: 'Join community groups, share posts and discuss with developers.' },
  { test: /^\/connections$/, title: 'Connections', desc: 'Your network and direct messages.' },
  { test: /^\/user\//, title: 'Profile', desc: 'Developer profile and projects.' },
  { test: /^\/news$/, title: 'News', desc: 'The latest in developer news.' },
  { test: /^\/news\/[^/]+$/, title: 'Article', desc: 'Developer news article.' },
  { test: /^\/auth$/, title: 'Sign in', desc: 'Sign in or create your account.' },
  { test: /^\/setup-username$/, title: 'Pick a username', desc: 'Finish setting up your account.' },
  { test: /^\/settings$/, title: 'Settings', desc: 'Account, profile and notification settings.' },
  { test: /^\/notifications$/, title: 'Notifications', desc: 'Your activity and notifications.' },
  { test: /^\/reset-password$/, title: 'Reset password', desc: 'Reset your account password.' },
  { test: /^\/pricing$/, title: 'Pricing', desc: 'Plans and pricing.' },
  { test: /^\/vibe-code$/, title: 'Vibe Code', desc: 'AI-assisted coding playground.' },
  { test: /^\/snippet\//, title: 'Shared snippet', desc: 'A shared code snippet.' },
  { test: /^\/@/, title: 'Profile', desc: 'Developer profile.' },
];

export const RouteHead: React.FC = () => {
  const { pathname } = useLocation();
  const match = map.find(m => m.test.test(pathname));
  if (!match) return <PageHead title="Page not found" noIndex />;
  return <PageHead title={match.title} description={match.desc} path={pathname} />;
};

export default RouteHead;
