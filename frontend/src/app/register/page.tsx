"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  UserRound,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  AlertCircle,
  MapPin,
  Building2,
  BookOpen,
} from "lucide-react";
import { Wordmark } from "@/components/ui";

const STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const SUBJECTS = [
  "Mathematics",
  "Science",
  "Social Science",
  "English",
  "Hindi",
  "Arts & Vocational",
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [className, setClassName] = useState("8");
  const [state, setState] = useState("Gujarat");
  const [school, setSchool] = useState("");
  const [subjectSpecialization, setSubjectSpecialization] = useState("Science");
  const [institutionId, setInstitutionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, string> = {
      role,
      name,
      email,
      password,
    };

    if (role === "student") {
      payload.state = state;
      payload.school = school;
      payload.className = className;
    } else {
      payload.subjectSpecialization = subjectSpecialization;
      payload.institutionId = institutionId;
      payload.state = state;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Registration failed. Please check your details.");
      }

      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <div className="inline-flex justify-center">
          <Wordmark />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-navy-900 sm:text-3xl">
          Create Your Pragyan (प्रज्ञान) Account
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          NCERT-Aligned Learning &amp; Assessment Portal for Class 7 &amp; 8
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
        {/* Role toggle */}
        <div className="mb-6 flex rounded-lg border border-line bg-paper p-1">
          <button
            type="button"
            onClick={() => {
              setRole("student");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-extrabold transition ${
              role === "student"
                ? "bg-navy-800 text-white shadow-sm"
                : "text-navy-700 hover:text-navy-950"
            }`}
          >
            <UserRound className="h-4 w-4" />
            Student Account
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("faculty");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-extrabold transition ${
              role === "faculty"
                ? "bg-navy-800 text-white shadow-sm"
                : "text-navy-700 hover:text-navy-950"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Faculty / Teacher Account
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
              Full Name *
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diya Mehta"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                Email Address *
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu.in"
                  className="w-full rounded-lg border border-line bg-paper py-2.5 pl-9 pr-3 text-[15px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                Password * (min 6 chars)
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-line bg-paper py-2.5 pl-9 pr-3 text-[15px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Student Specific Fields */}
          {role === "student" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                    Target Class (NCERT) *
                  </label>
                  <div className="mt-1.5 flex gap-3">
                    {["7", "8"].map((c) => (
                      <label
                        key={c}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 p-2.5 text-sm font-extrabold transition ${
                          className === c
                            ? "border-navy-800 bg-navy-50 text-navy-950"
                            : "border-line bg-paper text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="className"
                          value={c}
                          checked={className === c}
                          onChange={(e) => setClassName(e.target.value)}
                          className="sr-only"
                        />
                        Class {c}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                    State / UT *
                  </label>
                  <div className="relative mt-1.5">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper py-2.5 pl-9 pr-3 text-[14px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                    >
                      {STATES_AND_UTS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                  School Name *
                </label>
                <div className="relative mt-1.5">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. Kendriya Vidyalaya, Sector 4"
                    className="w-full rounded-lg border border-line bg-paper py-2.5 pl-9 pr-3 text-[15px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Faculty Specific Fields */}
          {role === "faculty" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                    Subject Specialization *
                  </label>
                  <div className="relative mt-1.5">
                    <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={subjectSpecialization}
                      onChange={(e) => setSubjectSpecialization(e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper py-2.5 pl-9 pr-3 text-[14px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                    >
                      {SUBJECTS.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                    School / Institution ID *
                  </label>
                  <div className="relative mt-1.5">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={institutionId}
                      onChange={(e) => setInstitutionId(e.target.value)}
                      placeholder="e.g. SCH-GJ-204"
                      className="w-full rounded-lg border border-line bg-paper py-2.5 pl-9 pr-3 text-[15px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                  State / UT (Institution Location) *
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border border-line bg-paper py-2.5 pl-9 pr-3 text-[14px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                  >
                    {STATES_AND_UTS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 py-3.5 text-[15px] font-bold text-white shadow-sm transition hover:bg-navy-700 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Register &amp; Launch Portal
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-bold text-navy-800 underline underline-offset-2 hover:text-saffron-600"
          >
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
}
