'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isAdminEmail = (val: string) => {
    const lower = val.trim().toLowerCase();
    return (
      lower === 'abhi31mahi@gmail.com' ||
      lower === 'admin@sangamconnect.org' ||
      lower === 'admin@summitconnect.org' ||
      lower.includes('admin')
    );
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (isAdminEmail(val)) {
      setShowPassword(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Input Required', 'Please enter your registered Sangam email address.', 'error');
      return;
    }

    if (isAdminEmail(email) && !password.trim()) {
      setShowPassword(true);
      showToast('Password Required', 'Administrative accounts require a master password.', 'error');
      return;
    }

    setIsLoading(true);
    const res = await login(email.trim(), password);
    setIsLoading(false);

    if (res.success && res.role) {
      showToast('Authentication Verified', `Welcome! Entering your ${res.role} portal...`, 'success');
      if (callbackUrl) {
        router.push(callbackUrl);
      } else if (res.role === 'student') {
        router.push('/student');
      } else if (res.role === 'mentor') {
        router.push('/mentor/dashboard');
      } else if (res.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (res.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
    } else {
      if (res.requirePassword || isAdminEmail(email)) {
        setShowPassword(true);
        showToast('Password Required', res.message || 'Administrative accounts require a master password.', 'error');
      } else {
        showToast('Account Not Found', res.message || 'No registered participant found with this email.', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white border border-neutral-200/80 shadow-sm rounded-2xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Sign In to Your Account</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="e.g. attendee@sangam.in or mentor@corp.com"
                className="pl-9 text-xs h-10"
              />
            </div>
          </div>

          {showPassword && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Password (Admin Access)
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-semibold h-10 shadow-sm transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span>Continue to Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-neutral-400">Loading portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
