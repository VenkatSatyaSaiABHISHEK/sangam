'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Room, RoomSubmission, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { db } from '@/lib/db';
import {
  CheckCircle2,
  MapPin,
  Camera,
  QrCode,
  Check,
  AlertCircle,
  ArrowRight,
  UserCheck,
  UserPlus,
  FolderUp,
  FileText,
  Upload,
  X,
} from 'lucide-react';

interface DynamicFormRendererProps {
  room: Room;
  onSuccess?: () => void;
}

export function DynamicFormRenderer({ room, onSuccess }: DynamicFormRendererProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [students, setStudents] = useState<User[]>([]);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/data?include=students')
      .then((res) => res.json())
      .then((data) => {
        if (data.students) setStudents(data.students);
      })
      .catch(() => {
        setStudents(db.getStudents());
      });
  }, []);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Find email field if present
  const emailField = room.fields.find((f) => f.type === 'email' || f.id.includes('email'));
  const currentEmail = (emailField ? formData[emailField.id] : '')?.trim().toLowerCase() || '';

  // Smart student recognition
  const matchedStudent = useMemo(() => {
    if (!currentEmail || !currentEmail.includes('@')) return null;
    return students.find((s) => s.email.toLowerCase() === currentEmail) || null;
  }, [currentEmail, students]);

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
      if (field.required && !formData[field.id]) {
        showToast('Missing Required Field', `Please complete: ${field.label}`, 'error');
        return;
      }
    }

    if (isNewStudentEmail && !formData.new_student_name?.trim()) {
      showToast('Participant Name Required', 'Please enter your Full Name to complete attendance registration.', 'error');
      return;
    }

    setLoading(true);

    let finalUserId = matchedStudent?.id;
    let finalName = matchedStudent?.fullName || formData.new_student_name?.trim() || formData.f_name || 'Participant';
    let finalPhone = matchedStudent?.phone || formData.new_student_phone?.trim() || formData.f_phone;

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
              phone: formData.new_student_phone?.trim() || '+1 000 000 0000',
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

    // Mark attendance if room is attendance
    if (room.category === 'attendance' && finalUserId) {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAttendance',
          payload: {
            studentId: finalUserId,
            status: 'present',
            verifiedBy: `room:${room.id}`,
          },
        }),
      }).catch((err) => console.warn('Attendance sync error:', err));
    }

    const submission: RoomSubmission = {
      id: `sub_${Date.now().toString(36)}`,
      roomId: room.id,
      eventId: room.eventId,
      submittedBy: {
        userId: finalUserId,
        fullName: finalName,
        email: currentEmail || undefined,
        phone: finalPhone,
      },
      answers: formData,
      gpsCoordinates: gpsCoordinates || undefined,
      submittedAt: new Date().toISOString(),
    };

    db.submitToRoom(submission);
    setLoading(false);
    setSubmitted(true);
    showToast('Submission Recorded', 'Your response and attendance have been saved.', 'success');
    if (onSuccess) onSuccess();
  };

  if (submitted) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-md mx-auto bg-white border-neutral-200">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
            Submission Confirmed
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Thank you. Your responses for &quot;{room.title}&quot; have been received and verified by the Sangam Command Center.
          </p>
        </div>

        <div className="pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSubmitted(false);
              setFormData({});
            }}
            className="text-xs"
          >
            Submit Another Response
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
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

                {/* Smart recognition badge if email matched */}
                {matchedStudent && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Recognized Sangam Participant</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Welcome, <strong>{matchedStudent.fullName}</strong> ({matchedStudent.branch || 'CSE'} {matchedStudent.teamName ? `· ${matchedStudent.teamName}` : ''}). Your attendance will be confirmed automatically.
                    </p>
                  </div>
                )}

                {/* Smart new participant form if email is new in attendance room */}
                {isNewStudentEmail && (
                  <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                      <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>New Participant Registration</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      We didn&apos;t find this email in our pre-registered list. Please enter your details below so we can record your attendance.
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
            const inputType = field.type === 'phone' ? 'tel' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text';
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
