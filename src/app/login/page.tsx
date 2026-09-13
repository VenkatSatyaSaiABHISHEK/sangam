'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

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
  const [errorMessage, setErrorMessage] = useState('');
  const [availableRoles, setAvailableRoles] = useState<Array<{
    role: string;
    label: string;
    name?: string;
    requiresPassword?: boolean;
  }>>([]);
  const [selectedRole, setSelectedRole] = useState<string>('admin');

  const isAdminEmail = (val: string) => {
    const lower = val.trim().toLowerCase();
    return (
      lower === 'abhi31mahi@gmail.com' ||
      lower === 'admin@sangamconnect.org' ||
      lower === 'admin@summitconnect.org' ||
      lower.includes('admin')
    );
  };

  const checkRolesForEmail = async (val: string) => {
    const clean = val.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setAvailableRoles([]);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, action: 'checkRoles' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.multipleRoles && Array.isArray(data.roles)) {
          setAvailableRoles(data.roles);
          if (!selectedRole || !data.roles.some((r: any) => r.role === selectedRole)) {
            setSelectedRole(data.roles[0].role);
          }
          const curr = data.roles.find((r: any) => r.role === (selectedRole || data.roles[0].role));
          setShowPassword(Boolean(curr?.requiresPassword));
        } else {
          setAvailableRoles([]);
          setShowPassword(isAdminEmail(clean));
        }
      }
    } catch {
      setShowPassword(isAdminEmail(clean));
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setErrorMessage('');
    const lower = val.trim().toLowerCase();
    if (lower === 'abhi31mahi@gmail.com') {
      setAvailableRoles([
        { role: 'admin', label: 'Master Administrator', name: 'Master Administrator', requiresPassword: true },
        { role: 'mentor', label: 'Summit Mentor', name: 'Abhishek', requiresPassword: false },
      ]);
      if (selectedRole === 'admin') setShowPassword(true);
    } else if (isAdminEmail(val)) {
      setAvailableRoles([]);
      setShowPassword(true);
    } else {
      setShowPassword(false);
    }
  };

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(roleKey);
    setErrorMessage('');
    const target = availableRoles.find((r) => r.role === roleKey);
    setShowPassword(Boolean(target?.requiresPassword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim()) {
      showToast('Input Required', 'Please enter your registered Sangam email address.', 'error');
      return;
    }

    const activeRoleNeedsPassword =
      availableRoles.length > 0
        ? Boolean(availableRoles.find((r) => r.role === selectedRole)?.requiresPassword)
        : isAdminEmail(email);

    if (activeRoleNeedsPassword && !password.trim()) {
      setShowPassword(true);
      setErrorMessage('Administrator password is required.');
      showToast('Password Required', 'Administrative accounts require a master password.', 'error');
      return;
    }

    setIsLoading(true);
    const res = await login(
      email.trim(),
      password,
      availableRoles.length > 0 ? selectedRole : undefined
    );
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
    } else if (res.requireRoleSelection && res.roles) {
      setAvailableRoles(res.roles);
      setSelectedRole(res.roles[0].role);
      setShowPassword(Boolean(res.roles[0].requiresPassword));
      showToast('Choose Portal', res.message || 'Please select which portal you wish to log into.', 'info');
    } else {
      if (res.requirePassword || activeRoleNeedsPassword) {
        setShowPassword(true);
        const msg = res.message || 'Invalid administrator password.';
        setErrorMessage(msg);
        showToast(msg.toLowerCase().includes('invalid') ? 'Invalid Password' : 'Password Required', msg, 'error');
      } else {
        const msg = res.message || 'No registered participant found with this email.';
        setErrorMessage(msg);
        showToast('Account Not Found', msg, 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 bg-white border border-neutral-200/80 shadow-md rounded-2xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Sign In to Sangam</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Enter your registered summit email to access your workspace.
          </p>
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
                onBlur={(e) => checkRolesForEmail(e.target.value)}
                placeholder="e.g. attendee@sangam.in or mentor@corp.com"
                className="pl-9 text-xs h-10"
              />
            </div>
          </div>

          {/* DUAL ROLE SELECTOR: Appears if email is connected to multiple roles (e.g. Admin & Mentor) */}
          {availableRoles.length > 1 && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 animate-in fade-in duration-200">
              <span className="text-[11px] font-bold text-neutral-700 block uppercase tracking-wider">
                Select Your Login Portal:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {availableRoles.map((r) => {
                  const isSelected = selectedRole === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => handleRoleSelect(r.role)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="text-xs font-bold block leading-tight">
                        {r.role === 'admin'
                          ? '🛡️ Admin'
                          : r.role === 'mentor'
                          ? '🎓 Mentor'
                          : r.role === 'teacher'
                          ? '🏛️ Faculty'
                          : '🚀 Student'}
                      </span>
                      <span className={`text-[10px] block truncate mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        {r.name || r.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showPassword && (
            <div className="animate-in fade-in duration-150">
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Enter administrator password"
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
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
                <span>
                  {availableRoles.length > 1
                    ? `Continue as ${
                        selectedRole === 'admin'
                          ? 'Master Admin'
                          : selectedRole === 'mentor'
                          ? 'Mentor'
                          : selectedRole === 'teacher'
                          ? 'Faculty'
                          : 'Student'
                      }`
                    : 'Continue to Portal'}
                </span>
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
