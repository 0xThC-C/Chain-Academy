import React from 'react';
import { Link } from 'react-router-dom';

const HomePageTest: React.FC = () => {
  console.log('HomePageTest rendering...');

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Test Hero Section - No Icons */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Decentralized Crypto Mentorship
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Connect with community members to learn blockchain technology. No KYC, no barriers - just peer-to-peer knowledge sharing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/mentors"
              className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-3 rounded-lg w-full sm:w-auto text-center"
            >
              Find Mentors
            </Link>
            <Link
              to="/dashboard" 
              className="bg-gray-600 hover:bg-gray-700 text-white text-lg px-8 py-3 rounded-lg w-full sm:w-auto text-center"
            >
              Become a Mentor
            </Link>
          </div>
        </div>
      </section>

      {/* Test Features Section - No Icons */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Chain Academy?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 p-6 text-center">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">D</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Fully Decentralized
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                No KYC, no central authority. Your identity and reputation live on-chain.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 p-6 text-center">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">$</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Mentor Freedom
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Set your own prices and terms. Direct payments in USDT/USDC.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 p-6 text-center">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">P</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Private Communication
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Secure WebRTC video calls and chat. No data stored on servers.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 p-6 text-center">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">C</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Community Knowledge
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Learn from passionate community members sharing blockchain experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePageTest;