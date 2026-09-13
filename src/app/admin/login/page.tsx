'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ShieldCheck, Lock, Mail, ArrowLeft, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('admin@summitconnect.org');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      showToast('Password Required', 'Please enter your master admin password.', 'error');
      return;
    }

    setIsLoading(true);
    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      showToast('Access Granted', 'Welcome back, Master Administrator.', 'success');
      router.push('/admin/dashboard');
    } else {
      showToast('Authentication Failed', res.message || 'Invalid administrator credentials.', 'error');
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
          <span>General Portal Login</span>
        </Link>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-200 text-neutral-700 font-semibold">
          Restricted Zone
        </span>
      </div>

      <Card className="w-full max-w-md p-8 bg-white border border-neutral-200/80 shadow-lg rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Admin Command Center
          </h1>
          <p className="text-xs text-neutral-500">
            Enter administrative credentials to manage SangamConnect operations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sangamconnect.org"
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
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
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Authorize & Enter</span>
            )}
          </Button>
        </form>

        <div className="pt-4 border-t border-neutral-100 text-center">
          <p className="text-[11px] text-neutral-400">
            SangamConnect Platform • Secure Role-Based Session
          </p>
        </div>
      </Card>
    </div>
  );
}
