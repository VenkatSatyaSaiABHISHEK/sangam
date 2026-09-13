'use client';

import React, { useState, useRef } from 'react';
import { User, Team, Bus } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  downloadStudentTemplate,
  parseStudentSpreadsheet,
  ParsedStudentRow,
} from '@/lib/excel-utils';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileText,
  X,
  RefreshCw,
  Users,
} from 'lucide-react';

interface StudentExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingStudents: User[];
  teams: Team[];
  buses: Bus[];
  onImportSuccess: () => void;
}

export function StudentExcelModal({
  isOpen,
  onClose,
  existingStudents,
  teams,
  buses,
  onImportSuccess,
}: StudentExcelModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      await downloadStudentTemplate(teams, buses, format);
      showToast(
        'Template Downloaded',
        `Sample student roster template (${format.toUpperCase()}) saved. Fill in your data and upload it below.`,
        'success'
      );
    } catch (err: any) {
      showToast('Download Error', err.message || 'Could not generate template.', 'error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);

    try {
      const rows = await parseStudentSpreadsheet(selectedFile, existingStudents, teams, buses);
      setParsedRows(rows);
      showToast(
        'Spreadsheet Parsed',
        `Loaded ${rows.length} rows. Please review and confirm import below.`,
        'info'
      );
    } catch (err: any) {
      console.error('Spreadsheet parse failed:', err);
      setParseError(err.message || 'Failed to read spreadsheet. Ensure it is a valid .xlsx or .csv file.');
      setParsedRows([]);
      showToast('Parse Error', err.message || 'Could not parse spreadsheet.', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleRowSelect = (index: number) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.isValid ? { ...r, selected: select } : r))
    );
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const selectedRows = parsedRows.filter((r) => r.selected);
  const existingCount = parsedRows.filter((r) => r.isValid && r.isExisting).length;
  const newCount = parsedRows.filter((r) => r.isValid && !r.isExisting).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const pendingEmailCount = parsedRows.filter((r) => r.isValid && r.isProvisionalEmail).length;

  const handleConfirmImport = async () => {
    if (selectedRows.length === 0) {
      showToast('No Students Selected', 'Select at least one valid row to import.', 'error');
      return;
    }

    setIsImporting(true);

    try {
      const payloadStudents = selectedRows.map((r) => ({
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        branch: r.branch,
        year: r.year,
        teamNameOrId: r.teamNameOrId,
        busNameOrId: r.busNameOrId,
        existingId: r.existingId,
      }));

      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulkCreateStudents',
          payload: { students: payloadStudents },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk registration failed.');

      showToast(
        'Import Successful',
        `Successfully imported ${data.count} students (${data.createdCount} new, ${data.updatedCount} updated).`,
        'success'
      );

      handleClearFile();
      onImportSuccess();
      onClose();
    } catch (err: any) {
      showToast('Import Failed', err.message || 'An error occurred during bulk import.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Student Excel & CSV Import"
      description="Download the template, populate your student roster with names and teams, and import in bulk."
    >
      <div className="space-y-5 pt-2 max-h-[75vh] overflow-y-auto pr-1">
        {/* Step 1: Download Template Cards */}
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-neutral-900">
                1. Download Roster Template
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              Pre-filled with summit teams & buses
            </span>
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Download our template with pre-configured headers (<code className="font-mono text-neutral-700 bg-neutral-200/60 px-1 py-0.5 rounded">Full Name</code>, <code className="font-mono text-neutral-700 bg-neutral-200/60 px-1 py-0.5 rounded">Email Address</code>, <code className="font-mono text-neutral-700 bg-neutral-200/60 px-1 py-0.5 rounded">Phone</code>, <code className="font-mono text-neutral-700 bg-neutral-200/60 px-1 py-0.5 rounded">Team Name</code>, <code className="font-mono text-neutral-700 bg-neutral-200/60 px-1 py-0.5 rounded">Bus Route</code>).
          </p>
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 leading-normal flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Email is optional:</strong> You can upload students now even if emails are blank. They can log in using their Phone Number, and you can re-upload later to update real emails anytime!
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('xlsx')}
              className="gap-1.5 text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Excel Template (.xlsx)</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('csv')}
              className="gap-1.5 text-xs bg-white hover:bg-neutral-100 cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-neutral-600" />
              <span>Download CSV Template (.csv)</span>
            </Button>
          </div>
        </div>

        {/* Step 2: Upload File Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-neutral-900">
                2. Upload Filled Spreadsheet
              </span>
            </div>
            {file && (
              <button
                onClick={handleClearFile}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Clear File</span>
              </button>
            )}
          </div>

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50/50 rounded-xl p-6 text-center cursor-pointer transition-colors space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-600">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-neutral-800">
                  Click to browse or drop Excel / CSV file here
                </p>
                <p className="text-[11px] text-neutral-400">
                  Supported formats: Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-neutral-100 rounded-lg border border-neutral-200 text-xs">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-neutral-900 block">{file.name}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows loaded
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-7 cursor-pointer"
              >
                Change File
              </Button>
            </div>
          )}

          {isParsing && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 py-2 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-900" />
              <span>Parsing spreadsheet records and matching team cohorts...</span>
            </div>
          )}

          {parseError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}
        </div>

        {/* Step 3: Preview & Confirm Rows */}
        {parsedRows.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900">
                  3. Review & Validate Participants
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                  {selectedRows.length} / {parsedRows.length} Selected
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="text-[11px] text-neutral-500 hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Status Summary Pills */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>{newCount} New Students</span>
              </span>
              {pendingEmailCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{pendingEmailCount} Without Email (Phone Login)</span>
                </span>
              )}
              {existingCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-medium">
                  <RefreshCw className="w-3 h-3" />
                  <span>{existingCount} Will Update</span>
                </span>
              )}
              {invalidCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{invalidCount} Invalid/Skipped</span>
                </span>
              )}
            </div>

            {/* Preview Table */}
            <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px] sticky top-0 bg-neutral-50 z-10">
                  <tr>
                    <th className="py-2 px-3 w-8">#</th>
                    <th className="py-2 px-3">Student</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Team</th>
                    <th className="py-2 px-3">Bus</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={`transition-colors ${
                        !row.isValid
                          ? 'bg-neutral-50/70 text-neutral-400'
                          : row.selected
                          ? 'hover:bg-neutral-50'
                          : 'opacity-50 hover:opacity-80'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!row.isValid}
                          onChange={() => toggleRowSelect(row.index)}
                          className="rounded text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                        />
                      </td>

                      <td className="py-2 px-3 font-medium text-neutral-900">
                        {row.fullName || <span className="italic text-neutral-400">Empty</span>}
                      </td>

                      <td className="py-2 px-3 text-neutral-600 font-mono text-[11px]">
                        {row.email ? (
                          row.email
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-sans">
                            Pending (Phone Login)
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        {row.matchedTeamName ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                            {row.matchedTeamName}
                          </span>
                        ) : row.teamNameOrId ? (
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {row.teamNameOrId}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        {row.matchedBusName ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                            {row.matchedBusName}
                          </span>
                        ) : row.busNameOrId ? (
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {row.busNameOrId}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">None</span>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        {!row.isValid ? (
                          <Badge variant="danger" size="sm" className="text-[10px]">
                            {row.error || 'Invalid'}
                          </Badge>
                        ) : row.statusText === 'Update Email' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            Update Email
                          </span>
                        ) : row.isExisting ? (
                          <Badge variant="neutral" size="sm" className="text-[10px]">
                            Update
                          </Badge>
                        ) : row.isProvisionalEmail ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Pending Email
                          </span>
                        ) : (
                          <Badge variant="success" size="sm" className="text-[10px]">
                            Ready
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isImporting}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmImport}
            disabled={isImporting || selectedRows.length === 0}
            className="gap-1.5 text-xs bg-neutral-900 hover:bg-black text-white shadow-xs cursor-pointer"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing & Syncing to Firebase...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Import {selectedRows.length} Students</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
