'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { User, Team, Bus } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Phone,
  Layers,
  Bus as BusIcon,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Camera,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';

import {
  saveUserToFirestore,
  deleteUserFromFirestore,
  fetchUsersFromFirestore,
} from '@/lib/firebase-db';
import { StudentExcelModal } from '@/components/admin';
import { exportStudentsToExcel } from '@/lib/excel-utils';

import { getCachedData, setCachedData } from '@/lib/data-cache';

export default function AdminStudentsPage() {
  const { showToast } = useToast();
  const cached = typeof window !== 'undefined' ? getCachedData() : null;
  const [loading, setLoading] = useState(!cached?.students?.length);
  const [students, setStudents] = useState<User[]>(cached?.students || []);
  const [teams, setTeams] = useState<Team[]>(cached?.teams || []);
  const [buses, setBuses] = useState<Bus[]>(cached?.buses || []);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Excel Modal & Export State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Add Student Modal State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBranch, setNewBranch] = useState('CSE');
  const [newYear, setNewYear] = useState('1st Year');
  const [newTeamId, setNewTeamId] = useState('');
  const [newBusId, setNewBusId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBranch, setEditBranch] = useState('CSE');
  const [editYear, setEditYear] = useState('1st Year');
  const [editTeamId, setEditTeamId] = useState('');
  const [editBusId, setEditBusId] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Camera & Face Capture State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      let apiStudents: User[] = [];
      let apiTeams: Team[] = [];
      let apiBuses: Bus[] = [];

      if (res.ok) {
        const data = await res.json();
        apiStudents = data.students || [];
        apiTeams = data.teams || [];
        apiBuses = data.buses || [];
        setCachedData({ ...cached, students: apiStudents, teams: apiTeams, buses: apiBuses });
      } else {
        apiStudents = db.getStudents();
        apiTeams = db.getTeams();
        apiBuses = db.getBuses();
      }

      try {
        const firestoreStudents = await fetchUsersFromFirestore('student');
        if (firestoreStudents && firestoreStudents.length > 0) {
          const map = new Map<string, User>();
          apiStudents.forEach((s) => map.set(s.id, s));
          firestoreStudents.forEach((s) => map.set(s.id, { ...map.get(s.id), ...s }));
          apiStudents = Array.from(map.values());
        }
      } catch {
        // Fallback gracefully
      }

      setStudents(apiStudents);
      setTeams(apiTeams);
      setBuses(apiBuses);
    } catch {
      setStudents(db.getStudents());
      setTeams(db.getTeams());
      setBuses(db.getBuses());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Validation Error', 'Full name is required.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createStudent',
          payload: {
            fullName: newName.trim(),
            email: newEmail.trim() ? newEmail.trim().toLowerCase() : undefined,
            phone: newPhone.trim() || '+91 000 000 0000',
            branch: newBranch.trim(),
            year: newYear.trim(),
            teamId: newTeamId || undefined,
            busId: newBusId || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create student');

      if (data.student) {
        try {
          const { saveUserToFirestore } = await import('@/lib/firebase-db');
          saveUserToFirestore(data.student).catch(() => {});
        } catch {}
      }

      showToast('Student Registered', `${newName} saved to summit database & Firebase.`, 'success');
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewBranch('CSE');
      setNewYear('1st Year');
      setNewTeamId('');
      setNewBusId('');
      loadData();
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not create student record.', 'error');
    }
  };

  const attachVideoStream = (videoEl: HTMLVideoElement | null) => {
    videoRef.current = videoEl;
    if (videoEl && streamRef.current) {
      if (videoEl.srcObject !== streamRef.current) {
        videoEl.srcObject = streamRef.current;
      }
      videoEl.play().catch(() => {});
    }
  };

  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    try {
      stopCamera();
      setCameraError(null);

      // Check if secure context (HTTPS or localhost)
      const isSecure = typeof window !== 'undefined' && (
        window.isSecureContext ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      );

      if (!isSecure && !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Live browser webcam requires HTTPS or localhost. Tap "Device Camera" below to take a photo using your phone\'s camera.');
        nativeCameraInputRef.current?.click();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Live camera not supported by this browser. Tap "Device Camera" below to take a photo.');
        nativeCameraInputRef.current?.click();
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Constrained getUserMedia failed, retrying simple video:', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false,
          });
        } catch (err2) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      setCameraFacing(facing);
      setIsCameraActive(true);

      // If video ref is already attached
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was blocked by your browser. Please tap the lock/tune icon in your browser address bar to allow camera, or tap "Device Camera" below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload an image file or tap "Device Camera".');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is currently in use by another app. Please close other camera apps and retry.');
      } else {
        setCameraError(err.message || 'Could not access camera. Please allow permission or tap "Device Camera".');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      setIsUploadingPhoto(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsUploadingPhoto(false);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsUploadingPhoto(false);
          return;
        }
        stopCamera();
        await uploadPhotoBlob(blob, `student_face_${editingStudent?.id || Date.now()}.jpg`);
      }, 'image/jpeg', 0.92);
    } catch (err: any) {
      showToast('Capture Failed', err.message || 'Could not capture photo', 'error');
      setIsUploadingPhoto(false);
    }
  };

  const uploadPhotoBlob = async (blob: Blob | File, filename: string) => {
    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', blob, filename);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload to Cloudflare R2 failed');
      }

      setEditAvatarUrl(data.url);
      showToast('Photo Uploaded', 'Face photo stored on Cloudflare R2.', 'success');
    } catch (err: any) {
      showToast('Upload Error', err.message || 'Could not upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhotoBlob(file, file.name);
    }
  };

  const handleOpenEdit = (student: User, autoStartCamera = false) => {
    setEditingStudent(student);
    setEditName(student.fullName);
    setEditEmail(student.isProvisionalEmail ? '' : student.email);
    setEditPhone(student.phone);
    setEditBranch(student.branch || 'CSE');
    setEditYear(student.year || '1st Year');
    setEditTeamId(student.teamId || '');
    setEditBusId(student.busId || '');
    setEditAvatarUrl(student.avatarUrl || '');
    setCameraError(null);
    if (autoStartCamera) {
      const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const isSecure = typeof window !== 'undefined' && (
        window.isSecureContext ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      );

      if (isMobile && !isSecure) {
        setTimeout(() => {
          nativeCameraInputRef.current?.click();
        }, 300);
      } else {
        setTimeout(() => {
          startCamera('user');
        }, 350);
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStudent',
          payload: {
            id: editingStudent.id,
            updates: {
              fullName: editName.trim(),
              email: editEmail.trim() ? editEmail.trim().toLowerCase() : undefined,
              phone: editPhone.trim(),
              branch: editBranch.trim(),
              year: editYear.trim(),
              teamId: editTeamId || undefined,
              busId: editBusId || undefined,
              avatarUrl: editAvatarUrl.trim() || undefined,
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      if (data.student) {
        try {
          const { saveUserToFirestore } = await import('@/lib/firebase-db');
          saveUserToFirestore(data.student).catch(() => {});
        } catch {}
      }

      showToast('Student Updated', `${editName} updated successfully.`, 'success');
      stopCamera();
      setEditingStudent(null);
      loadData();
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not update student.', 'error');
    }
  };

  const handleDelete = async (student: User) => {
    if (confirm(`Are you sure you want to delete ${student.fullName}?`)) {
      try {
        const { deleteUserFromFirestore } = await import('@/lib/firebase-db');
        deleteUserFromFirestore(student.id).catch(() => {});
      } catch {}

      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteStudent',
            payload: { id: student.id },
          }),
        });
        if (!res.ok) throw new Error('Deletion failed');
        showToast('Student Removed', `${student.fullName} has been removed.`, 'info');
        loadData();
      } catch (err: any) {
        showToast('Delete Failed', err.message || 'Could not delete student.', 'error');
      }
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    const matchesTeam = teamFilter === 'ALL' || s.teamId === teamFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesTeam && matchesStatus;
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportStudentsToExcel(filteredStudents, teams, buses);
      showToast('Roster Exported', `Exported ${filteredStudents.length} students to Excel.`, 'success');
    } catch (err: any) {
      showToast('Export Failed', err.message || 'Could not export students.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950 flex items-center gap-2">
            <span>Student Management</span>
            {!loading && (
              <span className="text-neutral-500 font-normal">({students.length})</span>
            )}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Register students, manage cohort teams, assign transit buses, and inspect status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/live" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs bg-white hover:bg-neutral-50 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
              <span>Public Live Link</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || students.length === 0}
            className="gap-1.5 text-xs bg-white hover:bg-neutral-50 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Export Roster</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExcelModalOpen(true)}
            className="gap-1.5 text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel / CSV Import</span>
          </Button>

          <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5 text-xs shadow-xs cursor-pointer">
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search student by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Teams ({teams.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table or Empty State */}
      {loading ? (
        <Card className="overflow-hidden border-neutral-200 shadow-xs">
          <div className="p-5 space-y-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-neutral-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-neutral-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="hidden sm:block h-4 w-28 bg-neutral-100 rounded animate-pulse" />
                <div className="hidden md:block h-4 w-20 bg-neutral-100 rounded animate-pulse" />
                <div className="h-4 w-14 bg-neutral-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">No students found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              {search || teamFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No student matches your current filter criteria.'
                : 'Your summit cohort has zero registered students. Click below to add the first participant.'}
            </p>
          </div>
          {!search && teamFilter === 'ALL' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-1.5 text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Register Single Student</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsExcelModalOpen(true)}
                size="sm"
                className="gap-1.5 text-xs cursor-pointer bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import via Excel / CSV</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card View (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {filteredStudents.map((student) => {
              const team = teams.find((t) => t.id === student.teamId);
              const bus = buses.find((b) => b.id === student.busId);

              return (
                <Card key={student.id} className="p-4 border-neutral-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {student.avatarUrl ? (
                        <img
                          src={student.avatarUrl}
                          alt={student.fullName}
                          className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-neutral-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {student.fullName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-neutral-900 text-sm">{student.fullName}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {student.branch || 'CSE'} • {student.year || '1st Year'}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={student.status === 'active' ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {student.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      {student.isProvisionalEmail ? (
                        <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                          Pending Email (Temp ID)
                        </span>
                      ) : (
                        <span className="truncate">{student.email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{student.phone}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {team ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-100 text-neutral-800 font-medium text-[11px]">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: team.color || '#2563EB' }}
                        />
                        {team.name}
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-[11px] italic">No Team</span>
                    )}

                    {bus ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
                        <BusIcon className="w-3 h-3 text-blue-500" />
                        {bus.name}
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-[11px] italic">No Bus</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(student, true)}
                      className="gap-1 text-xs h-8 px-2.5 text-neutral-700 hover:text-blue-700 hover:border-blue-300"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>Photo</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(student, false)}
                      className="gap-1 text-xs h-8 px-2.5 text-neutral-700 hover:text-black hover:border-neutral-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(student)}
                      className="gap-1 text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <Card className="hidden md:block overflow-hidden border-neutral-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Assigned Team</th>
                    <th className="py-3 px-4">Bus Route</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {filteredStudents.map((student) => {
                    const team = teams.find((t) => t.id === student.teamId);
                    const bus = buses.find((b) => b.id === student.busId);

                    return (
                      <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt={student.fullName}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {student.fullName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-neutral-900 block">
                                {student.fullName}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {student.branch || 'CSE'} • {student.year || '1st Year'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-neutral-600">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                              {student.isProvisionalEmail ? (
                                <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Pending Email
                                </span>
                              ) : (
                                <span>{student.email}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span>{student.phone}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {team ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: team.color || '#2563EB' }}
                              />
                              <span className="font-semibold text-neutral-800">{team.name}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {bus ? (
                            <div className="flex items-center gap-1.5 text-neutral-700">
                              <BusIcon className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{bus.name}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">None</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            variant={student.status === 'active' ? 'success' : 'neutral'}
                            size="sm"
                          >
                            {student.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(student, true)}
                              className="p-1.5 h-auto text-neutral-500 hover:text-blue-600 cursor-pointer"
                              title="Update Photo / Camera"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(student, false)}
                              className="p-1.5 h-auto text-neutral-500 hover:text-black cursor-pointer"
                              title="Edit Student"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(student)}
                              className="p-1.5 h-auto text-neutral-500 hover:text-red-600 cursor-pointer"
                              title="Delete Student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Student"
        description="Add a participant to the summit cohort with contact details and optional team assignment."
      >
        <form onSubmit={handleCreateStudent} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Full Name *
            </label>
            <Input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Maya Lin"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Email Address <span className="text-neutral-400 font-normal">(Optional — can update later)</span>
            </label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. maya.lin@gmail.com (or leave blank)"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Phone Number
            </label>
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+1 555 019 2831"
              className="text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Branch / Dept
              </label>
              <Input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder="e.g. CSE or ECE"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Academic Year
              </label>
              <select
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Assign Team
              </label>
              <select
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">No Team Assigned</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Transit Bus
              </label>
              <select
                value={newBusId}
                onChange={(e) => setNewBusId(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">No Bus Assigned</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs cursor-pointer">
              Register Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => {
          stopCamera();
          setEditingStudent(null);
        }}
        title="Edit Student Profile"
        description="Update participant face photo, contact details, team assignment, or bus allocation."
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
          {/* Hidden File Input for Device Native Camera (Opens phone selfie camera directly) */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Hidden File Input for Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Student Face Photo Section (Cloudflare R2) */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800">
                Student Face Photo <span className="text-neutral-400 font-normal">(Cloudflare R2)</span>
              </span>
              {editAvatarUrl && (
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Photo Stored
                </span>
              )}
            </div>

            {cameraError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="leading-relaxed">{cameraError}</span>
                  <button
                    type="button"
                    onClick={() => setCameraError(null)}
                    className="text-amber-500 hover:text-amber-700 shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="text-xs h-7 gap-1 bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Open Phone Camera Directly</span>
                  </Button>
                </div>
              </div>
            )}

            {isCameraActive ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={attachVideoStream}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      (e.target as HTMLVideoElement).play().catch(() => {});
                    }}
                    className="w-full h-full object-cover"
                  />
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white text-xs z-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-white" />
                      <span>Saving face photo to Cloudflare R2...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleCameraFacing}
                    disabled={isUploadingPhoto}
                    className="text-xs gap-1.5 h-8 px-2.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Flip ({cameraFacing === 'user' ? 'Front' : 'Back'})</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={stopCamera}
                      disabled={isUploadingPhoto}
                      className="text-xs h-8 px-2.5"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={capturePhoto}
                      disabled={isUploadingPhoto}
                      className="text-xs gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-neutral-200 border-2 border-white shadow-sm shrink-0 flex items-center justify-center">
                  {editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="Student Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-6 h-6 text-neutral-400" />
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="text-xs gap-1.5 h-8 px-2.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 font-semibold cursor-pointer"
                      title="Opens your device camera directly to snap a photo"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>Snap Photo</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startCamera('user')}
                      disabled={isUploadingPhoto}
                      className="text-xs gap-1.5 h-8 px-2.5 bg-white hover:bg-neutral-50 text-neutral-700 cursor-pointer"
                      title="Starts the live webcam stream"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Live Stream</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="text-xs gap-1.5 h-8 px-2.5 bg-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Upload File</span>
                    </Button>

                    {editAvatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditAvatarUrl('')}
                        disabled={isUploadingPhoto}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 cursor-pointer"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Use <strong>Snap Photo</strong> on phone or <strong>Live Stream</strong> on desktop. Images are uploaded to Cloudflare R2.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Full Name *
            </label>
            <Input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700">
                Email Address
              </label>
              {editingStudent?.isProvisionalEmail && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Temporary ID Assigned
                </span>
              )}
            </div>
            {editingStudent?.isProvisionalEmail && (
              <div className="mb-2 p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
                <strong>Pending Email:</strong> This student currently has a provisional placeholder ({editingStudent.email}). Entering a real email will update their summit account and credentials.
              </div>
            )}
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="e.g. student@gmail.com"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Phone Number
            </label>
            <Input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Branch / Dept
              </label>
              <Input
                value={editBranch}
                onChange={(e) => setEditBranch(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Academic Year
              </label>
              <select
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Assign Team
              </label>
              <select
                value={editTeamId}
                onChange={(e) => setEditTeamId(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">No Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Transit Bus
              </label>
              <select
                value={editBusId}
                onChange={(e) => setEditBusId(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">No Bus</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                stopCamera();
                setEditingStudent(null);
              }}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs cursor-pointer">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Excel / CSV Import Modal */}
      <StudentExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        existingStudents={students}
        teams={teams}
        buses={buses}
        onImportSuccess={loadData}
      />
    </div>
  );
}
