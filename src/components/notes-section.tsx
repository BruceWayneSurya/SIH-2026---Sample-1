"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowBigUp,
  BadgeCheck,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { normalizeGoogleDriveUrl } from "@/lib/google-drive";
import {
  MAX_DRIVE_URL_LENGTH,
  MAX_NOTE_CONTENT_LENGTH,
  MAX_NOTE_TITLE_LENGTH,
} from "@/lib/note-upload";
import type { RankedNote } from "@/lib/queries";
import { GoogleDrivePreview } from "./google-drive-preview";

type Props = {
  chapterId: number;
  initial: RankedNote[];
  isFaculty: boolean;
  allowLocalUploads?: boolean;
};

export function NotesSection({ chapterId, initial, isFaculty, allowLocalUploads = true }: Props) {
  const router = useRouter();
  const [notesState, setNotesState] = useState({ initial, items: initial });
  const [voting, setVoting] = useState<number | null>(null);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [voteStatus, setVoteStatus] = useState("");
  const [actionError, setActionError] = useState<{ noteId: number; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [draftPreview, setDraftPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voteInFlight = useRef(false);
  const verifyInFlight = useRef(false);
  const uploadInFlight = useRef(false);

  // router.refresh() supplies new server data without remounting this component.
  // Reset local mutations when that snapshot changes, so newly published notes
  // and persisted vote counts are not hidden behind the original useState value.
  if (notesState.initial !== initial) {
    setNotesState({ initial, items: initial });
  }

  const updateItems = (update: (items: RankedNote[]) => RankedNote[]) => {
    setNotesState((prev) => ({ ...prev, items: update(prev.items) }));
  };

  const vote = async (note: RankedNote) => {
    if (voteInFlight.current) return;
    voteInFlight.current = true;
    setVoting(note.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/notes/${note.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voted: !note.iVoted }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Could not save your vote. Please try again.");
      }
      updateItems((prev) =>
        prev.map((n) =>
          n.id === note.id
            ? {
                ...n,
                upvotes: data.upvotes,
                iVoted: data.voted,
                rankScore: data.upvotes * 0.7 + (n.facultyVerified ? 30 : 0),
              }
            : n,
        ),
      );
      setVoteStatus(
        `${data.voted ? "Upvote added to" : "Upvote removed from"} ${note.title}. ${data.upvotes} helpful votes.`,
      );
      if (data.reward) {
        setNotice("Your upvote pushed this note to 10+ — the author earned +50 XP!");
        router.refresh();
      }
    } catch (error) {
      setActionError({
        noteId: note.id,
        message: error instanceof Error ? error.message : "Could not record your vote. Please try again.",
      });
    } finally {
      voteInFlight.current = false;
      setVoting(null);
    }
  };

  const verify = async (id: number, verified: boolean) => {
    if (verifyInFlight.current) return;
    verifyInFlight.current = true;
    setVerifying(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/notes/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Could not verify this note. Please try again.");
      updateItems((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                facultyVerified: data.facultyVerified,
                verifiedByName: data.facultyVerified ? "You (Faculty)" : null,
                rankScore: n.upvotes * 0.7 + (data.facultyVerified ? 30 : 0),
              }
            : n,
        ),
      );
    } catch (error) {
      setActionError({
        noteId: id,
        message: error instanceof Error ? error.message : "Could not verify this note. Please try again.",
      });
    } finally {
      verifyInFlight.current = false;
      setVerifying(null);
    }
  };

  const submitUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (uploadInFlight.current) return;
    const fd = new FormData(e.currentTarget);
    fd.set("chapterId", String(chapterId));
    uploadInFlight.current = true;
    setUploading(true);
    setUploadErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/notes", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Could not publish your note. Please try again.");
      setShowForm(false);
      setDriveUrl("");
      setDraftPreview(null);
      setFileName(null);
      setNotice("Your note has been published.");
      router.refresh();
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Could not publish your note. Please try again.");
    } finally {
      uploadInFlight.current = false;
      setUploading(false);
    }
  };

  const draftDriveLink = normalizeGoogleDriveUrl(driveUrl);
  const sorted = [...notesState.items].sort((a, b) => b.rankScore - a.rankScore || a.id - b.id);

  return (
    <div>
      <p role="status" className="sr-only">{voteStatus}</p>
      {notice && (
        <div role="status" className="mb-3 flex items-center gap-2 rounded-md border border-leaf-100 bg-leaf-50 p-3 text-sm font-bold text-leaf-700">
          <Sparkles className="h-4 w-4 shrink-0" />
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="ml-auto p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] font-semibold text-slate-500">
          Ranked by <code className="rounded bg-navy-50 px-1.5 py-0.5 font-mono text-[12px] text-navy-700">upvotes × 0.7 + faculty_verified × 30</code>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setUploadErr(null);
            setDriveUrl("");
            setDraftPreview(null);
            setFileName(null);
          }}
          disabled={uploading}
          aria-expanded={showForm}
          aria-controls={`note-upload-${chapterId}`}
          className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-navy-700 disabled:opacity-60"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Close" : "Contribute notes"}
        </button>
      </div>

      {showForm && (
        <form id={`note-upload-${chapterId}`} onSubmit={submitUpload} className="mb-5 space-y-3 rounded-lg border border-navy-200 bg-navy-50/50 p-4">
          <div>
            <h3 className="text-[15px] font-bold text-navy-900">Upload notes for this chapter</h3>
            <p className="text-[13px] text-slate-600">Share text notes, a PDF from Google Drive, or both in one note.</p>
          </div>
          <fieldset disabled={uploading} className="space-y-4 disabled:opacity-70">
            <div>
              <label htmlFor={`note-title-${chapterId}`} className="mb-1 block text-sm font-bold text-navy-800">Note title</label>
              <input
                id={`note-title-${chapterId}`}
                name="title"
                required
                minLength={4}
                maxLength={MAX_NOTE_TITLE_LENGTH}
                placeholder="e.g. One-page revision notes"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-[15px]"
              />
            </div>
            <div>
              <label htmlFor={`note-content-${chapterId}`} className="mb-1 block text-sm font-bold text-navy-800">
                Text notes <span className="font-normal text-slate-500">(optional with a document)</span>
              </label>
              <textarea
                id={`note-content-${chapterId}`}
                name="content"
                rows={5}
                maxLength={MAX_NOTE_CONTENT_LENGTH}
                placeholder="Write or paste your notes here. You can also add a PDF version below."
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-[15px]"
              />
            </div>
            <div className="rounded-md border border-navy-200 bg-white p-3">
              <label htmlFor={`note-drive-${chapterId}`} className="mb-1 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                <Link2 className="h-4 w-4" /> PDF document · Google Drive
              </label>
              <input
                id={`note-drive-${chapterId}`}
                type="url"
                name="driveUrl"
                value={driveUrl}
                onChange={(e) => {
                  setDriveUrl(e.target.value);
                  setDraftPreview(null);
                }}
                disabled={fileName !== null}
                maxLength={MAX_DRIVE_URL_LENGTH}
                placeholder="https://drive.google.com/file/d/…/view"
                aria-describedby={`note-drive-help-${chapterId}`}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-[14px] disabled:bg-slate-100"
              />
              <p id={`note-drive-help-${chapterId}`} className="mt-2 text-[12px] leading-relaxed text-slate-500">
                Upload your PDF to Google Drive, set General access to <b>Anyone with the link · Viewer</b>,
                then paste its file-sharing link here. Use a PDF file, not a folder or Google Doc.
                Only the link is saved; the document stays in your Drive and is previewed here. Optional for text-only notes.
              </p>
              {fileName && <p className="mt-1 text-[12px] text-slate-500">Remove the local attachment below to use a Drive link instead.</p>}
              <button
                type="button"
                disabled={!draftDriveLink || fileName !== null}
                onClick={() => setDraftPreview(draftDriveLink)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-navy-200 bg-navy-50 px-3 py-1.5 text-sm font-bold text-navy-700 hover:border-navy-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" /> Preview PDF before publishing
              </button>
              {draftPreview && (
                <div className="mt-3">
                  <GoogleDrivePreview key={draftPreview} url={draftPreview} title="Document draft" />
                </div>
              )}
            </div>
            {allowLocalUploads ? <details className="text-sm text-slate-600">
              <summary className="cursor-pointer font-semibold text-navy-700">Or attach a local PDF / image</summary>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className={`inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-navy-700 ${driveUrl.trim() ? "opacity-50" : "cursor-pointer hover:border-navy-300"}`}>
                  <Upload className="h-4 w-4" />
                  Attach PDF / image (max 8 MB)
                  <input
                    ref={fileRef}
                    type="file"
                    name="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    disabled={!!driveUrl.trim()}
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                    className="sr-only"
                  />
                </label>
                {fileName && (
                  <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-semibold text-slate-600">
                    <span className="break-all">{fileName}</span>
                    <button
                      type="button"
                      aria-label="Remove local attachment"
                      onClick={() => {
                        if (fileRef.current) fileRef.current.value = "";
                        setFileName(null);
                      }}
                      className="shrink-0 rounded p-1 hover:bg-navy-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
              {driveUrl.trim() && <p className="mt-1 text-[12px]">Clear the Drive link to attach a local file instead.</p>}
            </details> : <p className="text-xs text-slate-500">Hosted uploads use Google Drive links so documents remain available across deployments. Local file attachments are only available when running the portal locally.</p>}
            {uploadErr && <p role="alert" className="text-sm font-bold text-rose-600">{uploadErr}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md bg-saffron-500 px-4 py-2 text-sm font-bold text-navy-950 transition hover:bg-saffron-400 disabled:opacity-60"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? "Publishing…" : "Publish note"}
              </button>
            </div>
          </fieldset>
          <p className="text-[12px] text-slate-500">
            Notes reach the top when classmates mark them helpful (Δ) and faculty verify them. 10+
            upvotes earn the author <b>+50 XP</b>.
          </p>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-navy-200 bg-navy-50/50 p-6 text-center text-sm text-slate-600">
          No notes yet for this chapter. Be the first contributor!
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((n, i) => {
            const driveLink = n.fileUrl ? normalizeGoogleDriveUrl(n.fileUrl) : null;
            const format = n.fileUrl
              ? `${n.content ? "Text + " : ""}${n.fileType === "image" ? "Image" : "PDF"}`
              : "Text";
            return (
              <li
                key={n.id}
                className={`vsv-enter rounded-lg border bg-white p-4 shadow-sm ${
                  n.facultyVerified ? "border-leaf-500/60" : "border-line"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <button
                    type="button"
                    onClick={() => vote(n)}
                    disabled={voting !== null}
                    aria-busy={voting === n.id}
                    aria-pressed={n.iVoted}
                    aria-label={n.iVoted ? "Remove helpful vote" : "Mark as helpful"}
                    title={n.iVoted ? "Your upvote is saved. Click to remove it." : "Upvote this helpful note"}
                    className={`flex w-16 shrink-0 flex-col items-center rounded-md border py-2 transition disabled:cursor-wait disabled:opacity-60 ${
                      n.iVoted
                        ? "border-saffron-500 bg-saffron-500 text-navy-950"
                        : "border-line bg-white text-navy-600 hover:border-saffron-400 hover:text-saffron-600"
                    }`}
                  >
                    {voting === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowBigUp className="h-4 w-4" />}
                    <span className="text-lg font-extrabold leading-none">{n.upvotes}</span>
                    <span className="text-[10px] font-bold uppercase">{n.iVoted ? "voted" : "helpful"}</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {i === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-saffron-500 px-1.5 py-0.5 text-[11px] font-extrabold uppercase text-navy-950">
                          <Sparkles className="h-3 w-3" /> Recommended
                        </span>
                      )}
                      <h4 className="text-[16px] font-bold text-navy-900">{n.title}</h4>
                      {n.facultyVerified && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-leaf-500/40 bg-leaf-50 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-leaf-700"
                          title={`Verified by ${n.verifiedByName ?? "faculty"}`}
                        >
                          <BadgeCheck className="h-3.5 w-3.5" /> Faculty Verified
                        </span>
                      )}
                      <span className="ml-auto text-[12px] font-semibold text-slate-400">
                        rank score {n.rankScore.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                      by {n.authorName}
                      {n.authorIsFaculty && (
                        <span className="ml-1.5 rounded-sm bg-navy-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                          Faculty
                        </span>
                      )}
                      <span className="ml-1.5 rounded-sm border border-line bg-paper px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy-600">{format}</span>
                    </p>

                    {n.content && (
                      <pre className="note-scroll mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-paper p-3 font-sans text-[14px] leading-relaxed text-slate-700">
                        {n.content}
                      </pre>
                    )}
                    {n.fileUrl && !driveLink && (
                      <a
                        href={n.fileUrl}
                        download={n.fileName ?? undefined}
                        className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-navy-200 bg-navy-50 px-3 py-1.5 text-sm font-bold text-navy-700 hover:border-navy-400"
                      >
                        {n.fileType === "image" ? <ImageIcon className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                        <span className="break-all">{n.fileName ?? "Download file"}</span>
                      </a>
                    )}
                  </div>

                  {isFaculty && (
                    <button
                      type="button"
                      onClick={() => verify(n.id, !n.facultyVerified)}
                      disabled={verifying !== null}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-bold transition disabled:opacity-60 ${
                        n.facultyVerified
                          ? "border-line bg-white text-slate-500 hover:border-rose-300 hover:text-rose-600"
                          : "border-leaf-500 bg-leaf-50 text-leaf-700 hover:bg-leaf-100"
                      }`}
                    >
                      {verifying === n.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      {n.facultyVerified ? "Un-verify" : "Verify note"}
                    </button>
                  )}
                </div>
                {driveLink && (
                  <div className="mt-3">
                    <GoogleDrivePreview key={driveLink} url={driveLink} title={n.title} />
                  </div>
                )}
                {actionError?.noteId === n.id && (
                  <p role="alert" className="mt-3 rounded-md bg-rose-50 p-2 text-sm font-bold text-rose-600">{actionError.message}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
