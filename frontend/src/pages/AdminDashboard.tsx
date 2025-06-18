import React from 'react';
import { PaymentBotStatus } from '../components/PaymentBotStatus';
import { usePaymentBot, usePaymentBotHealth } from '../hooks/usePaymentBot';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AdminDashboard: React.FC = () => {
  const { status, metrics } = usePaymentBot();
  const { healthStatus, healthMessages } = usePaymentBotHealth();

  const getHealthIcon = () => {
    switch (healthStatus) {
      case 'critical':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <ClockIcon className="w-6 h-6 text-yellow-500" />;
      default:
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
    }
  };

  const getHealthColor = () => {
    switch (healthStatus) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-green-500 bg-green-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitor and control the Chain Academy payment automation system
          </p>
        </div>

        {/* Health Alert Banner */}
        {healthStatus !== 'healthy' && (
          <div className={`rounded-lg border-2 p-4 mb-6 ${getHealthColor()}`}>
            <div className="flex items-start space-x-3">
              {getHealthIcon()}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {healthStatus === 'critical' ? 'Critical Alert' : 'Warning'}
                </h3>
                <div className="mt-2 space-y-1">
                  {healthMessages.map((message, index) => (
                    <p key={index} className="text-sm text-gray-700">
                      • {message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Bot Status */}
        <div className="mb-8">
          <PaymentBotStatus />
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Payments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {status?.lastExecution?.totalProcessed || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Success Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics ? (
                      metrics.totalExecutions > 0 
                        ? `${Math.round((metrics.successfulExecutions / metrics.totalExecutions) * 100)}%`
                        : 'N/A'
                    ) : '-'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Failed Payments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {status?.lastExecution?.failedPayments || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Uptime
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {status ? `${Math.round(status.uptime / 3600)}h` : '-'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Activity</h3>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500 py-8">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Activity Log</h3>
              <p className="mt-1 text-sm text-gray-500">
                Detailed activity logging will be implemented here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;