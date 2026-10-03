import { LegalPage } from '@/components/LegalPage';

const Terms = () => (
  <LegalPage
    title="Terms & Conditions"
    updated="October 3, 2026"
    sections={[
      { heading: '1. Acceptance', body: ['By using The Night Club ("TNC"), you agree to these terms. If you do not agree, please do not use the service.'] },
      { heading: '2. Accounts', body: ['You are responsible for your account and for keeping your password safe. Information you provide must be accurate.'] },
      { heading: '3. Your content', body: ['You keep ownership of the code, posts and profile content you create. You give TNC permission to store and display it as needed to run the service.', 'Linking a GitHub repository only stores the link; TNC does not access or change your repository.'] },
      { heading: '4. Acceptable use', body: ['Do not post illegal, harmful, hateful or infringing content, attempt to break or overload the service, run malicious code, or harass other users. Community moderators may remove content that breaks group rules.'] },
      { heading: '5. Paid plans', body: ['Paid plans, if purchased, renew per the billing period shown on the Pricing page until cancelled.'] },
      { heading: '6. Termination', body: ['We may suspend accounts that break these terms. You may delete your account at any time from Settings.'] },
      { heading: '7. Disclaimer', body: ['The service is provided "as is" without warranties. TNC is not liable for indirect losses or loss of data to the extent permitted by law.'] },
      { heading: '8. Governing law', body: ['These terms are governed by the laws of India. Courts in Telangana, India have exclusive jurisdiction.'] },
      { heading: '9. Changes', body: ['We may update these terms and will change the effective date above when we do.'] },
    ]}
  />
);

export default Terms;
