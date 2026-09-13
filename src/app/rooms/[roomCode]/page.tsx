import React from 'react';
import { db } from '@/lib/db';
import { fetchRoomByIdFromFirestore } from '@/lib/firebase-db';
import { RoomSubmissionView } from '@/components/modules/rooms/room-submission-view';

export default async function PublicRoomSubmissionPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  let room = db.getRoomById(roomCode) || null;
  if (!room) {
    room = await fetchRoomByIdFromFirestore(roomCode);
  }

  return <RoomSubmissionView initialRoom={room} roomCode={roomCode} />;
}
