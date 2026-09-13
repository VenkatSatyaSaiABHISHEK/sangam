'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Bus, User, AttendanceRecord } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import {
  Bus as BusIcon,
  Phone,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';

export default function AdminBusesPage() {
  const { showToast } = useToast();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Create Bus modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [busName, setBusName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [capacity, setCapacity] = useState('40');

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setBuses(data.buses || []);
        setStudents(data.students || []);
        setAttendance(data.attendance || []);
        return;
      }
    } catch {}
    setBuses(db.getBuses());
    setStudents(db.getStudents());
    setAttendance(db.getAttendance());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busName.trim() || !vehicleNumber.trim()) {
      showToast('Validation Error', 'Bus name and vehicle number are required.', 'error');
      return;
    }

    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createBus',
          payload: {
            name: busName.trim(),
            vehicleNumber: vehicleNumber.trim(),
            driverName: driverName.trim() || 'Assigned Driver',
            driverPhone: driverPhone.trim() || '+1 000 000 0000',
            capacity: parseInt(capacity, 10) || 40,
          },
        }),
      });

      db.createBus({
        name: busName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        driverName: driverName.trim() || 'Assigned Driver',
        driverPhone: driverPhone.trim() || '+1 000 000 0000',
        capacity: parseInt(capacity, 10) || 40,
      });

      showToast('Bus Registered', `${busName} added to fleet.`, 'success');
      setIsAddOpen(false);
      setBusName('');
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      setCapacity('40');
      loadData();
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not register bus.', 'error');
    }
  };

  const handleToggleStatus = (bus: Bus) => {
    const nextStatus: Bus['status'] =
      bus.status === 'boarding'
        ? 'in_transit'
        : bus.status === 'in_transit'
        ? 'arrived'
        : 'boarding';

    db.updateBusStatus(bus.id, nextStatus);
    loadData();
    showToast('Transit Updated', `${bus.name} marked as ${nextStatus.toUpperCase()}`, 'success');
  };

  const handleDeleteBus = (bus: Bus) => {
    if (confirm(`Remove ${bus.name}? Assigned students will be detached.`)) {
      db.deleteBus(bus.id);
      showToast('Bus Removed', `${bus.name} removed from fleet.`, 'info');
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Transport Fleet Management ({buses.length})
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor vehicle capacities, driver contacts, assigned passenger manifests, and route status.
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="gap-1.5 text-xs shadow-xs">
          <Plus className="w-4 h-4" />
          <span>Add Bus</span>
        </Button>
      </div>

      {/* Buses Grid or Empty State */}
      {buses.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <BusIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">No fleet buses registered</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              Register transit buses to assign students and track boarding/transit checkpoints.
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="text-xs gap-1.5 mx-auto">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bus</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {buses.map((bus) => {
            const assignedStudents = students.filter((s) => s.busId === bus.id);
            const presentCount = attendance.filter(
              (a) => a.busId === bus.id && a.status === 'present'
            ).length;

            const statusColors: Record<Bus['status'], 'warning' | 'info' | 'success' | 'neutral'> = {
              boarding: 'warning',
              in_transit: 'info',
              arrived: 'success',
              completed: 'neutral',
            };

            return (
              <Card key={bus.id} className="p-6 space-y-5">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                      <BusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                        {bus.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-semibold text-neutral-700">
                          {bus.vehicleNumber}
                        </span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-xs text-neutral-500">
                          Cap: {bus.capacity} seats
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[bus.status]} size="sm" className="capitalize font-mono">
                      {bus.status.replace('_', ' ')}
                    </Badge>
                    <button
                      onClick={() => handleDeleteBus(bus)}
                      title="Delete Bus"
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Driver Contact Box */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase">
                      Fleet Operator / Driver
                    </span>
                    <p className="font-semibold text-neutral-900">{bus.driverName}</p>
                  </div>
                  <a
                    href={`tel:${bus.driverPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 font-mono text-neutral-800 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{bus.driverPhone}</span>
                  </a>
                </div>

                {/* Passenger Load Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Assigned Passengers</span>
                    <span className="font-bold text-neutral-900 font-mono">
                      {assignedStudents.length} / {bus.capacity} seats ({presentCount} present)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (assignedStudents.length / bus.capacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Assigned Manifest Summary */}
                <div className="pt-2 border-t border-neutral-100">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Passenger Manifest ({assignedStudents.length})
                  </span>
                  {assignedStudents.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic">
                      No passengers allocated. Assign students or teams in the Students tab.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedStudents.slice(0, 8).map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-medium text-neutral-700"
                        >
                          {s.fullName}
                        </span>
                      ))}
                      {assignedStudents.length > 8 && (
                        <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded text-xs font-medium">
                          +{assignedStudents.length - 8} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(bus)}
                    className="text-xs gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Advance Status ({bus.status})</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Bus Modal */}
      {isAddOpen && (
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Add Transit Bus"
          description="Register a fleet vehicle, driver contact, and passenger capacity."
        >
          <form onSubmit={handleCreateBus} className="space-y-4 pt-2">
            <Input
              label="Bus Name / Route"
              placeholder="e.g. Bus A — Campus Shuttle"
              value={busName}
              onChange={(e) => setBusName(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Vehicle License Number"
              placeholder="e.g. KA-01-EQ-9090"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Driver Name"
                placeholder="e.g. Rajesh Kumar"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />

              <Input
                label="Driver Phone"
                placeholder="+91 98000 20002"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
              />
            </div>

            <Input
              label="Passenger Capacity Seats"
              type="number"
              placeholder="40"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min="1"
              max="150"
            />

            <div className="pt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Register Bus</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
