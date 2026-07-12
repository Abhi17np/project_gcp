// To add an FAQ, append an object to this array. No other file needs to change.

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  audience: 'employer' | 'jobseeker' | 'all';
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'employer-1',
    question: 'How quickly can I hire using HiYrNow?',
    answer:
      'Many employers fill positions within 48 hours thanks to our AI-powered candidate matching and instant notifications.',
    keywords: ['quickly', 'fast', 'speed', 'hire', 'hiring', '48 hours', 'how long', 'time to hire', 'quick'],
    audience: 'employer',
  },
  {
    id: 'employer-2',
    question: 'Is there a free trial for employers?',
    answer:
      'Yes, new employers get a free trial to experience our platform before committing to a subscription.',
    keywords: ['trial', 'employer trial', 'free trial', 'subscription', 'employer plan', 'employer cost', 'employer fee'],
    audience: 'employer',
  },
  {
    id: 'employer-3',
    question: 'Can I hire for multiple locations?',
    answer:
      'Absolutely. Post jobs across multiple cities in India and manage all applicants from one central dashboard.',
    keywords: ['multiple', 'locations', 'cities', 'city', 'different places', 'pan india', 'across india', 'many locations'],
    audience: 'employer',
  },
  {
    id: 'jobseeker-1',
    question: 'Is HiYrNow free for job seekers?',
    answer: 'Yes! You can browse jobs, apply, and track your applications at no cost.',
    keywords: ['free', 'cost', 'price', 'fee', 'charge', 'pay', 'job seeker', 'jobseeker', 'candidate free', 'no cost'],
    audience: 'jobseeker',
  },
  {
    id: 'jobseeker-2',
    question: 'How does the AI job matching work?',
    answer:
      'Our AI analyzes your skills, experience, and preferences to match you with the most relevant job opportunities.',
    keywords: ['ai', 'matching', 'match', 'how does', 'algorithm', 'recommend', 'job match', 'skill match', 'ai matching'],
    audience: 'jobseeker',
  },
  {
    id: 'jobseeker-3',
    question: 'Can I apply for remote jobs?',
    answer: 'Yes, HiYrNow lists remote opportunities as well as jobs in cities across India.',
    keywords: ['remote', 'work from home', 'wfh', 'work remotely', 'remote jobs', 'online jobs', 'remote work'],
    audience: 'jobseeker',
  },
];
