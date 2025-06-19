import React from 'react';
import { Link } from 'react-router-dom';
import { 
  AcademicCapIcon, 
  ShieldCheckIcon, 
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';

const HomePage: React.FC = () => {
  const { isConnected } = useAccount();

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Fully Decentralized',
      description: 'No KYC, no central authority. Your identity and reputation live on-chain with complete privacy and control.'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Mentor Freedom',
      description: 'Mentors set their own prices and terms. Direct payments in USDT/USDC with transparent 10% platform fee.'
    },
    {
      icon: UserGroupIcon,
      title: 'Private Communication',
      description: 'Secure WebRTC-powered video calls, screen sharing, and chat. No data stored on servers.'
    },
    {
      icon: AcademicCapIcon,
      title: 'Community Knowledge',
      description: 'Learn from passionate community members sharing their blockchain, development, and entrepreneurship experience.'
    },
  ];

  const testimonials = [
    {
      name: 'Crypto Learner',
      content: 'Amazing platform! I learned DeFi strategies from a top trader without any registration hassles. The privacy-first approach is exactly what crypto needs.',
      rating: 5,
    },
    {
      name: 'Blockchain Developer',
      content: 'As a mentor, I love the freedom to set my own rates and teach on my terms. The escrow system ensures I get paid fairly for my knowledge sharing.',
      rating: 5,
    },
    {
      name: 'Web3 Student',
      content: 'The community mentors here are amazing! I went from zero to building my first dApp in just a few sessions. Highly recommend!',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Decentralized Crypto Mentorship
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Connect with community members to learn blockchain technology. No KYC, no barriers - just peer-to-peer knowledge sharing with complete privacy and transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/mentors"
              className="btn-primary text-lg px-8 py-3 inline-flex items-center space-x-2"
            >
              <span>Find Mentors</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            {isConnected ? (
              <Link
                to="/dashboard"
                className="btn-secondary text-lg px-8 py-3"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="btn-secondary text-lg px-8 py-3"
              >
                Become a Mentor
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Chain Academy?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built for the decentralized future with privacy, transparency, and mentor freedom at its core.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 text-center">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Simple, secure, and decentralized mentorship in three steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Connect Your Wallet
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Connect your Web3 wallet to create your decentralized identity. No personal information required.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Find Your Mentor
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Browse community mentors, check their experience and community ratings, then book a session that fits your schedule.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Learn & Pay Securely
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Funds are held in escrow until your session is complete. Pay in USDT or USDC with full transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What Our Community Says
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  "{testimonial.content}"
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {testimonial.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Start Your Web3 Journey?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of learners and mentors building the decentralized future together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/mentors"
              className="btn-primary text-lg px-8 py-3 inline-flex items-center space-x-2"
            >
              <span>Browse Mentors</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              to="/dashboard"
              className="btn-secondary text-lg px-8 py-3"
            >
              Start Mentoring
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;