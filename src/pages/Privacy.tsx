import { LegalPage } from '@/components/LegalPage';

const Privacy = () => (
  <LegalPage
    title="Privacy Policy"
    updated="October 3, 2026"
    sections={[
      { heading: '1. Who we are', body: ['The Night Club ("TNC", "we", "us") operates this website from Telangana, India. This policy explains what we collect and how we use it.'] },
      { heading: '2. Information we collect', body: ['Account details you give us (email, username, display name, photo, banner).', 'Profile content you add: bio, skills, work history, education, certifications, projects and GitHub links.', 'Content you create: posts, comments, chat messages and code in collaboration rooms.', 'Basic technical data such as browser type and sign-in times, used to keep the service secure.'] },
      { heading: '3. How we use it', body: ['To run your account, show your public portfolio, power real-time collaboration and communities, prevent abuse, and improve the service. We do not sell your personal data.'] },
      { heading: '4. Public information', body: ['If your profile is public, your portfolio at /in/username/ can be viewed by anyone. You can make it private in Settings.'] },
      { heading: '5. Storage and security', body: ['Data is stored with our hosting provider using access controls and encryption in transit. No method is perfectly secure, but we take reasonable steps to protect your information.'] },
      { heading: '6. Your rights', body: ['You may access, correct or delete your data. You can delete your account from Settings, which removes your profile and content. Under the Digital Personal Data Protection Act, 2023 (India), you may also contact us to exercise your rights.'] },
      { heading: '7. Cookies', body: ['We use essential storage only to keep you signed in. We do not use advertising cookies.'] },
      { heading: '8. Children', body: ['The service is not intended for anyone under 13.'] },
      { heading: '9. Changes', body: ['We may update this policy and will change the effective date above when we do.'] },
    ]}
  />
);

export default Privacy;
