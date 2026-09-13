'use client';

import React from 'react';
import { OpenChannelView } from '@/components/channel/open-channel-view';

export default function MentorChannelPage() {
  return <OpenChannelView backPath="/mentor/dashboard" userRoleOverride="mentor" />;
}
