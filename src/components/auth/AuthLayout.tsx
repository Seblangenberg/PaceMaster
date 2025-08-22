import React from 'react';


interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showLogo?: boolean;
}

export function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  showLogo = true 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-green-50">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_35%,rgba(0,0,0,.05)_35%,rgba(0,0,0,.05)_65%,transparent_65%),linear-gradient(-45deg,transparent_35%,rgba(0,0,0,.05)_35%,rgba(0,0,0,.05)_65%,transparent_65%)] bg-[length:20px_20px] opacity-30" />
      
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Header */}
          {showLogo && (
            <div className="text-center mb-8">
              {/* Logo with enhanced styling */}
              <div className="flex justify-center items-center gap-3 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
                  <span className="text-3xl text-white" role="img" aria-label="Horse">🐎</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold font-headline text-primary-900">
                    Hunter Pace Timer
                  </h1>
                  <p className="text-sm text-primary-600 font-medium">
                    Event Timer & Management
                  </p>
                </div>
              </div>
              
              {/* Title and subtitle */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {title}
                </h2>
                <p className="text-gray-600">
                  {subtitle}
                </p>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            {children}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Professional hunter pace event timer and management system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}