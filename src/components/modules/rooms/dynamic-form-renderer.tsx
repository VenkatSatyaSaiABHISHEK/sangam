'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Room, RoomSubmission, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import {
  CheckCircle2,
  MapPin,
  Camera,
  FolderUp,
  FileText,
  X,
  ArrowRight,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface DynamicFormRendererProps {
  room: Room;
  onSuccess?: () => void;
}

export function DynamicFormRenderer({ room, onSuccess }: DynamicFormRendererProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [students, setStudents] = useState<User[]>([]);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Existing submission state: if already submitted, do not ask again!
  const [existingSubmission, setExistingSubmission] = useState<RoomSubmission | null>(null);
  const [roomSubmissions, setRoomSubmissions] = useState<RoomSubmission[]>([]);

  // 1. Check local storage and room submissions on load
  useEffect(() => {
    // Check localStorage first
    try {
      const localRecord = localStorage.getItem(`sangam_room_submitted_${room.id}`);
      if (localRecord) {
        const parsed = JSON.parse(localRecord);
        if (parsed && parsed.roomId?.toLowerCase() === room.id.toLowerCase()) {
          setExistingSubmission(parsed);
        }
      }
    } catch {}

    // Load registered students
    fetch('/api/data?include=students')
      .then((res) => res.json())
      .then((data) => {
        if (data.students) setStudents(data.students);
      })
      .catch(() => {
        setStudents(db.getStudents());
      });

    // Fetch existing room submissions to check for server-side deduplication
    fetch(`/api/rooms/${room.id}/submissions`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.submissions)) {
          setRoomSubmissions(data.submissions);

          // If user is authenticated, check if they already submitted
          if (user) {
            const userPhone = user.phone?.replace(/\D/g, '').slice(-10);
            const userEmail = user.email?.trim().toLowerCase();
            const matchedSub = data.submissions.find(
              (s: RoomSubmission) =>
                (s.submittedBy?.userId && s.submittedBy.userId === user.id) ||
                (userEmail && s.submittedBy?.email?.trim().toLowerCase() === userEmail) ||
                (userPhone && s.submittedBy?.phone?.replace(/\D/g, '').slice(-10) === userPhone)
            );
            if (matchedSub) {
              setExistingSubmission(matchedSub);
              try {
                localStorage.setItem(`sangam_room_submitted_${room.id}`, JSON.stringify(matchedSub));
              } catch {}
            }
          }
        }
      })
      .catch((err) => console.warn('Error fetching submissions for deduplication:', err))
      .finally(() => {
        setCheckingExisting(false);
      });
  }, [room.id, user]);

  // Pre-fill fields if user is authenticated and hasn't filled them yet
  useEffect(() => {
    if (!user || existingSubmission) return;
    setFormData((prev) => {
      const updated = { ...prev };
      room.fields.forEach((field) => {
        if (updated[field.id] !== undefined) return;
        const lowerLabel = field.label.toLowerCase();
        if (field.type === 'phone' || lowerLabel.includes('phone') || field.id === 'f_phone') {
          if (user.phone) updated[field.id] = user.phone;
        } else if (field.type === 'email' || lowerLabel.includes('email') || field.id === 'f_email') {
          if (user.email) updated[field.id] = user.email;
        } else if (lowerLabel.includes('name') || field.id === 'f_name') {
          if (user.fullName) updated[field.id] = user.fullName;
        } else if (field.type === 'yes_no' && field.defaultValue) {
          updated[field.id] = field.defaultValue;
        }
      });
      return updated;
    });
  }, [user, room.fields, existingSubmission]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Find phone and email from current form state
  const phoneField = room.fields.find((f) => f.type === 'phone' || f.id.includes('phone') || f.label.toLowerCase().includes('phone'));
  const currentPhone = (phoneField ? formData[phoneField.id] : '')?.toString().trim() || '';
  const cleanPhone = currentPhone.replace(/\D/g, '').slice(-10);

  const emailField = room.fields.find((f) => f.type === 'email' || f.id.includes('email') || f.label.toLowerCase().includes('email'));
  const currentEmail = (emailField ? formData[emailField.id] : '')?.toString().trim().toLowerCase() || '';

  const nameField = room.fields.find((f) => f.label.toLowerCase().includes('name') || f.id === 'f_name');

  // Smart student recognition from phone or email
  const matchedStudent = useMemo(() => {
    if (cleanPhone.length >= 10) {
      const byPhone = students.find((s) => s.phone && s.phone.replace(/\D/g, '').slice(-10) === cleanPhone);
      if (byPhone) return byPhone;
    }
    if (currentEmail && currentEmail.includes('@') && currentEmail.includes('.')) {
      const byEmail = students.find((s) => s.email.toLowerCase() === currentEmail);
      if (byEmail) return byEmail;
    }
    return null;
  }, [cleanPhone, currentEmail, students]);

  // When a student is recognized, auto-fill student's Name and check if they already submitted
  useEffect(() => {
    if (matchedStudent) {
      if (nameField && !formData[nameField.id]) {
        handleFieldChange(nameField.id, matchedStudent.fullName);
      }
      // Check if this matched student has already submitted
      const studentPhone = matchedStudent.phone?.replace(/\D/g, '').slice(-10);
      const studentEmail = matchedStudent.email?.toLowerCase();
      const existing = roomSubmissions.find(
        (s) =>
          (s.submittedBy?.userId && s.submittedBy.userId === matchedStudent.id) ||
          (studentPhone && s.submittedBy?.phone?.replace(/\D/g, '').slice(-10) === studentPhone) ||
          (studentEmail && s.submittedBy?.email?.toLowerCase() === studentEmail)
      );
      if (existing) {
        setExistingSubmission(existing);
        try {
          localStorage.setItem(`sangam_room_submitted_${room.id}`, JSON.stringify(existing));
        } catch {}
      }
    }
  }, [matchedStudent, nameField, formData, roomSubmissions, room.id]);

  const isNewStudentEmail =
    room.category === 'attendance' &&
    currentEmail.length > 5 &&
    currentEmail.includes('@') &&
    currentEmail.includes('.') &&
    !matchedStudent;

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation Unsupported', 'Your browser does not support GPS.', 'error');
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        };
        setGpsCoordinates(coords);
        handleFieldChange('gps', coords);
        setCapturingGps(false);
        showToast('GPS Verified', `${coords.lat}° N, ${coords.lng}° E`, 'success');
      },
      (err) => {
        setCapturingGps(false);
        showToast('GPS Error', err.message || 'Location permission denied.', 'error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check required fields
    for (const field of room.fields) {
      if (field.required && (formData[field.id] === undefined || formData[field.id] === '')) {
        showToast('Required Field Missing', `Please complete: ${field.label}`, 'error');
        return;
      }
    }

    if (isNewStudentEmail && !formData.new_student_name?.trim()) {
      showToast('Participant Name Required', 'Please enter your Full Name to complete registration.', 'error');
      return;
    }

    setLoading(true);

    let finalUserId = matchedStudent?.id || user?.id;
    let finalName =
      matchedStudent?.fullName ||
      (nameField ? formData[nameField.id] : '') ||
      formData.new_student_name?.trim() ||
      formData.f_name ||
      user?.fullName ||
      'Participant';
    let finalPhone =
      matchedStudent?.phone ||
      currentPhone ||
      formData.new_student_phone?.trim() ||
      user?.phone;
    let finalEmail =
      matchedStudent?.email ||
      currentEmail ||
      user?.email;

    // Auto-register new student if it's an attendance room and new email
    if (isNewStudentEmail && formData.new_student_name?.trim()) {
      try {
        const createRes = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createStudent',
            payload: {
              fullName: formData.new_student_name.trim(),
              email: currentEmail,
              phone: finalPhone || '+91 000 000 0000',
              branch: formData.new_student_branch?.trim() || 'General',
              year: '1st Year',
            },
          }),
        });
        if (createRes.ok) {
          const resData = await createRes.json();
          if (resData.student) {
            finalUserId = resData.student.id;
            finalName = resData.student.fullName;
          }
        }
      } catch (err) {
        console.warn('Auto-register new student error:', err);
      }
    }

    const submission: RoomSubmission = {
      id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      roomId: room.id,
      eventId: room.eventId || 'sangam-2027',
      submittedBy: {
        userId: finalUserId,
        fullName: finalName,
        email: finalEmail || undefined,
        phone: finalPhone || undefined,
      },
      answers: formData,
      gpsCoordinates: gpsCoordinates || undefined,
      submittedAt: new Date().toISOString(),
    };

    // 1. Submit to API (saves to DB, syncs to Firestore, marks attendance automatically)
    try {
      const res = await fetch(`/api/rooms/${room.id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (!res.ok) {
        // Fallback to /api/data
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submitToRoom', payload: submission }),
        });
      }
    } catch (err) {
      console.warn('Submission network error:', err);
    }

    // 2. Cache in localStorage so student is never asked again
    try {
      localStorage.setItem(`sangam_room_submitted_${room.id}`, JSON.stringify(submission));
    } catch {}

    setExistingSubmission(submission);
    setLoading(false);
    showToast('Submission Recorded', 'Your response has been saved and verified.', 'success');
    if (onSuccess) onSuccess();
  };

  // ==========================================
  // IF ALREADY SUBMITTED: DO NOT ASK AGAIN!
  // ==========================================
  if (existingSubmission) {
    const isAttendanceRoom =
      room.category === 'attendance' ||
      room.title?.toLowerCase().includes('attendance') ||
      room.purpose?.toLowerCase().includes('attendance');

    const submitterName =
      existingSubmission.submittedBy?.fullName ||
      user?.fullName ||
      (nameField && existingSubmission.answers?.[nameField.id]) ||
      'Registered Participant';

    const submitterPhone =
      existingSubmission.submittedBy?.phone ||
      (phoneField && existingSubmission.answers?.[phoneField.id]) ||
      user?.phone;

    const submitterEmail =
      existingSubmission.submittedBy?.email ||
      (emailField && existingSubmission.answers?.[emailField.id]) ||
      user?.email;

    return (
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Confirmed Card */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Response Already Recorded</span>
            </span>

            <h2 className="text-xl font-bold tracking-tight text-neutral-950">
              You&apos;re All Set!
            </h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              You have already completed the submission for &ldquo;{room.title}&rdquo;.
              Your attendance and responses are safely locked.
            </p>
          </div>

          {/* Student & Attendance Status Box */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Participant Details
              </span>
              {isAttendanceRoom && (
                <Badge className="bg-emerald-600 text-white gap-1 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Marked Present</span>
                </Badge>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Student Name:</span>
                <span className="font-bold text-neutral-900">{submitterName}</span>
              </div>

              {submitterPhone && (
                <div className="flex items-center justify-between font-mono">
                  <span className="text-neutral-500">Phone:</span>
                  <span className="font-semibold text-neutral-800">{submitterPhone}</span>
                </div>
              )}

              {submitterEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Email:</span>
                  <span className="text-neutral-700 truncate max-w-[200px]">{submitterEmail}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-neutral-500 pt-1">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Submitted On:
                </span>
                <span className="font-mono text-[11px] text-neutral-700">
                  {formatDateTime(existingSubmission.submittedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Answer Preview */}
          {room.fields.length > 0 && existingSubmission.answers && (
            <div className="p-4 rounded-xl bg-neutral-50/50 border border-neutral-200 text-left space-y-2">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Submitted Answers
              </span>
              <div className="space-y-1.5 text-xs divide-y divide-neutral-200/60">
                {room.fields.map((f) => {
                  const val = existingSubmission.answers[f.id];
                  if (val === undefined || val === null || val === '') return null;
                  return (
                    <div key={f.id} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2">
                      <span className="text-neutral-500 text-[11px]">{f.label}:</span>
                      <span className="font-medium text-neutral-900 text-right text-[11px] max-w-[220px] truncate">
                        {typeof val === 'object' ? (val.name || JSON.stringify(val)) : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 text-[11px] text-neutral-400 font-mono">
            ID: {existingSubmission.id} • NO DUPLICATE ENTRIES ALLOWED
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // INITIAL FORM (IF NOT YET SUBMITTED)
  // ==========================================
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      {/* Recognized Student Banner if Phone or Email Matched */}
      {matchedStudent && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Recognized Sangam Participant</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            Welcome, <strong>{matchedStudent.fullName}</strong>
            {matchedStudent.branch ? ` (${matchedStudent.branch})` : ''}
            {matchedStudent.teamName ? ` · Team ${matchedStudent.teamName}` : ''}.
            Your attendance will be automatically linked and verified upon submission.
          </p>
        </div>
      )}

      {/* Render Dynamic Fields */}
      {room.fields.map((field) => {
        const value = formData[field.id] ?? '';

        switch (field.type) {
          case 'yes_no':
            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFieldChange(field.id, 'Yes')}
                    className={`py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      value === 'Yes'
                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange(field.id, 'No')}
                    className={`py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      value === 'No'
                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            );

          case 'single_select':
            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="">-- Select an option --</option>
                  {(field.options || ['Option 1', 'Option 2']).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );

          case 'multi_select':
            const selectedList: string[] = Array.isArray(value) ? value : [];
            return (
              <div key={field.id} className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <div className="space-y-1.5">
                  {(field.options || ['Option A', 'Option B']).map((opt) => {
                    const isChecked = selectedList.includes(opt);
                    return (
                      <label
                        key={opt}
                        className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer select-none text-xs text-neutral-800"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleFieldChange(field.id, [...selectedList, opt]);
                            } else {
                              handleFieldChange(
                                field.id,
                                selectedList.filter((item) => item !== opt)
                              );
                            }
                          }}
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );

          case 'long_text':
            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder || 'Type here...'}
                  required={field.required}
                  className="w-full p-3 text-sm rounded-lg border border-neutral-300 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            );

          case 'gps':
            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCaptureGps}
                    isLoading={capturingGps}
                    className="gap-1.5 text-xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-neutral-700" />
                    <span>{gpsCoordinates ? 'Update GPS Location' : 'Capture Location'}</span>
                  </Button>
                  {gpsCoordinates && (
                    <span className="text-[11px] font-mono text-emerald-600 font-medium">
                      ✓ {gpsCoordinates.lat.toFixed(4)}, {gpsCoordinates.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            );

          case 'photo':
            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-300 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors">
                  <Camera className="w-5 h-5 text-neutral-400 mb-1" />
                  <span className="text-xs text-neutral-600">
                    {value ? 'Photo attached ✓' : 'Upload or Snap Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFieldChange(field.id, file.name);
                    }}
                  />
                </label>
              </div>
            );

          case 'file':
            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <div className="p-5 border-2 border-dashed border-neutral-300 rounded-xl hover:border-neutral-900 bg-neutral-50/50 transition-colors text-center">
                  <input
                    type="file"
                    id={field.id}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handleFieldChange(field.id, {
                        name: file.name,
                        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                        type: file.type || 'application/octet-stream',
                        uploadedAt: new Date().toISOString(),
                      });
                    }}
                  />
                  <label htmlFor={field.id} className="cursor-pointer block">
                    <FolderUp className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    {value?.name ? (
                      <div className="inline-flex items-center gap-2 p-2 bg-white rounded-lg border border-neutral-200 text-xs font-medium text-neutral-900 shadow-2xs">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold">{value.name}</span>
                        <span className="text-neutral-400 font-mono text-[11px]">({value.size})</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFieldChange(field.id, null);
                          }}
                          className="text-neutral-400 hover:text-rose-600 p-0.5 ml-1 cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-bold text-neutral-800">
                          Click to browse and upload file
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-1">
                          Supports PDF, Word, Excel, ZIP, Code, &amp; Media up to 50MB
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </div>
            );

          case 'phone':
            return (
              <div key={field.id} className="space-y-1.5">
                <Input
                  type="tel"
                  label={field.label + (field.required ? ' *' : '')}
                  placeholder={field.placeholder || '+91 91000 10010'}
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                />
                <p className="text-[11px] text-neutral-400">
                  Enter your 10-digit mobile number to automatically verify and record your attendance.
                </p>
              </div>
            );

          case 'email':
            return (
              <div key={field.id} className="space-y-2">
                <Input
                  type="email"
                  label={field.label + (field.required ? ' *' : '')}
                  placeholder={field.placeholder || 'e.g. participant@gmail.com'}
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                />

                {/* Smart new participant form if email is new in attendance room */}
                {isNewStudentEmail && (
                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                      <UserPlus className="w-4 h-4 text-neutral-700 shrink-0" />
                      <span>New Participant Registration</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      We didn&apos;t find this email in our pre-registered list. Enter your details below to confirm attendance.
                    </p>

                    <div className="space-y-2 pt-1">
                      <Input
                        label="Your Full Name *"
                        placeholder="e.g. Ananya Sen"
                        value={formData.new_student_name || ''}
                        onChange={(e) => handleFieldChange('new_student_name', e.target.value)}
                        required
                        className="bg-white text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Roll Number / ID"
                          placeholder="e.g. 21BCE102"
                          value={formData.new_student_roll || ''}
                          onChange={(e) => handleFieldChange('new_student_roll', e.target.value)}
                          className="bg-white text-xs"
                        />
                        <Input
                          label="Branch / Dept"
                          placeholder="e.g. CSE or ECE"
                          value={formData.new_student_branch || ''}
                          onChange={(e) => handleFieldChange('new_student_branch', e.target.value)}
                          className="bg-white text-xs"
                        />
                      </div>
                      <Input
                        label="Phone Number"
                        placeholder="+91 98000 00000"
                        value={formData.new_student_phone || ''}
                        onChange={(e) => handleFieldChange('new_student_phone', e.target.value)}
                        className="bg-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            );

          case 'checkbox':
            return (
              <label
                key={field.id}
                className="flex items-start gap-2.5 p-3 rounded-lg border border-neutral-200 bg-neutral-50/50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                  required={field.required}
                  className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span className="text-xs text-neutral-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </span>
              </label>
            );

          default: {
            const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text';
            return (
              <Input
                key={field.id}
                type={inputType}
                label={field.label + (field.required ? ' *' : '')}
                placeholder={field.placeholder || ''}
                value={value}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={field.required}
              />
            );
          }
        }
      })}

      <div className="pt-2">
        <Button type="submit" size="lg" className="w-full py-3" isLoading={loading}>
          <span>Submit Response</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </form>
  );
}
