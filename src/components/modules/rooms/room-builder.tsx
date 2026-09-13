'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoomField, RoomFieldType, Room } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { db } from '@/lib/db';
import { generateRoomCode } from '@/lib/utils';
import { saveRoomToFirestore } from '@/lib/firebase-db';
import { getCachedData, setCachedData } from '@/lib/data-cache';
import {
  Plus,
  Trash2,
  Share2,
  CheckCircle2,
  Copy,
  ExternalLink,
  UserCheck,
  FolderUp,
  Camera,
  Bus as BusIcon,
  Phone,
  MapPin,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';

const FIELD_TYPE_OPTIONS: { type: RoomFieldType; label: string }[] = [
  { type: 'phone', label: 'Phone Number (Auto-Attendance Match)' },
  { type: 'text', label: 'Short Text' },
  { type: 'long_text', label: 'Long Paragraph' },
  { type: 'number', label: 'Number' },
  { type: 'email', label: 'Email Address' },
  { type: 'file', label: 'File / Document Upload (PDF, Zip, Docs)' },
  { type: 'yes_no', label: 'Yes / No' },
  { type: 'single_select', label: 'Single Select (Dropdown)' },
  { type: 'multi_select', label: 'Multi Select (Checkboxes)' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'gps', label: 'GPS Location Coordinates' },
  { type: 'photo', label: 'Photo Upload' },
  { type: 'checkbox', label: 'Checkbox Confirmation' },
];

export function RoomBuilder() {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState('Sangam Attendance Check-In');
  const [purpose, setPurpose] = useState('Enter phone number to automatically verify attendance');
  const [category, setCategory] = useState<Room['category']>('attendance');
  const [associatedBus, setAssociatedBus] = useState('');
  const [oneSubmissionPerUser, setOneSubmissionPerUser] = useState(true);

  // Default fields configured for phone-based attendance
  const [fields, setFields] = useState<RoomField[]>([
    {
      id: 'f_phone',
      type: 'phone',
      label: 'Student Phone Number',
      required: true,
      placeholder: '+91 91000 10010',
    },
    {
      id: 'f_name',
      type: 'text',
      label: 'Student Full Name',
      required: true,
      placeholder: 'e.g. Aruna Sharma',
    },
    {
      id: 'f_present',
      type: 'yes_no',
      label: 'Are you physically present at the designated location?',
      required: true,
      defaultValue: 'Yes',
    },
  ]);

  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);

  const addCustomField = (type: RoomFieldType = 'text', label?: string, options?: string[]) => {
    const id = `f_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
    setFields((prev) => [
      ...prev,
      {
        id,
        type,
        label: label || `Field ${prev.length + 1}`,
        required: true,
        options: options || undefined,
      },
    ]);
  };

  const removeField = (id: string) => {
    if (fields.length <= 1) {
      showToast('Minimum 1 field required', 'A room needs at least one data field.', 'error');
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<RoomField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  // 4 Distinct Presets requested by user
  const applyPreset = (preset: 'attendance' | 'bus' | 'photo' | 'custom') => {
    if (preset === 'attendance') {
      setTitle('Sangam Attendance Check-In');
      setPurpose('Official session attendance. Enter phone number to automatically verify and record your attendance.');
      setCategory('attendance');
      setFields([
        { id: 'f_phone', type: 'phone', label: 'Student Phone Number', required: true, placeholder: '+91 91000 10010' },
        { id: 'f_name', type: 'text', label: 'Student Full Name', required: true, placeholder: 'e.g. Aruna Sharma' },
        { id: 'f_present', type: 'yes_no', label: 'Are you physically present at the session venue?', required: true, defaultValue: 'Yes' },
        { id: 'f_gps', type: 'gps', label: 'Live GPS Location (Verification)', required: false },
      ]);
      showToast('Attendance Preset Applied', 'Configured for phone-based automatic attendance matching.', 'info');
    } else if (preset === 'bus') {
      setTitle('Sangam Bus & Transit Boarding');
      setPurpose('Bus departure tracking. Enter your phone number and confirm your transit boarding.');
      setCategory('attendance');
      setFields([
        { id: 'f_phone', type: 'phone', label: 'Student Phone Number', required: true, placeholder: '+91 91000 10010' },
        { id: 'f_name', type: 'text', label: 'Student Full Name', required: true, placeholder: 'e.g. Rahul Verma' },
        {
          id: 'f_bus_route',
          type: 'single_select',
          label: 'Select Your Bus Route',
          required: true,
          options: ['Bus A — North Campus Express', 'Bus B — South Metro Transit', 'Bus C — Hostel Shuttle', 'Other Transit'],
        },
        { id: 'f_boarding_stop', type: 'text', label: 'Boarding Point / Stop', required: true, placeholder: 'e.g. Main Gate Stop' },
        { id: 'f_boarded', type: 'yes_no', label: 'Have you boarded the bus?', required: true, defaultValue: 'Yes' },
      ]);
      showToast('Bus Boarding Preset Applied', 'Configured for transit passenger verification.', 'info');
    } else if (preset === 'photo') {
      setTitle('Photo Proof & Activity Verification');
      setPurpose('Upload photo proof of project milestone, workshop attendance, or ID verification.');
      setCategory('custom');
      setFields([
        { id: 'f_name', type: 'text', label: 'Student / Participant Name', required: true, placeholder: 'e.g. Priyanshu Das' },
        { id: 'f_phone', type: 'phone', label: 'Phone Number', required: true, placeholder: '+91 91000 10010' },
        { id: 'f_activity', type: 'text', label: 'Activity or Checkpoint Name', required: true, placeholder: 'e.g. Robotics Lab Day 1' },
        { id: 'f_photo', type: 'photo', label: 'Upload Live Photo / Proof', required: true },
        { id: 'f_notes', type: 'long_text', label: 'Notes / Remarks', required: false, placeholder: 'Any additional notes...' },
      ]);
      showToast('Photo Proof Preset Applied', 'Configured for camera image verification.', 'info');
    } else {
      setTitle('Custom Data Collection Survey');
      setPurpose('Gather custom responses, feedback, or submissions from participants.');
      setCategory('custom');
      setFields([
        { id: 'f_name', type: 'text', label: 'Participant Name', required: true, placeholder: 'e.g. Ananya Sen' },
        { id: 'f_email', type: 'email', label: 'Email Address', required: true, placeholder: 'ananya@gmail.com' },
        { id: 'f_feedback', type: 'long_text', label: 'Response / Feedback', required: true, placeholder: 'Type your feedback here...' },
      ]);
      showToast('Custom Survey Preset Applied', 'Configured for open feedback collection.', 'info');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Room Name Required', 'Please enter a name for this session.', 'error');
      return;
    }

    const roomCode = generateRoomCode();
    const newRoom: Room = {
      id: roomCode,
      eventId: 'sangam-2027',
      title: title.trim(),
      purpose: purpose.trim() || 'Sangam data collection session',
      category,
      fields,
      allowedRoles: ['all'],
      oneSubmissionPerUser,
      submissionCount: 0,
      isActive: true,
      associatedBusId: associatedBus || undefined,
      notifyOnSubmission: true,
      createdAt: new Date().toISOString(),
      createdBy: 'admin-01',
    };

    db.saveRoom(newRoom);
    const cached = getCachedData();
    setCachedData({ ...cached, rooms: [newRoom, ...(cached?.rooms || []).filter((r: Room) => r.id !== newRoom.id)] });

    try {
      await saveRoomToFirestore(newRoom);
    } catch (err) {
      console.warn('Firestore room sync error:', err);
    }

    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createRoom', payload: newRoom }),
      });
    } catch (err) {
      console.warn('API createRoom error:', err);
    }

    setCreatedRoom(newRoom);
    showToast('Room Created!', `Shareable code: #${roomCode}`, 'success');
  };

  const getShareUrl = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sangamconnect.org';
    return `${origin}/rooms/${code}`;
  };

  const copyShareLink = (code: string) => {
    navigator.clipboard.writeText(getShareUrl(code));
    showToast('Link Copied', 'Shareable room URL copied to clipboard.', 'success');
  };

  const shareViaWhatsApp = (room: Room) => {
    const url = getShareUrl(room.id);
    const text = `SangamConnect Alert: Please fill out "${room.title}": ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (createdRoom) {
    const shareUrl = getShareUrl(createdRoom.id);
    return (
      <Card className="max-w-xl mx-auto p-8 text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Room Created Successfully
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            This session is now live. Participants can open and submit responses instantly. Multiple submissions are automatically locked.
          </p>
        </div>

        {/* Shareable Link Box */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left space-y-2">
          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Public Room URL (Code: #{createdRoom.id})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs font-mono bg-white p-2 rounded-lg border border-neutral-300 text-neutral-800 select-all"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyShareLink(createdRoom.id)}
              className="shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => shareViaWhatsApp(createdRoom)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            <span>Share to WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/rooms/${createdRoom.id}`)}
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            <span>Open Room</span>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/rooms/${createdRoom.id}`)}
          className="text-xs text-neutral-700 underline font-semibold"
        >
          View Live Responses in Admin Panel &rarr;
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-6 max-w-3xl mx-auto">
      {/* 4 Quick Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
          Select Room Type Preset
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Preset 1: Attendance Check-In */}
          <button
            type="button"
            onClick={() => applyPreset('attendance')}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
              category === 'attendance' && title.includes('Attendance')
                ? 'border-neutral-950 bg-neutral-900 text-white shadow-xs'
                : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg ${category === 'attendance' && title.includes('Attendance') ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                <UserCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs">1. Smart Attendance Check-In</h4>
            </div>
            <p className={`text-[11px] leading-relaxed ${category === 'attendance' && title.includes('Attendance') ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Links student by phone number and marks attendance as Present automatically. Deduplicates responses.
            </p>
          </button>

          {/* Preset 2: Bus Boarding */}
          <button
            type="button"
            onClick={() => applyPreset('bus')}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
              title.includes('Bus')
                ? 'border-neutral-950 bg-neutral-900 text-white shadow-xs'
                : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg ${title.includes('Bus') ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>
                <BusIcon className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs">2. Bus &amp; Transit Boarding</h4>
            </div>
            <p className={`text-[11px] leading-relaxed ${title.includes('Bus') ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Collects bus route, boarding stop, phone, and confirms student is on board the vehicle.
            </p>
          </button>

          {/* Preset 3: Photo Proof */}
          <button
            type="button"
            onClick={() => applyPreset('photo')}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
              title.includes('Photo')
                ? 'border-neutral-950 bg-neutral-900 text-white shadow-xs'
                : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg ${title.includes('Photo') ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>
                <Camera className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs">3. Photo Proof &amp; Media</h4>
            </div>
            <p className={`text-[11px] leading-relaxed ${title.includes('Photo') ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Collects live camera images, workshop evidence, ID proof, or lab verification photos.
            </p>
          </button>

          {/* Preset 4: Custom Form */}
          <button
            type="button"
            onClick={() => applyPreset('custom')}
            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
              category === 'custom' && !title.includes('Photo')
                ? 'border-neutral-950 bg-neutral-900 text-white shadow-xs'
                : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg ${category === 'custom' && !title.includes('Photo') ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                <FolderUp className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs">4. Custom Survey &amp; Form</h4>
            </div>
            <p className={`text-[11px] leading-relaxed ${category === 'custom' && !title.includes('Photo') ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Open data collection with customizable fields for questionnaires, feedback, or reports.
            </p>
          </button>
        </div>
      </div>

      {/* Basic Settings Card */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
          1. Room Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-neutral-800">
              Room Title *
            </label>
            <Input
              placeholder="e.g. Morning Keynote Attendance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-neutral-800">
              Purpose / Description
            </label>
            <Input
              placeholder="Prompt explaining why this data is collected"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-800">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="attendance">Attendance &amp; Check-in</option>
              <option value="feedback">Feedback &amp; Review</option>
              <option value="registration">Workshop Registration</option>
              <option value="emergency">Emergency Information</option>
              <option value="custom">General Custom Form</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-800">
              Link to Bus (Optional)
            </label>
            <select
              value={associatedBus}
              onChange={(e) => setAssociatedBus(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="">None (Universal / Sangam Wide)</option>
              <option value="bus-a">Bus A — North Campus Express</option>
              <option value="bus-b">Bus B — South Metro Transit</option>
              <option value="bus-c">Bus C — Hostel Shuttle</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="oneSub"
            checked={oneSubmissionPerUser}
            onChange={(e) => setOneSubmissionPerUser(e.target.checked)}
            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <label htmlFor="oneSub" className="text-xs text-neutral-700 select-none cursor-pointer">
            Limit to one submission per student (Do not ask again once filled)
          </label>
        </div>
      </Card>

      {/* Dynamic Fields Card */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
            2. Form Fields ({fields.length})
          </h3>
          <p className="text-xs text-neutral-500">
            Customize what questions and requirements to ask from participants.
          </p>
        </div>

        {/* Quick Add (+) Buttons */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
            Quick Add Field Shortcuts:
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addCustomField('phone', 'Student Phone Number')}
              className="text-xs gap-1 py-1 h-8"
            >
              <Phone className="w-3 h-3 text-neutral-700" />
              <span>+ Phone (Auto-Attendance)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                addCustomField('single_select', 'Bus Selection', [
                  'Bus A — North Express',
                  'Bus B — South Metro',
                  'Bus C — Campus Shuttle',
                ])
              }
              className="text-xs gap-1 py-1 h-8"
            >
              <BusIcon className="w-3 h-3 text-neutral-700" />
              <span>+ Bus Route</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addCustomField('photo', 'Photo Proof')}
              className="text-xs gap-1 py-1 h-8"
            >
              <Camera className="w-3 h-3 text-neutral-700" />
              <span>+ Photo Upload</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addCustomField('file', 'Upload Document (PDF/Docs)')}
              className="text-xs gap-1 py-1 h-8"
            >
              <FolderUp className="w-3 h-3 text-neutral-700" />
              <span>+ Document / File</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addCustomField('gps', 'GPS Location Coordinates')}
              className="text-xs gap-1 py-1 h-8"
            >
              <MapPin className="w-3 h-3 text-neutral-700" />
              <span>+ GPS Location</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addCustomField('yes_no', 'Are you present?')}
              className="text-xs gap-1 py-1 h-8"
            >
              <CheckCircle2 className="w-3 h-3 text-neutral-700" />
              <span>+ Yes / No Question</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addCustomField('text', 'Custom Question')}
              className="text-xs gap-1 py-1 h-8 bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <Plus className="w-3 h-3" />
              <span>+ Custom Field</span>
            </Button>
          </div>
        </div>

        {/* Fields List */}
        <div className="space-y-3 pt-2">
          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-2">
                  {idx + 1}
                </span>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      label="Field Label"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="e.g. Student Phone Number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-800 tracking-tight mb-1.5">
                      Type
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, { type: e.target.value as RoomFieldType })
                      }
                      className="w-full h-10 px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    >
                      {FIELD_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.type} value={opt.type}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeField(field.id)}
                  className="p-2 text-neutral-400 hover:text-red-600 transition-colors mt-6 cursor-pointer"
                  title="Remove Field"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Options editor for single_select and multi_select */}
              {(field.type === 'single_select' || field.type === 'multi_select') && (
                <div className="pl-7 space-y-1">
                  <label className="text-[11px] font-medium text-neutral-600">
                    Dropdown Options (comma-separated)
                  </label>
                  <Input
                    placeholder="e.g. Option A, Option B, Option C"
                    value={field.options?.join(', ') || ''}
                    onChange={(e) =>
                      updateField(field.id, {
                        options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              )}

              {/* Toggles */}
              <div className="pl-7 flex items-center gap-4 text-xs text-neutral-600">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span>Mandatory / Required</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Submission CTA */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/rooms')}
        >
          Cancel
        </Button>
        <Button type="submit" size="lg" className="px-8 bg-neutral-950 text-white hover:bg-neutral-800">
          Create Room &amp; Generate Link
        </Button>
      </div>
    </form>
  );
}
