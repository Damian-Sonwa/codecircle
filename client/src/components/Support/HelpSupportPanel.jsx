import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, LifeBuoy, HelpCircle, Mail } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'What is the Welcome Lounge for?',
    answer:
      'It is your soft landing zone—introduce yourself, meet peers, and discover the stories powering our global tech family.',
  },
  {
    question: 'How do I navigate the app and join groups?',
    answer:
      'Use the left sidebar to move between Dashboard, Messages, Groups, and Classrooms. Tap “Join Tech Group” to explore circles that match your current focus.',
  },
  {
    question: 'How do I report bugs or suggest new features?',
    answer:
      'Share detailed feedback (screenshots help!) in the Feedback circle or email the support team listed below so we can act quickly.',
  },
  {
    question: 'Can I share my own tech news or projects?',
    answer:
      'Absolutely—bring your best ideas, articles, repos, and demos. Tag the right circles and cite your sources for maximum reach.',
  },
  {
    question: 'How often are community announcements posted?',
    answer:
      'Expect weekly roundups plus timely alerts whenever major platform updates or industry shifts hit the radar.',
  },
  {
    question: 'Who do I contact for help?',
    answer:
      'Reach out to our community support team via the contact section below—we are here to help you ship and shine.',
  },
];

const HelpSupportPanel = ({ open, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 12, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-900/80 text-slate-100 shadow-[0_25px_80px_-45px_rgba(59,130,246,0.65)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4">
              <div className="flex items-center gap-3 text-slate-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300">
                  <LifeBuoy className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">Help & Support</h2>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-300">
                    FAQ • Contact • Community Care
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
                aria-label="Close help and support"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6 space-y-8">
              <section>
                <div className="flex items-center gap-2 text-slate-200">
                  <HelpCircle className="h-5 w-5 text-sky-300" />
                  <h3 className="text-base font-semibold tracking-wide">Frequently Asked Questions</h3>
                </div>
                <p className="mt-2 text-sm text-slate-300/80">
                  Quick answers to common questions about navigating CodeCircle and finding your people.
                </p>
                <div className="mt-5 space-y-4">
                  {FAQ_ITEMS.map((item) => (
                    <div
                      key={item.question}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <p className="font-semibold text-slate-100">{item.question}</p>
                      <p className="mt-1 text-sm text-slate-300/90">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 text-slate-200">
                  <Mail className="h-5 w-5 text-emerald-300" />
                  <h3 className="text-base font-semibold tracking-wide">Contact Support</h3>
                </div>
                <p className="mt-2 text-sm text-slate-300/80">
                  Need a hand? Email us with screenshots, device details, and any steps to reproduce issues so we can help fast.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <a
                    href="mailto:madudamian25@gmail.com"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                  >
                    madudamian25@gmail.com
                  </a>
                  <a
                    href="mailto:sonwamikedeeson@gmail.com"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                  >
                    sonwamikedeeson@gmail.com
                  </a>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HelpSupportPanel;
