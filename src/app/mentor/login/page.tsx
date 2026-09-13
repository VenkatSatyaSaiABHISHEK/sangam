'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { GraduationCap, Mail, ArrowLeft, Loader2, ArrowRight } from 'lucide-react';

export default function MentorLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Email Required', 'Please enter your registered advisor email address.', 'error');
      return;
    }

    setIsLoading(true);
    const res = await login(email.trim());
    setIsLoading(false);

    if (res.success && res.role === 'mentor') {
      showToast('Welcome Advisor', 'Entering Mentor Hub...', 'success');
      router.push('/mentor/dashboard');
    } else if (res.success && res.role) {
      showToast('Role Redirect', `You are registered as ${res.role}. Redirecting to your portal...`, 'info');
      router.push(`/${res.role}`);
    } else {
      showToast('Not Found', res.message || 'No mentor account registered with this email.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/70 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Portals</span>
        </Link>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-200 text-neutral-700 font-semibold">
          Mentor Hub
        </span>
      </div>

      <Card className="w-full max-w-md p-8 bg-white border border-neutral-200/80 shadow-lg rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Mentor & Advisor Sign In
          </h1>
          <p className="text-xs text-neutral-500">
            Access your assigned teams, track progress, and communicate with student pods.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Advisor Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. mentor@partner-lab.org"
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-semibold h-10 shadow-sm transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Checking advisor records...</span>
              </>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span>Enter Mentor Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </Button>
        </form>

        <div className="pt-3 border-t border-neutral-100 space-y-2">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-center">
            Registered Mentor Account
          </p>
          <button
            type="button"
            onClick={() => setEmail('ram@gmail.com')}
            className="w-full p-2 rounded-lg border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-left transition-colors cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] font-bold text-neutral-800">RAM</div>
              <div className="text-[10px] text-neutral-500">ram@gmail.com</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-semibold">Auto-fill</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
