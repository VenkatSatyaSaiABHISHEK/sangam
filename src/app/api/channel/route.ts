import { NextRequest, NextResponse } from 'next/server';
import {
  saveChannelMessage,
  fetchChannelMessages,
  saveChannelSettings,
  fetchChannelSettings,
} from '@/lib/firebase-db';
import { ChannelMessage, ChannelSettings } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory fallback message cache for resilience
let memoryMessages: ChannelMessage[] = [
  {
    id: 'msg-welcome',
    senderId: 'admin-root',
    senderName: 'Sangam Administration',
    senderRole: 'admin',
    content: 'Welcome to the Sangam Open Channel! Mentors, faculty, and students can communicate here in real-time. Feel free to ask questions and share project updates.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];
let memorySettings: ChannelSettings = {
  studentCanPost: true,
  topic: 'Summit 2027 General Discussion & Technical Q&A',
  updatedAt: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  try {
    const [fsMessages, fsSettings] = await Promise.all([
      fetchChannelMessages(),
      fetchChannelSettings(),
    ]);

    let messages = fsMessages && fsMessages.length > 0 ? fsMessages : memoryMessages;
    let settings = fsSettings || memorySettings;

    return NextResponse.json({
      success: true,
      messages,
      settings,
      total: messages.length,
    });
  } catch (err: any) {
    console.error('Failed to fetch channel data:', err);
    return NextResponse.json({
      success: true,
      messages: memoryMessages,
      settings: memorySettings,
      total: memoryMessages.length,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, message, settings } = body;

    if (action === 'updateSettings' && settings) {
      memorySettings = { ...memorySettings, ...settings, updatedAt: new Date().toISOString() };
      await saveChannelSettings(memorySettings);
      return NextResponse.json({ success: true, settings: memorySettings });
    }

    if (action === 'updatePermissions') {
      const { studentId, email, canChat, bulkPermissions, studentCanPost } = body;
      const current = await fetchChannelSettings();
      const studentPermissions = { ...(current.studentPermissions || memorySettings.studentPermissions || {}) };

      if (bulkPermissions) {
        Object.assign(studentPermissions, bulkPermissions);
      } else if (studentId) {
        studentPermissions[studentId] = Boolean(canChat);
        if (email) studentPermissions[email.toLowerCase()] = Boolean(canChat);
      }

      const updatedSettings: ChannelSettings = {
        ...current,
        studentPermissions,
        studentCanPost: studentCanPost !== undefined ? studentCanPost : current.studentCanPost,
        updatedAt: new Date().toISOString(),
      };
      memorySettings = updatedSettings;
      await saveChannelSettings(updatedSettings);
      return NextResponse.json({ success: true, settings: updatedSettings });
    }

    // Default action: Send Message
    if (!message || (!message.content?.trim() && !message.imageUrl)) {
      return NextResponse.json({ error: 'Message content or image is required.' }, { status: 400 });
    }

    const currentSettings = await fetchChannelSettings();
    const effectiveSettings = { ...memorySettings, ...currentSettings };

    // Mentors, faculty, judges, and admins ALWAYS have permission to chat freely
    const isMentorOrStaff =
      message.senderRole === 'mentor' ||
      message.senderRole === 'teacher' ||
      message.senderRole === 'faculty' ||
      message.senderRole === 'judge' ||
      message.senderRole === 'admin';

    if (!isMentorOrStaff) {
      // For student: Check individual student permission granted by admin
      const perms = effectiveSettings.studentPermissions || {};
      const studentId = message.senderId;
      const studentEmail = (message.senderEmail || '').toLowerCase();

      // Check if student has permission:
      // Explicit true in perms -> allowed
      // Explicit false in perms -> denied
      // If not specified in perms: check if global studentCanPost is enabled (defaults to false for students without admin grant)
      const isExplicitlyAllowed = perms[studentId] === true || perms[studentEmail] === true;
      const isExplicitlyDenied = perms[studentId] === false || perms[studentEmail] === false;

      if (isExplicitlyDenied || (!isExplicitlyAllowed && !effectiveSettings.studentCanPost)) {
        return NextResponse.json(
          { error: 'You do not have chat permission. Contact an administrator to enable messaging.' },
          { status: 403 }
        );
      }
    }

    const newMsg: ChannelMessage = {
      id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: message.senderId,
      senderName: message.senderName || 'Participant',
      senderRole: message.senderRole || 'student',
      senderEmail: message.senderEmail,
      senderAvatar: message.senderAvatar,
      teamName: message.teamName,
      content: (message.content || '').trim(),
      imageUrl: message.imageUrl || undefined,
      imageCaption: message.imageCaption || undefined,
      isQuestion: Boolean(message.isQuestion),
      replyTo: message.replyTo || undefined,
      createdAt: message.createdAt || new Date().toISOString(),
    };

    memoryMessages.push(newMsg);
    if (memoryMessages.length > 300) memoryMessages = memoryMessages.slice(-300);

    await saveChannelMessage(newMsg);

    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: any) {
    console.error('Error posting channel message:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send message.' },
      { status: 500 }
    );
  }
}
